# Social Media Manager - X (Twitter) Integration

A minimal Express.js application with server-side rendering (EJS) that integrates with X (Twitter) API v2 to post tweets.

## Features

- OAuth 2.0 authentication with X (Twitter)
- Server-side rendering with EJS
- Post tweets via X API v2
- Simple, MVP-level implementation

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in your X API credentials:
     - `X_CLIENT_ID`: Your X API client ID
     - `X_CLIENT_SECRET`: Your X API client secret
     - `X_REDIRECT_URI`: Must match the callback URL configured in your X app settings (e.g., `http://localhost:3100/auth/callback`)
   - Configure PostgreSQL database (optional):
     - `DB_HOST`: Database host (default: localhost)
     - `DB_PORT`: Database port (default: 5432)
     - `DB_NAME`: Database name (default: social_media_manager)
     - `DB_USER`: Database user (default: postgres)
     - `DB_PASSWORD`: Database password

3. **Get X API credentials:**
   - Go to https://developer.twitter.com/en/portal/dashboard
   - Create a new app or use an existing one
   - Configure the OAuth 2.0 redirect URI to match `X_REDIRECT_URI`

4. **Set up database (optional):**
   - Make sure PostgreSQL is installed and running
   - Create a database (or use defaults
   - Run migrations:
     ```bash
     npm run migrate
     ```

5. **Run the application:**
   ```bash
   npm start
   ```

6. **Access the app:**
   - Open http://localhost:3100 in your browser
   - Click "Connect X Account" to authenticate
   - Once connected, you can post tweets

## Project Structure

```
SocialMediaManager/
├── src/
│   ├── app.js              # Main Express application
│   ├── db/
│   │   ├── config.js       # PostgreSQL connection pool
│   │   ├── migrate.js      # Migration runner
│   │   └── migrations/     # SQL migration files
│   │       └── 001_initial_schema.sql
│   ├── routers/
│   │   ├── appRouter.js    # Server-rendered pages and form handling
│   │   └── apiRouter.js    # X OAuth and tweet posting logic
│   ├── utils/
│   │   └── tokenStorage.js # Token storage utilities
│   └── views/
│       ├── index.ejs       # Homepage (connect button or tweet form)
│       ├── success.ejs     # Success page after posting tweet
│       └── error.ejs       # Error page
├── .env.example            # Environment variables template
├── package.json
└── README.md
```

## Routes

- `GET /` - Homepage (shows connect button or tweet form based on auth status)
- `GET /auth/x` - Initiates OAuth flow, redirects to X authorization
- `GET /auth/callback` - OAuth callback, exchanges code for access token
- `POST /post` - Posts a tweet to X

## Database Migrations

The project includes a PostgreSQL migration system. To run migrations:

```bash
npm run migrate
```

Migrations are stored in `src/db/migrations/` and are executed in alphabetical order. The system tracks executed migrations in a `migrations` table to prevent running the same migration twice.

## Important Notes

⚠️ **This is an MVP implementation and is NOT production-safe:**

- Access tokens are stored in memory (lost on server restart)
- No session management
- No database
- Simplified OAuth flow (should use PKCE properly in production)
- No error recovery or token refresh logic
- Single user support only

## OAuth 2.0 Flow

1. User clicks "Connect X Account" → redirected to X authorization page
2. User authorizes the app → X redirects back with authorization code
3. App exchanges code for access token → token stored in memory
4. User can now post tweets using the stored access token
