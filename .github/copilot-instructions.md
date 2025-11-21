# Copilot instructions for TinyLink (Express + SQLite)

This file gives focused, actionable guidance for an AI coding agent to be productive in this repository.

Overview
- The app is a small Express-based URL shortener. Main server: `server.js`. Data layer: `db.js` (uses `better-sqlite3`). Static frontend: `public/` (`index.html`, `code.html`, `styles.css`).
- Entry point: `server.js` (listens on `process.env.PORT || 3000`). Package scripts: `npm start` and `npm run dev` (uses `nodemon`). See `package.json`.

Big-picture architecture
- HTTP server (Express) exposes JSON APIs under `/api/links` and a shallow redirect route for `/:code`. Health endpoint at `/healthz`.
- Persistence: SQLite file stored at `data/tinylink.db` by default. Path can be overridden via `DATABASE_URL` (the code strips `sqlite:` prefix). `db.js` creates the `data` directory if missing and initializes the `links` table.
- Frontend: static SPA in `public/` uses `fetch()` against `/api/links` and the redirect flow. Static files served using `express.static(path.join(__dirname, 'public'))`.

Important patterns and constraints (do not break these)
- Code format: codes are restricted by `CODE_RE = /^[A-Za-z0-9]{6,8}$/` in `db.js`. Generated codes are 7 characters long.
- Creation behavior: `POST /api/links` returns `409` when a requested custom `code` exists (the code in `db.js` throws an error with `e.code === 'EEXISTS'`).
- Soft-delete: `deleteLink` sets `deleted = 1` rather than removing rows. All read queries filter `deleted = 0`.
- Click counting: `incrementClick` is synchronous and updates `clicks` and `last_clicked` in the same DB call.
- Validation: `createLink` uses `validateUrl()` (only `http:` and `https:` allowed). If invalid, it throws an error with message `'invalid url'`.
- DB API returns rows with fields: `code, url, clicks, last_clicked, created_at` (use these names in tests/clients).

Developer workflows & commands
- Install: `npm install`
- Run locally: `npm start` (uses `node server.js`). Development auto-reload: `npm run dev` (requires `nodemon`).
- Environment: `require('dotenv').config()` is called; set `DATABASE_URL` (e.g. `sqlite:./data/tinylink.db`) and `PORT` as needed. If `DATABASE_URL` is set, the code removes the `sqlite:` prefix to get the path.

Conventions & implementation notes for editing
- If adding routes, keep the redirect route handler (`app.get('/:code', ...)`) after the API routes and static handlers — otherwise redirects may intercept API/static paths.
- Use synchronous `better-sqlite3` APIs as in `db.js` (prepare/run/get/all) to keep code consistent.
- Do not change the `code` length/regex without updating all uses (code generation, validation, and frontend expectations).

Examples from the codebase
- Create link: `POST /api/links` with JSON `{ "url": "https://...", "code": "abc1234" }` — server returns `201` with created link or `409`.
- Get stats: `GET /api/links/:code` returns `{ code, url, clicks, last_clicked, created_at }` or `404`.
- Redirect: `GET /:code` looks up the link, calls `incrementClick`, then `res.redirect(302, row.url)`.

Notes, gotchas & things an agent should flag
- Frontend mismatch: `public/index.html` renders link hrefs as `/code/${row.code}` (see `index.html`) but the server implements redirects at `/:code`. This will cause 404s for those UI links. If changing the frontend, prefer fixing the UI to link `/${row.code}` or add a `/code/:code` redirect route.
- `db.js` creates `data` directory at runtime; the repo has no checked-in DB file. Be mindful when running locally (the DB will be created automatically).
- No automated tests detected in the repo. If you add tests, use the DB file in a temp directory or mock `better-sqlite3`.

Where to look first when debugging
- `server.js` — routing order, middleware, and entrypoint.
- `db.js` — DB schema, validation, and important behaviors (soft delete, code generation).
- `public/index.html` — client behavior and examples of API usage.

When making changes
- Keep API semantics stable: error codes (`400`, `404`, `409`), response shapes, and the `deleted` flag logic.
- If adding environment-driven behavior, document new env vars in `README.md`.

If anything in this file is unclear or missing, tell me which area you want expanded (tests, CI, migration, or adding CLI tooling).
