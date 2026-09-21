# API reference

All responses are JSON. Errors are `{ "error": "message" }` with a 4xx or 5xx status.

| Status | When |
|---|---|
| 400 | invalid parameter, invalid body, malformed JSON, malformed id |
| 401 | missing or wrong bearer token |
| 404 | place or route not found |
| 413 | body larger than 10 kB |
| 502 | OpenStreetMap unavailable during a sync |
| 503 | database not configured or unreachable, or the route's token is not configured |
| 500 | unexpected error (details are only logged) |

## `GET /api/health`

`200 { "status": "ok", "timestamp": "..." }` when the database answers a ping, `503` otherwise.

## `GET /api/places/nearby`

| Param | Required | Rules |
|---|---|---|
| `lat` | yes | -90 to 90 |
| `lng` | yes | -180 to 180 |
| `radiusKm` | no | greater than 0, at most 50, default 5 |
| `category` | no | `pharmacy`, `mall`, `park`, `zoo`, `water`, `hospital`, `culture`, `sports`, `fuel`, `ice_cream` or `transit` |

Up to 100 places, closest first, each with `distance` in km.

```json
{
  "data": [
    {
      "_id": "6ab16e7db3f8f52120283b9c",
      "osmId": "node/3897495209",
      "address": "Avenida Murchid Homsi, 1155",
      "category": "pharmacy",
      "city": "São José do Rio Preto",
      "createdAt": "2026-09-21T17:50:53.046Z",
      "hours": "Open 24 hours",
      "location": { "type": "Point", "coordinates": [-49.365512, -20.820812] },
      "name": "Rio Pharma",
      "neighborhood": "Centro",
      "phone": "+55 17 3215 3030",
      "seenAt": "2026-09-21T17:51:01.286Z",
      "source": "osm",
      "stale": false,
      "tags": ["24h"],
      "updatedAt": "2026-09-21T17:51:07.539Z",
      "distance": 1.53
    }
  ],
  "count": 1,
  "radiusKm": 5
}
```

## `GET /api/places/search`

| Param | Required | Rules |
|---|---|---|
| `q` | yes | 1 to 100 characters after trimming, matched as plain text |
| `lat`, `lng` | no | when both are sent, each result gets `distance` |
| `category` | no | same values as nearby |

Case-insensitive match on `name`, `alternateName`, `neighborhood` and `city`. Up to 50 results sorted by name. Same response shape as nearby, without `radiusKm`.

## `GET /api/places`

| Param | Rules |
|---|---|
| `page` | positive integer, default 1 |
| `limit` | positive integer, default 20, capped at 100 |

Newest first.

```json
{ "data": [], "count": 20, "total": 150, "page": 1, "pages": 8 }
```

## `GET /api/places/:id`

`200 { "data": { ... } }`, `400` for a malformed id, `404` when no place has that id.

## `POST /api/places`

Requires `Authorization: Bearer <ADMIN_TOKEN>`. The place is stored with `source: "manual"`, so the OpenStreetMap sync never changes it.

```json
{
  "category": "pharmacy",
  "name": "New Pharmacy",
  "address": "789 Main St",
  "neighborhood": "Centro",
  "city": "São José do Rio Preto",
  "lat": -20.8165,
  "lng": -49.3795,
  "alternateName": "Farmácia Nova",
  "phone": "(17) 3000-0000",
  "website": "https://example.com",
  "hours": "Todos os dias: 9h–21h",
  "rating": 4.2,
  "tags": ["Estacionamento", "Entrega"]
}
```

`category`, `name`, `address`, `neighborhood`, `city`, `lat` and `lng` are required. `rating` must be a JSON number from 0 to 5. `tags` must be an array of non-empty strings. Any other field is ignored. Returns `201 { "data": { ... } }`.

## `GET /api/sync`

Requires `Authorization: Bearer <CRON_SECRET>`. Vercel Cron calls it daily. Pulls places from OpenStreetMap, resolving up to 40 new addresses per call, and returns a summary:

```json
{ "found": 180, "inserted": 3, "updated": 170, "pending": 0, "skipped": 1, "stale": 2, "staleCheck": "done" }
```

How it decides each number is in the [guide](guide.md#openstreetmap-sync).
