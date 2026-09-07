// Uploads a local file to a Supabase Storage signed upload URL (docs/PLAN.md decision f).
//
// `expo-file-system/legacy` on purpose (decision s): in SDK 57 the package root exports the new
// File/Directory API, which has no upload-with-progress primitive; createUploadTask lives only under the
// legacy entry point (verified in node_modules/expo-file-system/package.json "exports" and
// build/legacy/FileSystem.d.ts).
import * as FileSystem from "expo-file-system/legacy";

/** The upload got an HTTP response that is not a success. `status` is the response code. */
export class UploadError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

export type UploadProgress = (sentBytes: number, totalBytes: number) => void;

const ATTEMPTS = 3;
const BACKOFF_MS = [1000, 2000] as const;

/**
 * PUTs `localUri` to `signedUrl` with `Content-Type: mimeType` (storage-api takes the object's type from
 * that header and re-checks it against the bucket allow-list). Up to three attempts on the same URL.
 *
 * A 409 ("The resource already exists") is treated as success: the path was reserved by this client
 * moments ago under a fresh file id and objects are never overwritten, so the only way an object can
 * already exist there is that an earlier PUT of ours landed but its response was lost.
 */
export async function uploadToSignedUrl(
  signedUrl: string,
  localUri: string,
  mimeType: string,
  onProgress?: UploadProgress,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(BACKOFF_MS[attempt - 1] ?? 2000);
    }

    let result: FileSystem.FileSystemUploadResult | null | undefined;
    try {
      const task = FileSystem.createUploadTask(
        signedUrl,
        localUri,
        {
          httpMethod: "PUT",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { "Content-Type": mimeType },
        },
        onProgress
          ? (data) =>
              onProgress(data.totalBytesSent, data.totalBytesExpectedToSend)
          : undefined,
      );
      result = await task.uploadAsync();
    } catch (error) {
      // No HTTP response at all (connection dropped, DNS): worth another go on the same URL.
      lastError = error;
      continue;
    }

    if (!result) {
      // uploadAsync() resolves empty only when the task was cancelled, which nothing here does.
      throw new UploadError("Upload was cancelled.", null);
    }

    if (
      (result.status >= 200 && result.status < 300) ||
      result.status === 409
    ) {
      return;
    }

    if (result.status >= 500) {
      lastError = new UploadError(
        `Upload failed (HTTP ${result.status}).`,
        result.status,
      );
      continue;
    }

    // 4xx other than 409: the URL has expired (400), the claim left draft (403), or the bucket rejected the
    // type/size (413/415). Retrying the same request cannot help; the caller decides what to do.
    throw new UploadError(
      `Upload rejected (HTTP ${result.status}).`,
      result.status,
    );
  }

  if (lastError instanceof UploadError) {
    throw lastError;
  }
  throw new UploadError(
    "Could not reach the file server. Check your connection and try again.",
    null,
  );
}

/** Size of a local file in bytes, for pickers that do not report it. */
export async function fileSizeOf(localUri: string): Promise<number | null> {
  const info = await FileSystem.getInfoAsync(localUri);
  return info.exists ? info.size : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
