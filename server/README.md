Backend (NestJS + Prisma)

Overview
- REST API under `/api` on port `5000`.
- CRUD for customers: `GET/POST /api/customers`, `GET/PUT/DELETE /api/customers/:id`.
- SQLite via Prisma (`DATABASE_URL=file:./dev.db`).
- Images: `orderImageUrls` are stored in a related `CustomerPhoto` table and returned to the UI as `string[]`.

Setup
1) From `server/` directory, copy env and install deps:
   - `cp .env.example .env`
   - `npm install`

2) Init database and Prisma client:
   - `npx prisma migrate dev --name init`
   - `npm run prisma:generate`

3) Run the server:
   - `npm run dev`
   - Server listens at `http://localhost:5000/api`

Frontend integration
- Frontend reads `import.meta.env.VITE_API_URL` and defaults to `http://localhost:5000/api`.
- No change needed; customer screens now call the backend via `src/lib/localApi.js`.

Notes
- Body size is increased to 10MB to allow base64 images in `orderImageUrls`.
- `createdAt`/`updatedAt` are returned as epoch milliseconds for UI sorting.
