# U Vape Store

Custom e-commerce platform (Next.js 16, React 19, MongoDB, Tailwind 4) with storefront, admin panel, affiliate program and page builder.

## Setup
1. Copy `.env.example` to `.env.local` and fill in `MONGODB_URI`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` (Cloudinary, Turnstile, SMTP and Redis are optional).
2. `npm install`
3. `node src/scripts/seed-rbac.js` (roles + first admin) and `node src/scripts/seed.js` (sample vape catalogue; replaces existing products).
4. `npm run dev`, then open `/admin-login`.

## Scripts
`npm run dev` · `npm run build` · `npm start` · `npm run lint` · `npx vitest run`
