# Zero Site

Account web app and API proxy for Zero for Outlook cloud sync.

## Stack

- TanStack React Router + React Query
- Clerk (web sign-in)
- Express API proxy
- Firebase Admin (settings storage)

## Development

```bash
npm install
npm run dev
```

In a second terminal:

```bash
npm run api:dev
```

Copy the repo root `.env.example` to `.env` at the repo root and fill in values.

Firebase web config is initialized in `src/lib/firebase.ts` using `VITE_FIREBASE_*` values.
Analytics is intentionally not initialized.

## Key routes

- `/` - account landing and sign-in
- `/extension-link?device_code=...` - completes extension device link flow

## API endpoints

- `POST /auth/extension-token`
- `GET /auth/extension-token/claim?device_code=...`
- `GET /settings`
- `PUT /settings`
- `POST /settings/merge`
