# API reference

All responses are JSON. Errors are `{ "error": "message" }` with a 4xx or 5xx status.

| Status | When |
|---|---|
| 400 | invalid parameter, invalid body, malformed JSON, malformed id |
| 404 | place or route not found |
| 413 | body larger than 10 kB |
| 503 | database not configured or unreachable |
| 500 | unexpected error (details are only logged) |

## `GET /api/health`

`200 { "status": "ok", "timestamp": "..." }` when the database answers a ping, `503` otherwise.

## `GET /api/places/nearby`

| Param | Required | Rules |
|---|---|---|
| `lat` | yes | -90 to 90 |
| `lng` | yes | -180 to 180 |
| `radiusKm` | no | greater than 0, at most 50, default 5 |

Up to 50 places, closest first, each with `distance` in km.

```json
{
  "data": [
    {
      "_id": "6ab15d851c255882a50adf74",
      "name": "Nabipura Family Chemist",
      "alternateName": "نبی پورہ فیملی کیمسٹ",
      "address": "18 Gurumangat Road",
      "neighborhood": "Nabipura",
      "city": "Lahore",
      "location": { "type": "Point", "coordinates": [74.3598, 31.522] },
      "phone": "+92 42 3576 5500",
      "hours": "Daily: 8am–midnight",
      "rating": 3.9,
      "tags": ["Delivery"],
      "createdAt": "2026-09-21T16:38:29.512Z",
      "updatedAt": "2026-09-21T16:38:29.512Z",
      "distance": 0.21
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

No authentication.

```json
{
  "name": "New Pharmacy",
  "address": "789 Main St",
  "neighborhood": "Gulberg",
  "city": "Lahore",
  "lat": 31.5204,
  "lng": 74.3587,
  "alternateName": "نئی فارمیسی",
  "phone": "+92 42 0000 0000",
  "website": "https://example.com",
  "hours": "Mon–Sun: 9am–9pm",
  "rating": 4.2,
  "tags": ["Parking", "AC"]
}
```

`name`, `address`, `neighborhood`, `city`, `lat` and `lng` are required. `rating` must be a JSON number from 0 to 5. `tags` must be an array of non-empty strings. Any other field is ignored. Returns `201 { "data": { ... } }`.
