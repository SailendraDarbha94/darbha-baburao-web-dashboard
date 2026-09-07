import { CLAIM_STATUSES } from "@claims/shared";
import { LoadingStatus, SkeletonTableRows } from "@/components/skeleton";
import { STATUS_LABELS } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Suspense fallback for /agents. It mirrors app/(admin)/agents/page.tsx: heading and the same table —
// name, one column per status, total, joined — with placeholder rows.
const COLUMN_COUNT = CLAIM_STATUSES.length + 3;

export default function AgentsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <LoadingStatus label="Loading agents" />
      <h1 className="text-2xl font-semibold">Agents</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {CLAIM_STATUSES.map((status) => (
              <TableHead key={status} className="text-right">
                {STATUS_LABELS[status]}
              </TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SkeletonTableRows rows={5} cols={COLUMN_COUNT} />
        </TableBody>
      </Table>
    </div>
  );
}
