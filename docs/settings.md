# Crafting settings

The **Settings** button at the top right opens a panel over the right of the page. It closes on Escape, a click outside it, or ×. Each setting has a **?** that explains it. In the code, the settings are `CraftingSettings` in `apps/web/src/settings.types.ts`, and the panel is `apps/web/src/SettingsPanel.tsx`.

| Setting          | What it changes                                                                                                                                | Default     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Use focus        | Prices each craft with [focus](glossary.md#focus), and shows silver per focus                                                                  | On          |
| Premium          | The market [tax](glossary.md#tax-and-premium): 4% with premium, 8% without                                                                     | On          |
| Station fee      | Silver per 100 [nutrition](glossary.md#nutrition-and-station-fee), 0 to 100,000                                                                | 500         |
| Daily bonuses    | Up to two [daily bonuses](glossary.md#daily-bonus), each a crafting category and +10% or +20%                                                  | None        |
| Buy materials by | Instant buy or buy order, for the [material cost](glossary.md#material-cost)                                                                   | Instant buy |
| Sell by          | Sell order or instant sell, for the [revenue](glossary.md#revenue). Selling in the [Black Market](glossary.md#black-market) is always instant. | Sell order  |
| Stale after      | Hours until a price counts as [stale](glossary.md#fresh-stale-and-missing-prices), 1 to 168                                                    | 12          |
| Server           | The game server whose prices to fetch: Americas, Europe or Asia                                                                                | Americas    |

A change applies straight away. A new server or stale time asks for prices again, and the browser's [cache](market-prices.md) answers with any it fetched in the last 15 minutes. Every other setting re-ranks the prices already fetched.

**Reset to defaults** puts every setting back. **Clear price cache** forgets every price saved in the browser, on every server, so the next request goes to AODP. The prices on screen stay until then, and [manual prices](manual-prices.md) stay for good.

## Saved, not in the link

The browser saves the settings in IndexedDB, like the [filters](filters.md#in-the-link-and-saved) and the [route](route.md#in-the-link-and-saved), and only once you change one. They aren't in the link: they describe how you play, so someone who opens your link sees the crafts with their own settings. Where IndexedDB isn't available, the settings last for the visit.

A saved value the app doesn't know falls back to its default, one setting at a time, and only the first two daily bonuses are kept.
