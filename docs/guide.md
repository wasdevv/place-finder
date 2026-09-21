# Guide

## Architecture

```
Browser ── React + Vite SPA (frontend/) ──fetch /api/*──> Express app (server/) ──> MongoDB
```

In development Vite proxies `/api` to the Express server on port 3001, so the browser always talks to a single origin. In production Vercel serves the built SPA from `dist/` and routes `/api/*` to a serverless function that runs the same Express app. Because the frontend and the API share an origin in both cases, there is no CORS configuration.

## Layout

```
api/index.js            Vercel function entry: re-exports the Express app
server/
  app.js                Express app: JSON body limit, routes, 404, error handler
  dev.js                Local entry: app.listen(PORT)
  db.js                 Cached Mongoose connection
  place.js              Place schema and 2dsphere index
  places.js             /api/places routes
  validation.js         Input parsing and validation, Haversine distance
  validation.test.js    Tests for validation.js
  auth.js               Bearer token check for the sync and admin routes
  sources.js            Which OSM tags become which category, and OSM element → place
  sources.test.js       Tests for sources.js, with elements copied from real Overpass responses
  sync.js               Pulls places from OpenStreetMap and upserts them
  sync-cli.js           `npm run sync`
frontend/
  index.html
  src/
    config.js           Brand, categories, demo location, radius options
    api.js              fetch wrapper
    format.js           Coordinate and distance helpers
    pages/Home.jsx      Location, radius, search and results state
    pages/PlaceDetail.jsx
    components/         Header, PlaceList, PlaceMap, Brand
    styles.css
vite.config.js          Vite root is frontend/, build goes to dist/
vercel.json
```

### Why helpers live in `server/` and not in `api/`

Vercel turns every file under `api/` into its own serverless function. Keeping `api/` down to a single one-line entry means one function, and the rest of the backend is plain modules it imports.

### Backend

- **Connection** (`db.js`): the connection promise is kept in module scope so warm serverless invocations reuse it. A failed connection clears the promise so the next request retries instead of failing forever. A missing `MONGODB_URI` or an unreachable database becomes a `503 Database unavailable`, never a stack trace. The database name is always `place-finder`, whatever path the URI has, so an Atlas string without a database (like the one the Vercel integration creates) does not fall into Mongo's default `test` database.
- **Validation** (`validation.js`): every query parameter and the `POST` body pass through pure functions that throw a 400 `ValidationError`. The body is rebuilt from an allowlist, so unknown fields (`_id`, `createdAt`, anything else) never reach the database. Zero is a valid coordinate and a valid rating; the checks use `Number.isFinite`, not truthiness.
- **Search** escapes regex metacharacters, so `.*` or `[` are searched as text. A case-insensitive regex is fine for a few thousand documents; past that, move to Atlas Search.
- **Nearby** uses `$near` on the 2dsphere index, which already returns the closest 100 sorted by distance, then adds `distance` in km with the Haversine formula. Search results get `distance` too when the client sends `lat`/`lng`.
- **Errors** (`app.js`): malformed JSON is 400, bodies over 10 kB are 413, validation is 400, database problems are 503, OpenStreetMap being down is 502 and anything else is a generic 500 that is logged but not exposed.
- **Auth** (`auth.js`): `/api/sync` needs `Authorization: Bearer $CRON_SECRET` and `POST /api/places` needs `Authorization: Bearer $ADMIN_TOKEN`. When the variable is not set the route answers 503 instead of opening up, so forgetting a variable never makes a write public. Tokens are compared in constant time.

### Frontend

- `Home.jsx` owns all state. It shows the demo location first so the page is never empty, asks for the browser location on load and switches to it when granted. If location is denied, unsupported or times out, a dismissible notice says the demo location is being used. **My Location** asks again.
- Each fetch runs in an effect keyed on location, radius and search term, with an `AbortController`, so a slow response never overwrites a newer one. A failed request keeps the last good list and shows the error.
- Clearing the search box returns to the nearby list.
- The category chips filter both nearby and search results on the server (`category` query parameter).
- `PlaceMap.jsx` fits the map to the radius circle in nearby mode and to the results in search mode. `MapContainer` only reads `center` on creation, so a small child component with `useMap` moves the view when data changes and calls `invalidateSize` when the notice bar changes the map height.
- Map markers are Leaflet `divIcon`s styled in CSS, one per category with the same Lucide icon and color used in the list, so no marker images are hotlinked. They are built once when the module loads, because rendering the icon markup inside a React render does nothing.
- Places with missing or malformed coordinates are skipped on the map instead of breaking the list.

## Customizing

Branding, categories and the demo location are in `frontend/src/config.js`:

```js
import { Bike, Recycle } from 'lucide-react';

export const categories = {
  bike: { label: 'Bike racks', Icon: Bike, color: '#0f9d7a' },
  recycling: { label: 'Recycling', Icon: Recycle, color: '#15803d' },
};

export const demoLocation = { lat: -23.5505, lng: -46.6333, city: 'São Paulo' };
```

`Icon` is any [Lucide](https://lucide.dev/icons) icon. A category key must also be in `CATEGORIES` in `server/validation.js`, which the schema and the API use to reject unknown values, and in `SOURCES` in `server/sources.js` if it should come from OpenStreetMap. Other colors are CSS variables at the top of `styles.css`.

## OpenStreetMap sync

Places come from [OpenStreetMap](https://www.openstreetmap.org) and are refreshed every day. OSM data is © OpenStreetMap contributors under the [ODbL](https://www.openstreetmap.org/copyright), which the map attribution already credits. Each detail page links to its OSM element, so a wrong phone or address is fixed at the source and shows up after the next sync.

### What is fetched

`SOURCES` in `server/sources.js` is the whole mapping, one line per OSM tag:

| Category | OSM tag |
|---|---|
| `pharmacy` | `amenity=pharmacy` |
| `mall` | `shop=mall` |
| `park` | `leisure=park` whose name starts with "Parque" (squares are also tagged as parks and would flood the map) |
| `zoo` | `tourism=zoo` |
| `water` | `natural=water` named "Lago…" or "Represa…", and `waterway=river` |
| `hospital` | `amenity=hospital` |
| `culture` | `amenity=theatre`, `cinema`, `library` and `tourism=museum` |
| `sports` | `leisure=stadium` |
| `fuel` | `amenity=fuel` |
| `ice_cream` | `amenity=ice_cream` |
| `transit` | `amenity=bus_station` |

Only named elements inside the city boundary (`AREA`) are used. Buildings and areas become their center point. A river is a line split into many segments, so each named river becomes a single point: the middle of its longest segment.

### How a run works (`server/sync.js`)

1. One Overpass query fetches everything. If the main server fails, times out or answers with a partial result, a mirror is tried; if both fail the run stops with a 502 and nothing in the database changes.
2. Each element is upserted by `osmId` (`node/123`, `way/456`) with name, category, coordinates, phone, website and hours. Fields removed in OSM are removed here too.
3. Street and neighborhood come from the OSM `addr:*` tags. When they are missing, and only for places not in the database yet, Nominatim reverse geocoding fills them in. Nominatim allows one request per second, so the cron resolves at most 40 new places per run and leaves the rest for the next day (`pending` in the result). `npm run sync` has no limit.
4. OSM places that were not in this run are marked `stale` and disappear from the list and the map; their detail page still works. They come back if they reappear in OSM. If a run returns fewer than half of the places already on file, the stale step is skipped (`staleCheck` in the result), so a bad Overpass response cannot hide the whole city.
5. Places added through `POST /api/places` have `source: "manual"` and are never touched by the sync.

### Running it

- Locally: `npm run sync`. The first run takes a few minutes because of Nominatim. `npm run sync -- --replace` empties the collection first, but only after OpenStreetMap answered, so a failed download never leaves it empty.
- In production: Vercel Cron calls `GET /api/sync` every day at 06:00 UTC (`crons` in `vercel.json`) and sends `CRON_SECRET` as a bearer token. `maxDuration` is 300 seconds so Overpass and 40 lookups fit in one run.
- By hand in production: `curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>.vercel.app/api/sync`.

The result is a JSON summary: `{ found, inserted, updated, pending, skipped, stale, staleCheck }`. `skipped` counts elements that failed validation, like a phone number over 40 characters.

## Data model

| Field | Type | Notes |
|---|---|---|
| `name` | string | required, max 120 |
| `category` | string | required: `pharmacy`, `mall`, `park`, `zoo`, `water`, `hospital`, `culture`, `sports`, `fuel`, `ice_cream` or `transit` |
| `alternateName` | string | name in another language or script |
| `address` | string | required, max 200 |
| `neighborhood` | string | required, max 80 |
| `city` | string | required, max 80 |
| `location` | GeoJSON Point | `coordinates` is `[lng, lat]`, 2dsphere index |
| `phone` | string | max 40 |
| `website` | string | must start with `http://` or `https://` |
| `hours` | string | free text, line breaks are kept |
| `rating` | number | 0 to 5 |
| `tags` | string[] | up to 20, max 40 chars each |
| `source` | string | `osm` or `manual` |
| `osmId` | string | OSM element, like `node/3897495209`; unique |
| `seenAt` | date | last sync that saw it |
| `stale` | boolean | gone from OSM; hidden from lists |
| `createdAt`, `updatedAt` | date | automatic |

GeoJSON puts longitude first. The API accepts `lat`/`lng` and builds `[lng, lat]` for you.

## MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user and copy the connection string (`mongodb+srv://user:pass@cluster.xxxx.mongodb.net/place-finder`).
3. Under **Network Access**, allow your IP for local development. Vercel functions do not have fixed IPs, so production needs `0.0.0.0/0` (or Vercel's paid static IPs).
4. Put the string in `.env.local` as `MONGODB_URI` and run `npm run sync`. It also creates the indexes.

## Deploy on Vercel

`vercel.json` sets the Vite build, `dist/` as output, `/api/*` to the Express function and every other path to `index.html`, so a reload on `/place/:id` still works.

1. Push the repo to GitHub and import it at [vercel.com/new](https://vercel.com/new), or run `npx vercel` in the project folder.
2. In **Settings → Environment Variables**, add `MONGODB_URI`. Alternatively, `npx vercel integration add mongodbatlas --plan FREE` creates a free Atlas cluster and sets the variable for you.
3. Add `CRON_SECRET` (any long random string, e.g. `openssl rand -hex 32`) and, if you want to add places by hand, `ADMIN_TOKEN`.
4. Fill the database once so the site is not empty until the first cron: `npx vercel env pull .env.production.local --environment production`, then `node --env-file=.env.production.local server/sync-cli.js`.
5. Deploy, then check `https://<your-app>.vercel.app/api/health` returns `{"status":"ok"}` and that reloading a `/place/<id>` URL shows the page.

The Node version comes from `engines.node` in `package.json` (22.x).

## Map tiles

Tiles come from the public OpenStreetMap servers, which is fine for a demo or low traffic. Their [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) asks heavy users to use a commercial provider or their own tile server; swap the `url` in `tiles` inside `PlaceMap.jsx` when that happens. The attribution must stay visible.

## Troubleshooting

**`/api/health` returns 503.** `MONGODB_URI` is missing or the database is unreachable. Locally, the API reads `.env.local` at start, so restart `npm run dev:api` after editing it. On Atlas, check Network Access.

**The list is empty.** Run `npm run sync`, then check the radius and the category filter: the demo data is in São José do Rio Preto, so with a real location elsewhere nothing will be within 50 km. Deny location or add places near you.

**Location never resolves.** Browsers only allow geolocation on `https` or `localhost`. Opening the dev server through a LAN IP will always fall back to the demo location.

**The map is grey or partly grey.** Tiles are still loading or blocked by the network. The list and detail pages keep working without them.

**Port 3001 is in use.** Set `PORT` in `.env.local` and change the proxy target in `vite.config.js` to match.

## Adding places

For places that are not in OpenStreetMap. There is no admin screen; set `ADMIN_TOKEN` and use the API:

```bash
curl -X POST http://localhost:3001/api/places \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"category":"pharmacy","name":"New Pharmacy","address":"789 Main St","neighborhood":"Centro","city":"São José do Rio Preto","lat":-20.82,"lng":-49.38,"tags":["Parking"]}'
```

## What is not here

User accounts, image uploads, reviews, notifications and analytics were left out on purpose. Each one is a separate feature with its own decisions; add them when there is a need for them.
