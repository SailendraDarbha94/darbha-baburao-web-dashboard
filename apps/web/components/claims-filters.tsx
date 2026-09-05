import Link from "next/link";
import {
  CLAIM_STATUSES,
  type AdminClaimsQuery,
  type ProfileRef,
} from "@claims/shared";
import { NativeSelect } from "@/components/native-select";
import { STATUS_LABELS } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLAIMS_QUERY_DEFAULTS } from "@/lib/claims-url";

// A plain GET form: submitting rewrites the URL's search params and the page re-renders on the server
// (docs/PLAN.md decision k). Works with JavaScript disabled. Sort, order and a non-default per_page ride
// along as hidden inputs (the same fields claimsListHref keeps on links); `page` is deliberately dropped
// so a new filter starts at page 1.
export function ClaimsFilters({
  query,
  agents,
}: {
  query: AdminClaimsQuery;
  agents: ProfileRef[];
}) {
  return (
    <form
      action="/claims"
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <input type="hidden" name="sort" value={query.sort} />
      <input type="hidden" name="order" value={query.order} />
      {query.per_page === CLAIMS_QUERY_DEFAULTS.per_page ? null : (
        <input type="hidden" name="per_page" value={query.per_page} />
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-status">Status</Label>
        <NativeSelect
          id="filter-status"
          name="status"
          defaultValue={query.status ?? ""}
          className="w-40"
        >
          <option value="">All statuses</option>
          {CLAIM_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-assigned-to">Assignee</Label>
        <NativeSelect
          id="filter-assigned-to"
          name="assigned_to"
          defaultValue={query.assigned_to ?? ""}
          className="w-44"
        >
          <option value="">All assignees</option>
          <ProfileOptions agents={agents} selected={query.assigned_to} />
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-agent-id">Agent</Label>
        <NativeSelect
          id="filter-agent-id"
          name="agent_id"
          defaultValue={query.agent_id ?? ""}
          className="w-44"
        >
          <option value="">All agents</option>
          <ProfileOptions agents={agents} selected={query.agent_id} />
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-from">Created from</Label>
        <Input
          id="filter-from"
          name="from"
          type="date"
          defaultValue={query.from ?? ""}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-to">Created to</Label>
        <Input
          id="filter-to"
          name="to"
          type="date"
          defaultValue={query.to ?? ""}
          className="w-40"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit">Apply</Button>
        <Link href="/claims" className="text-sm hover:underline">
          Clear
        </Link>
      </div>
    </form>
  );
}

// The lists hold role = agent profiles (docs/PLAN.md decision q), but assigned_to may be any profile and
// an admin who signed in on mobile can own claims, so a filter value outside the list gets its own
// option. Otherwise the browser would show "All" for an active filter and Apply would silently clear it.
function ProfileOptions({
  agents,
  selected,
}: {
  agents: ProfileRef[];
  selected: string | undefined;
}) {
  const known = agents.some((agent) => agent.id === selected);
  return (
    <>
      {agents.map((agent) => (
        <option key={agent.id} value={agent.id}>
          {agent.full_name || agent.id}
        </option>
      ))}
      {selected && !known ? (
        <option value={selected}>
          Other profile ({selected.slice(0, 8)}…)
        </option>
      ) : null}
    </>
  );
}
