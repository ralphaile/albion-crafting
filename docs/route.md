# Where you craft, buy and sell

The bar above the filters sets where every craft is priced. In the code, this choice is the route (`RouteChoice` in `apps/web/src/route.types.ts`).

- **Crafting location**: a royal city, Caerleon, Brecilien, a [Rest](glossary.md#rest), the island, or **Hideout**. Hideout adds its [biome](glossary.md#biome), [map quality](glossary.md#hideout-map-quality) and [power level](glossary.md#power-level). It starts on the biome that shares the city's specialties, at Q6 and level 9, and switching to a city and back brings the same hideout back.
- **Buy materials in**: a royal city, Caerleon or Brecilien, for each kind of material. Its list sets **Everything else**, then metal bars, planks, cloth and leather on their own. Each refined material starts in the city that refines it with a bonus: bars in Thetford, planks in Fort Sterling, cloth in Lymhurst and leather in Martlock. **Refining cities** puts them back there. The button shows the market for everything else, plus how many refined materials are bought somewhere else, such as Lymhurst +3.
- **Sell in**: the same cities, a Rest, or the [Black Market](glossary.md#black-market).

Under them is the place's [return rate](glossary.md#return-rate-rrr), without and with [focus](glossary.md#focus), for ordinary crafts and for its [specialties](glossary.md#specialty-bonus). If a city's specialties get different bonuses, it shows the largest. The island has no specialties.

Any single material, such as one artifact, can also be pinned to a market, from the pin next to its price in a craft's details or in the plan's shopping list. A pin wins over the route's markets, for every route, until you take it away with **Back to the route’s market**. Pins are saved in the browser but aren't in the link.

Each material's price comes from the market it's bought in, and a craft's details show that market under each price.

## In the link, and saved

Like the [filters](filters.md#in-the-link-and-saved), the route is in the page's link and saved in the browser, it's saved only when you change it, and a link wins over the saved route. The link always carries the whole route:

| Parameter | Part                                                                   | Example                 |
| --------- | ---------------------------------------------------------------------- | ----------------------- |
| `place`   | The crafting location's ID from the game files, `island`, or `hideout` | `place=1000` (Lymhurst) |
| `biome`   | A hideout's biome                                                      | `biome=FOREST`          |
| `quality` | A hideout's map quality, 1 to 6                                        | `quality=6`             |
| `level`   | A hideout's power level, 1 to 9                                        | `level=9`               |
| `buy`     | The market to buy everything else in, by its AODP ID                   | `buy=Martlock`          |
| `bars`    | The market to buy metal bars in                                        | `bars=Thetford`         |
| `planks`  | The market to buy planks in                                            | `planks=Fort+Sterling`  |
| `cloth`   | The market to buy cloth in                                             | `cloth=Lymhurst`        |
| `leather` | The market to buy leather in                                           | `leather=Martlock`      |
| `sell`    | The market to sell in, by its AODP ID                                  | `sell=Black+Market`     |

A part the app doesn't know falls back to its default, one part at a time: Lymhurst, or a refined material's refining city. A hideout link with an unknown biome crafts in Lymhurst but keeps its markets.
