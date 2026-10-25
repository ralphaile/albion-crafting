# Architecture decisions

An architecture decision record (ADR) is a short note about one design decision: the problem, what was chosen, and what it costs. It keeps the reasons around after the code has moved on.

| ADR                                     | Decision                                                    | Status   |
| --------------------------------------- | ----------------------------------------------------------- | -------- |
| [001](001-monorepo-with-a-pure-core.md) | A monorepo with a pure calculation core                     | Accepted |
| [002](002-local-first-storage.md)       | Everything the app saves stays in the browser, in IndexedDB | Accepted |

## Adding one

1. Copy the layout of an existing ADR into `NNN-short-title.md`, using the next number.
2. Start with **Status: Proposed**, and change it to **Accepted** once the decision is final.
3. Add a row to the table above.

An accepted ADR isn't rewritten when the decision changes. Write a new ADR instead, and set the old one's status to **Superseded by ADR-NNN**, linking to the new one.
