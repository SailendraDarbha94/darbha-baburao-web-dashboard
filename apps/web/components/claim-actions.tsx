"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  NOTE_VISIBILITIES,
  nextStatuses,
  type AdminClaimDetail,
  type ClaimNote,
  type ClaimStatus,
  type NoteVisibility,
  type ProfileRef,
} from "@claims/shared";
import { NativeSelect } from "@/components/native-select";
import { STATUS_LABELS } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiClientError } from "@/lib/api-client";

// The actions panel: change status, assign, add note. Each is its own small form that POSTs to the admin
// route handler through apiFetch (docs/PLAN.md decision a) and then router.refresh(), which re-renders
// the surrounding Server Components (header, notes, timeline) with the new data. No dates are formatted
// here (hydration), and no push is sent here: the route handlers send it (lib/push.ts).
//
// The AssignForm `key` resets its local state once the refreshed claim arrives, so the assignee select
// shows the saved value. StatusForm is not keyed: it derives its selection from the current status
// instead, so an error from a conflicting change (see useSubmit) stays on screen after the refresh.
export function ClaimActions({
  claimId,
  status,
  assignedTo,
  agents,
}: {
  claimId: string;
  status: ClaimStatus;
  assignedTo: string | null;
  agents: ProfileRef[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <StatusForm claimId={claimId} status={status} />
      <AssignForm
        key={assignedTo ?? "unassigned"}
        claimId={claimId}
        assignedTo={assignedTo}
        agents={agents}
      />
      <NoteForm claimId={claimId} />
    </div>
  );
}

// ---------- change status ----------

function StatusForm({
  claimId,
  status,
}: {
  claimId: string;
  status: ClaimStatus;
}) {
  const options = nextStatuses(status, "admin");
  const [chosen, setChosen] = useState<ClaimStatus | "">("");
  // Derived, not reset with a `key`: after a refresh the options come from the CURRENT status and a
  // choice that is no longer offered falls back to the first option.
  const next =
    chosen !== "" && options.includes(chosen) ? chosen : (options[0] ?? "");
  const [message, setMessage] = useState("");
  const submit = useSubmit();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (next === "") return;
    const confirmed = window.confirm(
      `Move this claim from "${STATUS_LABELS[status]}" to "${STATUS_LABELS[next]}"?` +
        (message.trim() ? " The message will be sent to the agent." : ""),
    );
    if (!confirmed) return;

    void submit.run(async () => {
      await apiFetch<AdminClaimDetail>(`/api/admin/claims/${claimId}/status`, {
        method: "POST",
        body: { status: next, message: message.trim() || undefined },
      });
      setMessage("");
    });
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Change status</CardTitle>
        <CardDescription>
          Currently <span className="font-medium">{STATUS_LABELS[status]}</span>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No admin transition is available from this status
            {status === "info_requested"
              ? "; the agent must edit and resubmit first."
              : "."}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status-next">New status</Label>
              <NativeSelect
                id="status-next"
                value={next}
                onChange={(e) => setChosen(e.target.value as ClaimStatus)}
                disabled={submit.busy}
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {STATUS_LABELS[option]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status-message">
                Message to agent (optional)
              </Label>
              <Textarea
                id="status-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={10000}
                disabled={submit.busy}
                placeholder="Sent to the agent as a visible note"
              />
            </div>
            <ErrorLines lines={submit.errors} />
            <div>
              <Button type="submit" disabled={submit.busy || next === ""}>
                {submit.busy ? "Saving…" : "Change status"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- assign ----------

function AssignForm({
  claimId,
  assignedTo,
  agents,
}: {
  claimId: string;
  assignedTo: string | null;
  agents: ProfileRef[];
}) {
  // "" is the <option> value for "Unassigned"; the API takes null.
  const [assignee, setAssignee] = useState(assignedTo ?? "");
  const submit = useSubmit();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit.run(async () => {
      await apiFetch<AdminClaimDetail>(`/api/admin/claims/${claimId}/assign`, {
        method: "POST",
        body: { assigned_to: assignee || null },
      });
    });
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Assign</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-to">Assignee</Label>
            <NativeSelect
              id="assign-to"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              disabled={submit.busy}
            >
              <option value="">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name || agent.id}
                </option>
              ))}
            </NativeSelect>
          </div>
          <ErrorLines lines={submit.errors} />
          <div>
            <Button
              type="submit"
              variant="outline"
              disabled={submit.busy || assignee === (assignedTo ?? "")}
            >
              {submit.busy ? "Saving…" : "Save assignee"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------- add note ----------

function NoteForm({ claimId }: { claimId: string }) {
  const [body, setBody] = useState("");
  // Internal by default: the safe choice, matching the DB column default.
  const [visibility, setVisibility] = useState<NoteVisibility>("internal");
  const submit = useSubmit();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit.run(async () => {
      await apiFetch<ClaimNote>(`/api/admin/claims/${claimId}/notes`, {
        method: "POST",
        body: { body: body.trim(), visibility },
      });
      setBody("");
      setVisibility("internal");
    });
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Add note</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-body">Note</Label>
            <Textarea
              id="note-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={10000}
              required
              disabled={submit.busy}
            />
          </div>
          <fieldset className="flex flex-col gap-1.5" disabled={submit.busy}>
            <legend className="text-sm font-medium">Visibility</legend>
            {NOTE_VISIBILITIES.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="visibility"
                  value={option}
                  checked={visibility === option}
                  onChange={() => setVisibility(option)}
                />
                {option === "internal"
                  ? "Internal (admins only)"
                  : "Visible to agent"}
              </label>
            ))}
          </fieldset>
          <ErrorLines lines={submit.errors} />
          <div>
            <Button
              type="submit"
              variant="outline"
              disabled={submit.busy || body.trim() === ""}
            >
              {submit.busy ? "Saving…" : "Add note"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------- shared ----------

/**
 * Pending/error state for one form. `busy` stays true through router.refresh() (a transition) so the
 * form cannot be resubmitted before the refreshed Server Components have replaced the stale ones.
 */
function useSubmit() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  async function run(action: () => Promise<void>) {
    setPending(true);
    setErrors([]);
    try {
      await action();
      startTransition(() => router.refresh());
    } catch (error) {
      setErrors(describeError(error));
      // A conflict means the claim changed under us (another admin moved it): re-render the Server
      // Components from the current row so the forms offer valid choices, with the error text still shown.
      if (
        error instanceof ApiClientError &&
        (error.code === "INVALID_TRANSITION" || error.code === "NOT_FOUND")
      ) {
        startTransition(() => router.refresh());
      }
    } finally {
      setPending(false);
    }
  }

  return { run, errors, busy: pending || refreshing };
}

function ErrorLines({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <ul role="alert" className="flex flex-col gap-0.5 text-sm text-destructive">
      {lines.map((line, index) => (
        <li key={index}>{line}</li>
      ))}
    </ul>
  );
}

/** The API message, plus one line per field issue when the server returned VALIDATION_ERROR details. */
function describeError(error: unknown): string[] {
  if (error instanceof ApiClientError) {
    return [error.message, ...validationLines(error.details)];
  }
  if (error instanceof Error) return [error.message];
  return ["Something went wrong. Please try again."];
}

// details is z.flattenError() output: { formErrors: string[], fieldErrors: Record<string, string[]> }.
// Read with runtime checks; it is `unknown` on the wire.
function validationLines(details: unknown): string[] {
  if (typeof details !== "object" || details === null) return [];
  const lines: string[] = [];
  const { formErrors, fieldErrors } = details as Record<string, unknown>;
  if (Array.isArray(formErrors)) {
    for (const item of formErrors)
      if (typeof item === "string") lines.push(item);
  }
  if (typeof fieldErrors === "object" && fieldErrors !== null) {
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (!Array.isArray(messages)) continue;
      for (const item of messages) {
        if (typeof item === "string") lines.push(`${field}: ${item}`);
      }
    }
  }
  return lines;
}
