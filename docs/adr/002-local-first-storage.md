# ADR-002: Local-first storage

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

The first release has no backend. The site is static files on GitHub Pages, and the browser calls the AODP price API itself. The app still has to remember three things between visits:

- **Market prices**, so it doesn't fetch them again on every visit.
- **Prices the user typed in.** These are the user's own work, often for Black Zone markets where AODP has no data, so losing them is costly.
- **Settings**, such as focus, premium and how you buy and sell.

A later release adds a backend with accounts. It should sync this data, not change how the app works.

## Decision

- **Everything the app saves stays in the browser, in IndexedDB**, through Dexie, a small library that makes IndexedDB easier to use.
- **Settings are checked with Zod when they're loaded, and carry a version number.** A migration upgrades an older saved version, so a change to the settings never breaks what someone saved before.
- **When IndexedDB isn't available**, as in some private browsing modes, the app keeps everything in memory for that visit and says so.
- **Manual prices can be exported and imported as versioned JSON.** That's the backup until there's a server, and the format the server will sync later.
- **With a backend, the app keeps working from what it has stored**, offline too. An account then syncs that data between devices.

## Consequences

- There's no server to run, pay for or secure, and nothing the user saves leaves their browser.
- The app opens quickly and still works from cached prices when AODP is slow or down.
- Until accounts exist, data belongs to one browser on one device. Clearing the site's data deletes manual prices unless they were exported.
- Every change to a saved format needs a migration, and a test that loads the old format.
- Unit and component tests need an in-memory IndexedDB, because jsdom doesn't have one.
