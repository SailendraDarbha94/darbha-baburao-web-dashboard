import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  type AllowedMimeType,
  type ClaimStatus,
  type FileWithUrl,
  type SignedUpload,
} from "@claims/shared";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { errorMessage } from "../lib/api";
import { deleteFile, reserveUpload } from "../lib/claims";
import { fileSizeOf, uploadToSignedUrl } from "../lib/upload";

// Attachments for a claim. While the claim is a draft the agent can add files (photo library, camera,
// PDF) and remove them; in every other status the list is read-only (docs/PLAN.md decision p).
//
// Upload flow per picked file (brief "File upload flow"): validate type and size locally → POST
// /api/claims/:id/files (reservation + signed URL) → PUT the bytes with progress → reload the claim so
// the server's file list (with signed download URLs) is the source of truth. A failed upload stays on
// screen as a pending item with Retry / Remove; Retry re-uses the signed URL until it is about to
// expire, then reserves a new one (the abandoned reservation is pruned by the submit route).

type PendingUpload = {
  key: string;
  uri: string;
  fileName: string;
  mimeType: AllowedMimeType;
  sizeBytes: number;
  state: "reserving" | "uploading" | "failed";
  /** 0..1 while uploading. */
  progress: number;
  error: string | null;
  /** The reservation, kept so a retry can re-use the same URL. */
  upload: (SignedUpload["upload"] & { fileId: string }) | null;
};

/** Files picked on this screen that are not (yet) in the server's list. */
export type PendingCounts = {
  /** Reserving or uploading right now. */
  uploading: number;
  /** Failed and waiting for Retry / Remove. */
  failed: number;
};

export type AttachmentsProps = {
  claimId: string;
  status: ClaimStatus;
  files: FileWithUrl[];
  /** Reloads the claim; called after every successful add or remove. */
  onChanged: () => Promise<void>;
  /**
   * Called whenever the pending counts change. The detail screen uses it to hold Submit while an upload
   * is in flight: the submit route prunes every reservation whose bytes have not landed, so submitting
   * mid-upload would silently drop the file.
   */
  onPendingChange?: (counts: PendingCounts) => void;
};

// A signed upload URL is valid for two hours; treat it as spent a minute early so a retry does not start
// a large upload that the server will reject halfway through.
const URL_EXPIRY_MARGIN_MS = 60 * 1000;

export function Attachments({
  claimId,
  status,
  files,
  onChanged,
  onPendingChange,
}: AttachmentsProps) {
  const canEdit = status === "draft";
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [picking, setPicking] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // Counts rather than the list as dependencies: progress ticks change `pending` many times a second, and
  // the parent only needs to know when a file starts, finishes or fails.
  const failedCount = pending.filter((item) => item.state === "failed").length;
  const uploadingCount = pending.length - failedCount;
  useEffect(() => {
    onPendingChange?.({ uploading: uploadingCount, failed: failedCount });
  }, [onPendingChange, uploadingCount, failedCount]);

  function patchPending(key: string, patch: Partial<PendingUpload>) {
    setPending((list) =>
      list.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  function dropPending(key: string) {
    setPending((list) => list.filter((item) => item.key !== key));
  }

  type PickedAsset = {
    uri: string;
    fileName: string | null | undefined;
    mimeType: string | null | undefined;
    sizeBytes: number | null | undefined;
  };

  /**
   * Validates each picked asset locally, shows it as a pending row, and starts its upload. The uploads
   * are deliberately not awaited: every row appears as soon as the picker returns and the picker buttons
   * are released, instead of one file at a time behind a 25 MB PDF.
   */
  async function addAssets(assets: PickedAsset[]) {
    for (const asset of assets) {
      const item = await prepareAsset(asset);
      if (item) {
        setPending((list) => [...list, item]);
        void runUpload(item);
      }
    }
  }

  /** Local checks (type, readable, size); null when the file is rejected (the agent has been told). */
  async function prepareAsset(
    asset: PickedAsset,
  ): Promise<PendingUpload | null> {
    const fileName = asset.fileName?.trim() || fileNameFromUri(asset.uri);
    const mimeType = asset.mimeType ?? mimeTypeFromName(fileName);
    if (!isAllowedMimeType(mimeType)) {
      Alert.alert(
        "File type not allowed",
        `${fileName} is ${mimeType ?? "of an unknown type"}. Allowed: JPEG, PNG, HEIC and PDF.`,
      );
      return null;
    }

    const sizeBytes = asset.sizeBytes ?? (await fileSizeOf(asset.uri));
    if (sizeBytes === null || sizeBytes <= 0) {
      Alert.alert("Cannot read file", `${fileName} could not be read.`);
      return null;
    }
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      Alert.alert(
        "File too large",
        `${fileName} is ${formatBytes(sizeBytes)}; the limit is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
      );
      return null;
    }

    return {
      key: newPendingKey(),
      uri: asset.uri,
      fileName,
      mimeType,
      sizeBytes,
      state: "reserving",
      progress: 0,
      error: null,
      upload: null,
    };
  }

  async function runUpload(start: PendingUpload) {
    const { key } = start;
    try {
      let upload = start.upload;
      if (!upload || isExpired(upload.expires_at)) {
        patchPending(key, { state: "reserving", error: null, progress: 0 });
        const reserved = await reserveUpload(claimId, {
          file_name: start.fileName,
          mime_type: start.mimeType,
          size_bytes: start.sizeBytes,
        });
        upload = { ...reserved.upload, fileId: reserved.file.id };
        patchPending(key, { upload });
      }

      patchPending(key, { state: "uploading", error: null, progress: 0 });
      await uploadToSignedUrl(
        upload.signed_url,
        start.uri,
        start.mimeType,
        (sent, total) => {
          patchPending(key, { progress: total > 0 ? sent / total : 0 });
        },
      );

      dropPending(key);
      await onChanged();
    } catch (error) {
      patchPending(key, { state: "failed", error: errorMessage(error) });
    }
  }

  function retryPending(key: string) {
    // Event handlers are re-created on every render, so `pending` here is the latest list.
    const item = pending.find((p) => p.key === key);
    if (item) {
      void runUpload(item);
    }
  }

  async function removePending(key: string) {
    const item = pending.find((p) => p.key === key);
    if (!item) {
      return;
    }
    dropPending(key);
    // Best effort: the reservation row would otherwise linger until submit prunes it. A failure here is
    // not worth alarming the agent about.
    if (item.upload) {
      try {
        await deleteFile(claimId, item.upload.fileId);
      } catch {
        // ignored, see above
      }
    }
  }

  function confirmRemoveFile(file: FileWithUrl) {
    Alert.alert("Remove file?", file.file_name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => void removeFile(file),
      },
    ]);
  }

  async function removeFile(file: FileWithUrl) {
    setRemoving(file.id);
    try {
      await deleteFile(claimId, file.id);
      await onChanged();
    } catch (error) {
      Alert.alert("Could not remove file", errorMessage(error));
    } finally {
      setRemoving(null);
    }
  }

  async function pickFromLibrary() {
    // No permission prompt needed: iOS PHPicker and the Android photo picker run out of process.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (result.canceled) {
      return;
    }
    // iOS hands over a JPEG for HEIC library photos unless the app asks for the original, so the
    // picker's mimeType (not the extension) is what the server receives.
    await addAssets(
      result.assets.map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes: asset.fileSize,
      })),
    );
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Camera access needed",
        permission.canAskAgain
          ? "Allow camera access to take a photo."
          : "Camera access is turned off. Enable it in Settings for Claims Agent.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (result.canceled) {
      return;
    }
    await addAssets(
      result.assets.map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes: asset.fileSize,
      })),
    );
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true, // gives a file:// URI the upload task can read on both platforms
      multiple: false,
    });
    if (result.canceled) {
      return;
    }
    await addAssets(
      result.assets.map((asset) => ({
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType,
        sizeBytes: asset.size,
      })),
    );
  }

  async function withPicker(action: () => Promise<void>) {
    setPicking(true);
    try {
      await action();
    } catch (error) {
      Alert.alert("Could not pick a file", errorMessage(error));
    } finally {
      setPicking(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Attachments</Text>

      {canEdit ? (
        <View style={styles.pickers}>
          <PickerButton
            title="Photo library"
            disabled={picking}
            onPress={() => void withPicker(pickFromLibrary)}
          />
          <PickerButton
            title="Take photo"
            disabled={picking}
            onPress={() => void withPicker(takePhoto)}
          />
          <PickerButton
            title="PDF"
            disabled={picking}
            onPress={() => void withPicker(pickPdf)}
          />
        </View>
      ) : null}

      {files.length === 0 && pending.length === 0 ? (
        <Text style={styles.empty}>
          {canEdit ? "No files yet." : "No files."}
        </Text>
      ) : null}

      {files.map((file) => (
        <View key={file.id} style={styles.row}>
          <View style={styles.rowBody}>
            <Text style={styles.fileName} numberOfLines={1}>
              {file.file_name}
            </Text>
            <Text style={styles.meta}>
              {formatBytes(file.size_bytes)}
              {file.url === null ? " · upload incomplete" : ""}
            </Text>
          </View>
          {file.url !== null ? (
            <LinkButton
              title="Open"
              onPress={() => void openUrl(file.url ?? "")}
            />
          ) : null}
          {canEdit ? (
            removing === file.id ? (
              <ActivityIndicator />
            ) : (
              <LinkButton
                title="Remove"
                destructive
                onPress={() => confirmRemoveFile(file)}
              />
            )
          ) : null}
        </View>
      ))}

      {pending.map((item) => (
        <View key={item.key} style={styles.row}>
          <View style={styles.rowBody}>
            <Text style={styles.fileName} numberOfLines={1}>
              {item.fileName}
            </Text>
            {item.state === "failed" ? (
              <Text style={styles.failed}>Failed — {item.error}</Text>
            ) : (
              <>
                <Text style={styles.meta}>
                  {item.state === "reserving"
                    ? "Preparing…"
                    : `Uploading ${Math.round(item.progress * 100)}%`}
                </Text>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.bar,
                      { width: `${Math.round(item.progress * 100)}%` },
                    ]}
                  />
                </View>
              </>
            )}
          </View>
          {item.state === "failed" ? (
            <>
              <LinkButton
                title="Retry"
                onPress={() => retryPending(item.key)}
              />
              <LinkButton
                title="Remove"
                destructive
                onPress={() => void removePending(item.key)}
              />
            </>
          ) : (
            <ActivityIndicator />
          )}
        </View>
      ))}
    </View>
  );
}

function PickerButton({
  title,
  disabled,
  onPress,
}: {
  title: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.picker,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={styles.pickerText}>{title}</Text>
    </Pressable>
  );
}

function LinkButton({
  title,
  destructive,
  onPress,
}: {
  title: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={[styles.linkText, destructive && styles.destructiveText]}>
        {title}
      </Text>
    </Pressable>
  );
}

async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert("Could not open file", errorMessage(error));
  }
}

function isAllowedMimeType(value: string | null): value is AllowedMimeType {
  return (
    value !== null && (ALLOWED_MIME_TYPES as readonly string[]).includes(value)
  );
}

function fileNameFromUri(uri: string): string {
  const last = uri.split("?")[0]?.split("/").pop();
  return last ? decodeURIComponent(last) : "file";
}

/** Fallback when a picker reports no MIME type; only the allowed extensions are recognised. */
function mimeTypeFromName(fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "heic":
      return "image/heic";
    case "pdf":
      return "application/pdf";
    default:
      return null;
  }
}

// Module-level so the React Compiler lint does not see an impure call inside the component.
let pendingCounter = 0;
function newPendingKey(): string {
  pendingCounter += 1;
  return `pending-${pendingCounter}`;
}

function isExpired(expiresAt: string): boolean {
  const at = Date.parse(expiresAt);
  // An unparseable timestamp is treated as expired so the retry reserves a fresh URL.
  return Number.isNaN(at) || at - URL_EXPIRY_MARGIN_MS <= Date.now();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  heading: { fontSize: 16, fontWeight: "600" },
  pickers: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  picker: {
    borderWidth: 1,
    borderColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pickerText: { color: "#1d4ed8", fontWeight: "600" },
  pressed: { opacity: 0.6 },
  empty: { color: "#6b7280" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d1d5db",
  },
  rowBody: { flex: 1, gap: 4 },
  fileName: { fontSize: 15 },
  meta: { fontSize: 12, color: "#6b7280" },
  failed: { fontSize: 12, color: "#b91c1c" },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  bar: { height: 4, backgroundColor: "#1d4ed8" },
  link: { paddingVertical: 4 },
  linkText: { color: "#1d4ed8", fontWeight: "600" },
  destructiveText: { color: "#b91c1c" },
});
