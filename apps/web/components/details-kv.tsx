// claims.details (jsonb, permissive record) as key/value rows. Values are rendered as text only: a
// primitive as its string form, anything nested as pretty-printed JSON. Nothing is ever interpreted as
// HTML, so agent-supplied content cannot inject markup.
export function DetailsKv({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No additional details.</p>
    );
  }

  return (
    <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="font-medium break-all text-muted-foreground">{key}</dt>
          <dd className="min-w-0">{renderValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">null</span>;
  }
  if (typeof value === "object") {
    return (
      <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span className="break-words">{String(value)}</span>;
}
