/**
 * Returns the base URL for backend API calls.
 *
 * In development (npm run dev) the frontend is served by the same Express
 * server, so relative paths like `/api/...` work out of the box.
 *
 * In production the React SPA is deployed on Vercel while the Express
 * backend lives on Render. The Vercel build sets `VITE_API_URL` to the
 * Render service URL (e.g. https://agrinex-backend.onrender.com).
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "";
