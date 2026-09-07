import { Card, CardContent } from "@/components/ui/card";

export type StatTile = {
  label: string;
  value: number;
  /** One short line under the number saying what it counts. */
  hint: string;
};

// The headline numbers. Plain cards, no chart library: a single number is not a visualisation problem.
export function StatTiles({ tiles }: { tiles: readonly StatTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label} className="min-w-0">
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {tile.label}
            </span>
            <span className="text-3xl leading-none font-semibold tabular-nums">
              {tile.value}
            </span>
            <span className="text-xs text-muted-foreground">{tile.hint}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
