export function Chevron({
  className,
  up = false,
}: {
  className: string | undefined;
  up?: boolean;
}) {
  return (
    <svg className={className} viewBox="0 0 10 6" aria-hidden="true">
      <path d={up ? "M1 5l4-4 4 4" : "M1 1l4 4 4-4"} />
    </svg>
  );
}
