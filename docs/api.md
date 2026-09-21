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
| `category` | no | `pharmacy`, `mall`, `park`, `zoo` or `water` |

Up to 100 places, closest first, each with `distance` in km.

```json
{
  "data": [
    {
      "_id": "6ab16517a8f9bda8696f0e70",
      "name": "Farmácia Central",
      "category": "pharmacy",
      "address": "Rua Bernardino de Campos, 3568",
      "neighborhood": "Vila Redentora",
      "city": "São José do Rio Preto",
      "location": { "type": "Point", "coordinates": [-49.384734, -20.814963] },
      "phone": "+55 17 2139-7999",
      "hours": "Open 24 hours",
      "tags": ["24h"],
      "createdAt": "2026-09-21T17:10:47.533Z",
      "updatedAt": "2026-09-21T17:10:47.533Z",
      "distance": 0.57
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

No authentication.

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
