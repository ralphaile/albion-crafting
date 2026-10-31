# Filters

The filters above the best-crafts table narrow it to what you can and want to craft. Every active filter shows as a chip below them: click a chip to remove that filter, or **Clear all** to remove them all.

## How they combine

Different filters combine with AND: a craft has to pass every one of them. Inside one filter, the choices add up:

- **Tier** (T4 to T8) and **Enchant** (.0 to .4): any of the chosen ones. None chosen means all.
- **Category**: a dropdown of weapon types, armor pieces and offhand types that opens over the page. Any of the chosen ones count, so **Sword**, **Plate helmet** and **Leather shoes** gives you all three. Armor is a grid of materials and slots: tick single pieces, or click a material or slot to tick its whole row or column, such as every plate piece or all shoes.
- **Artifacts**: include them, exclude them, or show only them.
- **Specialty only**: items that get the crafting location's [specialty bonus](glossary.md#specialty-bonus), or in a hideout, its biome's categories.
- **Filter by name**: the item's name or ID, in any case. It applies once you stop typing for a moment.
- **Min profit** and **Min margin %**: whole numbers. They only judge crafts with every price. Crafts with missing prices stay, so you can [finish them by hand](manual-prices.md), unless **Hide crafts with missing prices** is on. The [list of missing prices](manual-prices.md#filling-every-missing-price) keeps their prices either way.

## Fewer price requests

The tier, enchant, category, artifact, specialty and name filters don't need prices, so the app checks them first and only asks AODP for the items that pass and their materials ([ADR-003](adr/003-price-data-strategy.md)). If nothing passes, it asks for nothing. Narrowing the filters reuses the prices it already has, and widening them fetches the new items, while the table keeps the crafts it can already price. The minimums and **Hide crafts with missing prices** only need the prices already fetched, so changing them never sends a request.

## In the link, and saved

The filters are in the page's link, so you can bookmark or share it. Only filters that are on are written:

| Parameter   | Filter                                                                                                                                                  | Example                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `tier`      | Tiers                                                                                                                                                   | `tier=6,7`                             |
| `enchant`   | Enchantment levels                                                                                                                                      | `enchant=0,1`                          |
| `cat`       | Categories, as the game files name them: weapon types such as `sword`, armor pieces such as `plate_helmet`, and `booktype`, `shieldtype` or `torchtype` | `cat=sword,plate_helmet,leather_shoes` |
| `artifacts` | `exclude` or `only`                                                                                                                                     | `artifacts=exclude`                    |
| `profit`    | Minimum profit in silver                                                                                                                                | `profit=10000`                         |
| `margin`    | Minimum margin in percent                                                                                                                               | `margin=15`                            |
| `complete`  | Hide crafts with missing prices                                                                                                                         | `complete=1`                           |
| `specialty` | Specialty only                                                                                                                                          | `specialty=1`                          |
| `q`         | Name                                                                                                                                                    | `q=broadsword`                         |

The browser also saves them in IndexedDB ([ADR-002](adr/002-local-first-storage.md)), and the app opens with them next time. A link with filters wins over the saved ones, but doesn't replace them: the saved filters change only when you change one. Where IndexedDB isn't available, the filters last for the visit, and the panel says so.

A link or a saved value the app doesn't know is ignored, one filter at a time: `tier=4,9` keeps tier 4, and `profit=lots` leaves no minimum profit. A name longer than 100 characters is cut short. The saved filters carry a version number, and a version the app doesn't know is ignored.
