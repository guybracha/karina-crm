Backend (NestJS + Prisma)

Overview
- REST API under `/api` on port `5000`.
- CRUD for customers: `GET/POST /api/customers`, `GET/PUT/DELETE /api/customers/:id`.
- Photos upload endpoints:
  - `POST /api/customers/:id/photos` — multipart `files`[]. Stores under `server/uploads/` and returns public URLs.
  - `DELETE /api/customers/:id/photos/:photoId` — removes a specific photo (and the file when stored under uploads).
  - `GET /api/customers/:id/photos` — returns `[ { id, url } ]` ordered by creation.
- SQLite via Prisma (`DATABASE_URL=file:./dev.db`).
- Images: `orderImageUrls` are stored in a related `CustomerPhoto` table and returned to the UI as `string[]`.

Setup
1) From `server/` directory, copy env and install deps:
   - `cp .env.example .env`
   - `npm install`

2) Init database and Prisma client:
   - `npx prisma migrate dev --name init`
   - `npm run prisma:generate`
   - Note: `schema.prisma` sets `engineType = "binary"` for reliability on Windows. If you change it, run `prisma generate` again.

3) Run the server:
   - `npm run dev`
   - Server listens at `http://localhost:5000/api`
   - Static uploads served from `http://localhost:5000/uploads/<filename>`

Frontend integration
- Frontend reads `import.meta.env.VITE_API_URL` and defaults to `http://localhost:5000/api`.
- No change needed; customer screens now call the backend via `src/lib/localApi.js`.

Notes
- Body size is increased to 25MB to allow base64 images and multipart uploads.
- `createdAt`/`updatedAt` are returned as epoch milliseconds for UI sorting.

Examples
- Upload photo via PowerShell:
  - `Invoke-RestMethod -Uri 'http://localhost:5000/api/customers/<id>/photos' -Method Post -Form @{ files = Get-Item .\image.jpg }`
