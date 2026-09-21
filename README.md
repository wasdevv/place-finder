# Place Finder

Find places near you on a map. A list of nearby places on the left, an OpenStreetMap map on the right, a detail page with directions for each one.

It ships with real places in São José do Rio Preto, Brazil: pharmacies, malls, parks, the zoo, rivers and lakes. Categories, city and branding live in one config file, so it works for anything with a name and a coordinate.

![Place Finder](docs/screenshot.jpg)

## Features

- Nearby search with your browser location and a radius from 1 to 50 km, sorted by distance
- Falls back to a demo location when location is denied or unavailable, and says so
- Text search by name, alternate name, neighborhood or city
- Category filter, with its own color and icon on the list and on the map
- Map with a radius circle, your position and a marker per place
- Detail page with address, phone, website, hours, tags and a Google Maps directions link
- Responsive down to phone width
- JSON API with validated input, including an open `POST` for adding places

Demo data comes from [OpenStreetMap](https://www.openstreetmap.org/copyright) (© OpenStreetMap contributors, ODbL).

## Stack

React 19 + Vite · React Router · Leaflet + OpenStreetMap · Express 5 · Mongoose + MongoDB (2dsphere index) · Vercel

## Run it

Requires Node 22 and a MongoDB database (Atlas free tier or local).

```bash
npm install
cp .env.example .env.local        # set MONGODB_URI
npm run seed -- --replace         # wipes the places collection and inserts demo data
npm run dev:api                   # http://localhost:3001
npm run dev:web                   # http://localhost:5173
```

No MongoDB around? `docker run -d -p 27017:27017 mongo:7` and use `MONGODB_URI=mongodb://127.0.0.1:27017/place-finder`.

```bash
npm test          # validation tests (node:test)
npm run check     # tests + production build
```

## Docs

- [Guide](docs/guide.md): architecture, how the code is organized, customization, deploy on Vercel, troubleshooting
- [API reference](docs/api.md)

## License

[MIT](LICENSE)
