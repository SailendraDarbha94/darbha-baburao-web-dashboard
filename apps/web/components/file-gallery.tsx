import type { FileWithUrl } from "@claims/shared";
import { formatBytes } from "@/lib/format";

// Attachments with their 10-minute signed download URLs (lib/storage.ts). JPEG/PNG get an inline
// thumbnail; PDF and HEIC get an open-in-new-tab tile because browsers do not decode HEIC in <img>
// (docs/PLAN.md decision f). `url: null` means the mobile app reserved the row but the bytes never arrived.
export function FileGallery({ files }: { files: FileWithUrl[] }) {
  if (files.length === 0) {
    return <p className="text-sm text-muted-foreground">No files attached.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {files.map((file) => (
        <li key={file.id}>
          <FileTile file={file} />
        </li>
      ))}
    </ul>
  );
}

function FileTile({ file }: { file: FileWithUrl }) {
  const caption = (
    <span className="flex flex-col gap-0.5 text-xs">
      <span className="truncate font-medium" title={file.file_name}>
        {file.file_name}
      </span>
      <span className="text-muted-foreground">
        {file.mime_type} · {formatBytes(file.size_bytes)}
      </span>
    </span>
  );

  if (file.url === null) {
    return (
      <div className="flex h-full flex-col gap-2 rounded-lg border border-dashed p-2">
        <div className="flex aspect-square items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
          Upload incomplete
        </div>
        {caption}
      </div>
    );
  }

  const isImage =
    file.mime_type === "image/jpeg" || file.mime_type === "image/png";

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full flex-col gap-2 rounded-lg border p-2 hover:bg-muted/50"
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire in 10 minutes and live on the Supabase host; routing them through next/image's optimizer would cache stale URLs and needs remotePatterns config for no benefit.
        <img
          src={file.url}
          alt={file.file_name}
          className="aspect-square w-full rounded-md object-cover"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-md bg-muted text-sm font-medium">
          {file.mime_type === "application/pdf" ? "PDF" : "HEIC"} · open
        </div>
      )}
      {caption}
    </a>
  );
}
