# Webskill India House — order-taking website

A responsive, Hulu-inspired dark green website for your website-design business. Customer enquiries are saved to a local SQLite database, and you can review/update them in a password-protected admin dashboard.

## Features
- Responsive landing page with services, pricing starting point, and project enquiry form
- SQLite database automatically created at `data/orders.sqlite`
- Server-side validation and basic rate limits
- Admin dashboard at `/admin` to view enquiries and update order status
- Honeypot field to filter simple form bots
- No payment details are collected

## Requirements
Install Node.js 18 or newer.

## Run locally
1. Extract this ZIP and open the folder in a terminal.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env`.
4. Set a strong `ADMIN_PASSWORD` and a long random `SESSION_SECRET` in `.env`.
5. Start:
   ```bash
   npm start
   ```
6. Open `http://localhost:3000`.
7. Open `http://localhost:3000/admin` to sign in and view customer enquiries.

The database is created automatically on first run. Back up the `data/` folder to preserve order records.

## Deploying online
Deploy to a Node.js host that supports persistent disk storage (for example, a VPS or a platform with a persistent volume). Make sure the `data/` directory persists between deployments, set `NODE_ENV=production`, set `PORT` if required by the host, and configure strong `ADMIN_PASSWORD` and `SESSION_SECRET` environment variables. Use HTTPS in production.

**Important:** Some serverless hosts have ephemeral filesystems. If the database file is not on persistent storage, order records may disappear after a restart/redeploy. For multi-instance or serverless deployments, use a managed database such as PostgreSQL instead of local SQLite.

## Payments and notifications
This starter accepts project enquiries and stores them in the database; it does not charge customers. To accept online payments, connect a provider such as Razorpay or Stripe and configure its secret keys on the server. Do not put payment secrets in browser JavaScript. Email/WhatsApp notifications also require a provider/API configuration.

## Before publishing
- Replace sample copy/pricing to match your actual offer.
- Add your real business contact information, terms, and privacy policy.
- Test the form and admin dashboard on the actual hosting platform.
- Never use the default admin password in production.
