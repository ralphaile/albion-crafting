# ADR-005: Components are styled with CSS Modules and shared theme variables

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

The best-crafts table is the first screen with a real design: a dark and a light theme, colors for fresh, stale and missing prices, tier plates tinted by enchantment, and a dense table whose columns have to line up. The app needed one way to style components that keeps each component's styles from reaching into the others, and lets both themes share every color. The usual options are utility classes such as Tailwind, CSS written in JavaScript such as styled-components, or CSS Modules.

## Decision

- **Each component has a CSS Module next to it:** `CraftsTable.tsx` imports `CraftsTable.module.css`. Vite gives each class a unique name, so a `.row` in one file never affects another.
- **Shared values live in `src/theme.css`** as CSS variables: colors, fonts, the corner radius and the page gutter. Dark is the default, and a light set replaces it when the system asks for light (`prefers-color-scheme`). Modules take their colors from these variables, so both themes change in one place.
- **`theme.css` is the only global stylesheet.** Besides the variables, it holds the page's base styles: background, text, focus ring, form controls and reduced motion.
- **Fonts are bundled** from the `@fontsource` packages (Alegreya, Alegreya Sans and Alegreya Sans SC), so the app asks no other site for fonts.

## Consequences

- Styles are plain CSS. Any CSS feature the browsers support works, such as `color-mix()` and sticky table headers, and there's no styling library to learn.
- CSS Modules are built into Vite: no dependency, and nothing runs in the browser to apply styles.
- A component's styles are in a second file next to it.
- Class names aren't checked by the compiler. A misspelled `styles.rwo` is `undefined`, and the style is silently missing. Screenshots and E2E tests catch it.
- jsdom doesn't apply styles, so component tests check content and roles, not looks.
