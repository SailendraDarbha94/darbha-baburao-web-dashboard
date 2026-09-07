import {
  isClaimStatus,
  type ClaimEvent,
  type ClaimStatus,
  type ProfileRef,
} from "@claims/shared";
import { STATUS_LABELS } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";

// claim_events, oldest first (they arrive in id order from listClaimEvents). One human-readable line per
// event, built from the trigger-written payloads in packages/supabase/migrations/20260902000002_claims.sql.
// Payload fields are read defensively: the log is append-only, so old rows outlive any payload change.
export function ClaimTimeline({
  events,
  people,
}: {
  events: ClaimEvent[];
  people: Map<string, ProfileRef>;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No events recorded.</p>;
  }

  return (
    <ol className="flex flex-col gap-3 border-l pl-4 text-sm">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-muted-foreground"
          />
          <p>{describeEvent(event, people)}</p>
          <p className="text-xs text-muted-foreground">
            {actorName(event.actor_id, people)} ·{" "}
            {formatDateTime(event.created_at)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function describeEvent(
  event: ClaimEvent,
  people: Map<string, ProfileRef>,
): string {
  const p = event.payload;
  switch (event.event_type) {
    case "created":
      return `Claim created${
        typeof p.status === "string" ? ` as ${statusName(p.status)}` : ""
      }`;
    case "status_changed":
      return `Status changed from ${statusName(p.from)} to ${statusName(p.to)}`;
    case "assigned":
      return `Assignee changed from ${assigneeName(p.from, people)} to ${assigneeName(p.to, people)}`;
    case "note_added":
      return p.visibility === "agent_visible"
        ? "Note added (visible to agent)"
        : "Internal note added";
    case "updated": {
      const columns = Array.isArray(p.columns)
        ? p.columns.filter((c): c is string => typeof c === "string")
        : [];
      return columns.length > 0
        ? `Fields updated: ${columns.join(", ")}`
        : "Fields updated";
    }
    case "file_reserved":
      return `File added: ${fileName(p.file_name)}`;
    case "file_removed":
      return `File removed: ${fileName(p.file_name)}`;
  }
}

function statusName(value: unknown): string {
  if (typeof value === "string" && isClaimStatus(value)) {
    return STATUS_LABELS[value as ClaimStatus];
  }
  return typeof value === "string" ? value : "unknown";
}

// `from`/`to` in an assigned payload are profile ids or null; names come from the same lookup as the
// note authors and event actors (the page collects every id into one profileRefsById call).
function assigneeName(value: unknown, people: Map<string, ProfileRef>): string {
  if (value === null || value === undefined) return "unassigned";
  if (typeof value !== "string") return "unknown";
  return people.get(value)?.full_name || value;
}

function fileName(value: unknown): string {
  return typeof value === "string" && value ? value : "unnamed file";
}

// actor_id is null only for writes without a JWT (SQL editor, migrations): shown as "system".
function actorName(
  actorId: string | null,
  people: Map<string, ProfileRef>,
): string {
  if (actorId === null) return "system";
  return people.get(actorId)?.full_name || "Unknown user";
}
