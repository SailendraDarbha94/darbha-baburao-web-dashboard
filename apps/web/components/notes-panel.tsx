import type { ClaimNote, ProfileRef } from "@claims/shared";
import { badgeVariants } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Both visibilities, oldest first. The distinction matters (internal notes never reach the agent, RLS
// invariant I2), so each note carries a label AND a distinct border/background, not just a colour.
export function NotesPanel({
  notes,
  authors,
}: {
  notes: ClaimNote[];
  authors: Map<string, ProfileRef>;
}) {
  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground">No notes yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {notes.map((note) => {
        const agentVisible = note.visibility === "agent_visible";
        return (
          <li
            key={note.id}
            className={cn(
              "rounded-lg border-l-4 p-3 text-sm",
              agentVisible
                ? "border-l-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900"
                : "border-l-muted-foreground/40 bg-muted/40 ring-1 ring-foreground/10",
            )}
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  badgeVariants({ variant: "outline" }),
                  agentVisible
                    ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                    : "border-border bg-background",
                )}
              >
                {agentVisible ? "Visible to agent" : "Internal"}
              </span>
              <span className="font-medium text-foreground">
                {authors.get(note.author_id)?.full_name || "Unknown user"}
              </span>
              <span>{formatDateTime(note.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap">{note.body}</p>
          </li>
        );
      })}
    </ul>
  );
}
