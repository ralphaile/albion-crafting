# Price server

`apps/api` fetches AODP's prices on a schedule into Postgres, and serves them and the best crafts from there. [ADR-007](adr/007-price-server.md) explains why.

## Running it

It needs a Postgres database:

```sh
docker run -d --name aoc-db -e POSTGRES_PASSWORD=aoc -p 5432:5432 postgres:17-alpine
pnpm --filter @aoc/api run build
DATABASE_URL=postgres://postgres:aoc@localhost:5432/postgres pnpm --filter @aoc/api start
```

It brings the tables up to date, starts the first refresh and answers on port 3000. `SIGINT` or `SIGTERM` stops the refresh, finishes the requests in flight and closes the database.

| Variable          | Default            | What it sets                                    |
| ----------------- | ------------------ | ----------------------------------------------- |
| `DATABASE_URL`    | required           | The Postgres database                           |
| `PORT`, `HOST`    | `3000`, `0.0.0.0`  | Where it listens                                |
| `REGIONS`         | `west,europe,east` | The game servers to refresh                     |
| `REFRESH_MINUTES` | `30`               | The pause between refreshes. `0` turns them off |
| `CORS_ORIGIN`     | `*`                | The site allowed to call it from a browser      |

Logs are JSON lines: one per request, and one per server each refresh with how many prices it saved, how many items failed and how long it took.

To point the web app at it, build it with `VITE_PRICES_URL=http://localhost:3000`.

## Routes

All take `region`: `west` (default), `europe` or `east`. A wrong query gets a 400 with an `error`. Answers carry an ETag, so a repeat request gets a 304, and may be kept 60 seconds.

| Route                                                                     | Answers                                                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GET /health`                                                             | `{"status":"ok"}`, or a 503 when the database can't be reached                                    |
| `GET /prices?items=T4_BAG,T5_BAG&locations=Caerleon,Lymhurst&qualities=1` | AODP's rows for those items, markets and qualities, as `/api/v2/stats/prices` answers them        |
| `GET /bestcrafts?location=Martlock&buy=Martlock&sell=Caerleon`            | `{crafts, fetchedAt}`: the most profitable crafts, best first, and when their prices were fetched |

`/bestcrafts` also takes `focus`, `premium` (`true` or `false`), `stationFee`, `buyMode` (`instant` or `order`), `sellMode` (`order` or `instant`), `tiers`, `enchants` and `categories` (comma-separated), `sort` (`profit` or `margin`) and `limit` (1–100, default 20). It works out each craft as the web app's table does, at Normal quality, with no specializations or daily bonuses.

## Changing the table

Edit `src/prices.table.ts`, then run `pnpm --filter @aoc/api run db:generate` and commit the new file in `drizzle/`.

## Tests

The routes are tested against an in-memory store. The Postgres store's tests start a real Postgres with Testcontainers, so they need Docker: they run in CI and are skipped elsewhere unless `CI` is set.
