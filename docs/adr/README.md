# Architecture decisions

An architecture decision record (ADR) is a short note about one design decision: the problem, what was chosen, and what it costs. It keeps the reasons around after the code has moved on.

| ADR                                      | Decision                                                                                          | Status                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [001](001-monorepo-with-a-pure-core.md)  | A monorepo with a pure calculation core                                                           | Accepted                                    |
| [002](002-local-first-storage.md)        | Everything the app saves stays in the browser, in IndexedDB                                       | Accepted                                    |
| [003](003-price-data-strategy.md)        | Prices come from AODP, with manual prices, and a fixed order picks which one is used              | Accepted, its price order superseded by 006 |
| [004](004-core-owns-the-shared-types.md) | Core owns the types it shares with the data packages                                              | Accepted                                    |
| [005](005-css-modules.md)                | Components are styled with CSS Modules and shared theme variables                                 | Accepted                                    |
| [006](006-newer-price-wins.md)           | Between an API price and a manual one, the fresh or newer one wins, and a manual price goes stale | Accepted                                    |

## Adding one

1. Copy the layout of an existing ADR into `NNN-short-title.md`, using the next number.
2. Start with **Status: Proposed**, and change it to **Accepted** once the decision is final.
3. Add a row to the table above.

An accepted ADR isn't rewritten when the decision changes. Write a new ADR instead, and set the old one's status to **Superseded by ADR-NNN**, linking to the new one.
