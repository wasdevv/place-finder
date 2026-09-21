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
  seed.js               Demo data loader
  seed-places.json      Demo places (from OpenStreetMap)
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
- **Errors** (`app.js`): malformed JSON is 400, bodies over 10 kB are 413, validation is 400, database problems are 503 and anything else is a generic 500 that is logged but not exposed.

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

`Icon` is any [Lucide](https://lucide.dev/icons) icon. A category key must also be in `CATEGORIES` in `server/validation.js`, which the schema and the API use to reject unknown values. Other colors are CSS variables at the top of `styles.css`.

## Demo data

`server/seed-places.json` holds 71 real places in São José do Rio Preto taken from OpenStreetMap: 46 pharmacies, 10 malls, 11 parks, the zoo, the Represa Municipal, a lake and a point on the Rio Preto. Coordinates, names, street addresses, phones and opening hours come from OSM tags; missing street names and the neighborhoods come from Nominatim reverse geocoding. OSM data is © OpenStreetMap contributors under the [ODbL](https://www.openstreetmap.org/copyright), which the map attribution already credits.

To use your own data, replace the JSON file (same fields as the `POST` body) and run `npm run seed -- --replace`.

## Data model

| Field | Type | Notes |
|---|---|---|
| `name` | string | required, max 120 |
| `category` | string | required: `pharmacy`, `mall`, `park`, `zoo` or `water` |
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
| `createdAt`, `updatedAt` | date | automatic |

GeoJSON puts longitude first. The API accepts `lat`/`lng` and builds `[lng, lat]` for you.

## MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user and copy the connection string (`mongodb+srv://user:pass@cluster.xxxx.mongodb.net/place-finder`).
3. Under **Network Access**, allow your IP for local development. Vercel functions do not have fixed IPs, so production needs `0.0.0.0/0` (or Vercel's paid static IPs).
4. Put the string in `.env.local` as `MONGODB_URI` and run `npm run seed -- --replace`. The seed also creates the 2dsphere index.

The seed deletes every document in `places` before inserting, which is why it refuses to run without `--replace`. Never point it at production data.

## Deploy on Vercel

`vercel.json` sets the Vite build, `dist/` as output, `/api/*` to the Express function and every other path to `index.html`, so a reload on `/place/:id` still works.

1. Push the repo to GitHub and import it at [vercel.com/new](https://vercel.com/new), or run `npx vercel` in the project folder.
2. In **Settings → Environment Variables**, add `MONGODB_URI`. Alternatively, `npx vercel integration add mongodbatlas --plan FREE` creates a free Atlas cluster and sets the variable for you.
3. Seed it: `npx vercel env pull .env.production.local --environment production`, then `node --env-file=.env.production.local server/seed.js --replace`.
4. Deploy, then check `https://<your-app>.vercel.app/api/health` returns `{"status":"ok"}` and that reloading a `/place/<id>` URL shows the page.

The Node version comes from `engines.node` in `package.json` (22.x).

## Map tiles

Tiles come from the public OpenStreetMap servers, which is fine for a demo or low traffic. Their [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) asks heavy users to use a commercial provider or their own tile server; swap the `url` in `tiles` inside `PlaceMap.jsx` when that happens. The attribution must stay visible.

## Troubleshooting

**`/api/health` returns 503.** `MONGODB_URI` is missing or the database is unreachable. Locally, the API reads `.env.local` at start, so restart `npm run dev:api` after editing it. On Atlas, check Network Access.

**The list is empty.** Run the seed, then check the radius and the category filter: the demo data is in São José do Rio Preto, so with a real location elsewhere nothing will be within 50 km. Deny location or add places near you.

**Location never resolves.** Browsers only allow geolocation on `https` or `localhost`. Opening the dev server through a LAN IP will always fall back to the demo location.

**The map is grey or partly grey.** Tiles are still loading or blocked by the network. The list and detail pages keep working without them.

**Port 3001 is in use.** Set `PORT` in `.env.local` and change the proxy target in `vite.config.js` to match.

## Adding places

There is no admin screen. Use the API:

```bash
curl -X POST http://localhost:3001/api/places \
  -H 'Content-Type: application/json' \
  -d '{"category":"pharmacy","name":"New Pharmacy","address":"789 Main St","neighborhood":"Centro","city":"São José do Rio Preto","lat":-20.82,"lng":-49.38,"tags":["Parking"]}'
```

The endpoint has no authentication. Before a public deploy, protect it or remove it from `server/places.js`.

## What is not here

Authentication, image uploads, reviews, notifications and analytics were left out on purpose. Each one is a separate feature with its own decisions; add them when there is a need for them.
