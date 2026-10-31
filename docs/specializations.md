# Specializations

The **Specializations** button at the top right, just its icon on phones, opens a panel over the right of the page. It closes on Escape, a click outside it, or ×. In the code, the profile is `SpecializationProfile` in `apps/web/src/specializations.types.ts`, and the panel is `apps/web/src/SpecializationsPanel.tsx`.

A crafting tree is one destiny-board node, such as Swords or Plate Armor: a mastery, then one specialization per item line. The trees are grouped by the building that crafts them: Warrior's Forge, Hunter's Lodge and Mage's Tower. Offhands sit with that building, so shields are under the forge, torches under the lodge and tomes under the tower. Royal items cost no focus, so they have no specialization here.

Each mastery and specialization is a whole number from 0 to 100. **Export** downloads the profile as `specializations.json`. **Import** replaces it from a file like that. A file that isn't JSON, or that has no level this app knows, is left unused, so it can't wipe what you already entered.

[FCE](glossary.md#fce) for an item is its tree's mastery × 30, plus its own specialization × 250, plus every other specialization in that tree × 30. The same item at every tier and enchantment shares that FCE. With nothing filled in, FCE is 0 and a craft costs its full base focus. While focus is on, a craft in that state offers **Fill in specializations** in its [panel](craft-panel.md), which opens this one on that craft's tree.

## Saved, not in the link

The browser saves the profile in IndexedDB, like the [settings](settings.md#saved-not-in-the-link), and only once you change a level. It isn't in the link: the levels are yours, so someone who opens your link sees the crafts with their own. Where IndexedDB isn't available, the profile lasts for the visit.

A saved level the app doesn't know, or one outside 0 to 100, is left out. A level of 0 is left out too, since it changes nothing.
