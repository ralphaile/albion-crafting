import type { DataDiff, Totals } from "./diff.types.ts";

interface Commits {
  repository: string;
  before: string;
  after: string;
}

export function formatReport(
  diff: DataDiff,
  { repository, before, after }: Commits,
  limit = 50,
): string {
  const lines = [
    "## Game data changes",
    "",
    before === after
      ? `\`${repository}\` at ${before}`
      : `\`${repository}\` ${before} → ${after}`,
    "",
  ];

  const sections: [string, string[]][] = [
    ["Crafting bonuses", diff.bonuses],
    ["Removed items", diff.removedItems],
    ["Added items", diff.addedItems],
    ["Changed recipes", diff.recipes],
  ];
  const total = sections.reduce((sum, [, changes]) => sum + changes.length, 0);
  if (total === 0) {
    return [...lines, "No changes.", ""].join("\n");
  }

  const { items, recipes, bonuses } = diff.totals;
  lines.push(
    "|                  | Added | Removed | Changed |",
    "| ---------------- | ----: | ------: | ------: |",
    row("Items", items),
    row("Recipes", recipes),
    row("Crafting bonuses", bonuses),
  );

  let room = limit;
  for (const [title, changes] of sections) {
    const shown = changes.slice(0, room);
    if (shown.length > 0) {
      lines.push(
        "",
        `### ${title}`,
        "",
        ...shown.map((change) => `- ${change}`),
      );
      room -= shown.length;
    }
  }
  if (total > limit) {
    lines.push("", `…and ${count(total - limit)} more.`);
  }
  return [...lines, ""].join("\n");
}

function row(name: string, { added, removed, changed }: Partial<Totals>) {
  return `| ${name} | ${count(added)} | ${count(removed)} | ${changed === undefined ? "" : count(changed)} |`;
}

function count(n = 0): string {
  return n.toLocaleString("en-US");
}
