# Where you craft, buy and sell

The bar above the filters sets where every craft is priced. In the code, this choice is the route (`RouteChoice` in `apps/web/src/route.types.ts`).

- **Crafting location**: a royal city, Caerleon, Brecilien, a [Rest](glossary.md#rest), the island, or **Hideout**. Hideout adds its [biome](glossary.md#biome), [map quality](glossary.md#hideout-map-quality) and [power level](glossary.md#power-level). It starts on the biome that shares the city's specialties, at Q6 and level 9, and switching to a city and back brings the same hideout back.
- **Buy materials in**: a royal city, Caerleon or Brecilien.
- **Sell in**: the same cities, a Rest, or the [Black Market](glossary.md#black-market).

Under them is the place's [return rate](glossary.md#return-rate-rrr), without and with [focus](glossary.md#focus), for ordinary crafts and for its [specialties](glossary.md#specialty-bonus). If a city's specialties get different bonuses, it shows the largest. The island has no specialties.

## In the link, and saved

Like the [filters](filters.md#in-the-link-and-saved), the route is in the page's link and saved in the browser, it's saved only when you change it, and a link wins over the saved route. The link always carries the whole route:

| Parameter | Part                                                                   | Example                 |
| --------- | ---------------------------------------------------------------------- | ----------------------- |
| `place`   | The crafting location's ID from the game files, `island`, or `hideout` | `place=1000` (Lymhurst) |
| `biome`   | A hideout's biome                                                      | `biome=FOREST`          |
| `quality` | A hideout's map quality, 1 to 6                                        | `quality=6`             |
| `level`   | A hideout's power level, 1 to 9                                        | `level=9`               |
| `buy`     | The market to buy materials in, by its AODP ID                         | `buy=Martlock`          |
| `sell`    | The market to sell in, by its AODP ID                                  | `sell=Black+Market`     |

A part the app doesn't know falls back to the default, Lymhurst, one part at a time: a hideout link with an unknown biome crafts in Lymhurst but keeps its markets.
