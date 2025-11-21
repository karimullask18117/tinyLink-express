# TinyLink (Express + SQLite)

Simple URL shortener that follows the assignment spec.

## Run locally
1. `npm install`
2. `npm start`
3. Open http://localhost:3000

## Notes
- Implements required endpoints:
  - `POST /api/links` Create link (409 if code exists)
  - `GET /api/links` List all links
  - `GET /api/links/:code` Stats for one code
  - `DELETE /api/links/:code` Delete link
  - `GET /healthz` Health check
  - `GET /:code` Redirect (302 or 404)
- Uses SQLite for simplicity so the project is self-contained for local testing.
- `.env.example` lists environment variables.
