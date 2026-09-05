import {
  STORAGE_BUCKET,
  type ClaimFile,
  type FileWithUrl,
  type SignedUpload,
} from "@claims/shared";
import type { Db } from "@/lib/db";

// Signed download URLs live 10 minutes (docs/PLAN.md §1): long enough to open a gallery, short enough that a
// leaked URL is nearly useless.
const DOWNLOAD_URL_TTL_SECONDS = 600;

// storage-api fixes signed UPLOAD URLs at 2 hours and storage-js exposes no parameter for it
// (createSignedUploadUrl's doc comment: "They are valid for 2 hours."). The plan's 2 h is therefore the actual
// value; `expires_at` below is computed from the issue time and is accurate to within request latency.
const UPLOAD_URL_TTL_SECONDS = 2 * 60 * 60;

/**
 * Attaches a short-lived signed download URL to each file row. Authorised by the storage SELECT policies
 * (the caller must be able to see the claim_files row). A path whose object never landed — the mobile app
 * reserved the row but the PUT failed — gets `url: null`; callers render that as "upload incomplete".
 */
export async function signFileUrls(
  db: Db,
  files: ClaimFile[],
): Promise<FileWithUrl[]> {
  if (files.length === 0) return [];

  const { data, error } = await db.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(
      files.map((file) => file.storage_path),
      DOWNLOAD_URL_TTL_SECONDS,
    );
  if (error) throw error;

  // storage-api answers with one entry per requested path, in request order; an entry carries either a
  // signedUrl or an error string (missing object, or an object the policies hide). Both cases mean the
  // client cannot fetch the bytes, so both become null.
  return files.map((file, index) => {
    const entry = data[index];
    const url = entry && entry.error === null ? entry.signedUrl : null;
    return { ...file, url };
  });
}

/**
 * Signed upload URL for a path that already has a claim_files row. storage-api evaluates the storage
 * INSERT policy at signing time: own claim, still draft, path registered for this uploader.
 */
export async function createUploadUrl(
  db: Db,
  path: string,
): Promise<SignedUpload["upload"]> {
  const issuedAt = Date.now();
  const { data, error } = await db.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;

  return {
    signed_url: data.signedUrl,
    token: data.token,
    path: data.path,
    expires_at: new Date(
      issuedAt + UPLOAD_URL_TTL_SECONDS * 1000,
    ).toISOString(),
  };
}

/**
 * Removes one object. Authorised by the storage DELETE policy, which needs the claim_files row to still
 * exist — so callers remove the object BEFORE deleting the row. A missing object is not an error: storage-api
 * deletes whatever matches and returns the (then empty) list of removed objects with `error: null`.
 *
 * Observed against the hosted project: a signed download URL issued before the delete keeps serving the bytes
 * from Supabase's CDN for about a minute afterwards (cache hit), then reports NoSuchKey. With the 10-minute
 * URL lifetime above that window is accepted; it is not a permission gap, only a caching one.
 */
export async function removeObject(db: Db, path: string): Promise<void> {
  const { error } = await db.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}
