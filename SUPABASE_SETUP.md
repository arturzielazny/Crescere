# Supabase Setup Guide

## Local Development

### Prerequisites
- Docker Desktop installed and running

### Start Local Supabase

```bash
# Start all Supabase services (first time takes a few minutes)
supabase start

# View running services and credentials
supabase status

# Stop when done
supabase stop
```

### Local URLs
After running `supabase start`, you'll have:
- **API URL**: http://127.0.0.1:54321
- **Studio (DB UI)**: http://127.0.0.1:54323
- **Inbucket (Email testing)**: http://127.0.0.1:54324

### Environment Variables
The `.env.local` file is pre-configured for local development. The default anon key works with local Supabase.

### Run the App
```bash
npm run dev
# Open http://localhost:5173
```

## Testing

### Unit Tests (no Docker needed)
```bash
npm run test        # Run once
npm run test:watch  # Watch mode
```

### Integration Tests (requires Docker + Supabase)
```bash
supabase start
npm run test:integration
```

### All Tests
```bash
npm run test:all
```

## Database Schema

The schema is defined in `supabase/migrations/20250201000000_initial_schema.sql`:

- **children**: User's children profiles
- **measurements**: Growth measurements for each child
- **user_preferences**: Active child selection

All tables have Row Level Security (RLS) enabled - users can only access their own data.

## Production Deployment

### 1. Create Supabase Project
1. Go to https://app.supabase.com
2. Create a new project
3. Note your project URL and anon key

### 2. Run Migrations
```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 3. Enable Auth Providers
In Supabase Dashboard → Authentication → Providers:
- Enable **Anonymous Sign-ins**
- Enable **Email** (magic link / passwordless enabled by default)

### 4. Set Environment Variables
For GitHub Pages deployment, update `.github/workflows/deploy.yml`:

```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

Add these secrets in GitHub: Settings → Secrets → Actions

### 5. Configure Auth Redirect URLs
In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://yourusername.github.io/Crescere`
- Redirect URLs: Add the same URL

## Architecture

```
User opens app
     │
     ├─► No session? → Sign in anonymously
     │
     ├─► Has localStorage data? → Migrate to Supabase
     │
     └─► Load data from Supabase → Render UI

On save/edit
     │
     ├─► Update UI immediately (optimistic)
     │
     └─► Sync to Supabase in background
            ├─► Success: done
            └─► Error: rollback UI, show error
```

## Files Overview

| File | Purpose |
|------|---------|
| `src/lib/supabaseClient.js` | Supabase client initialization |
| `src/lib/api.js` | CRUD operations |
| `src/lib/migrate.js` | localStorage → Supabase migration |
| `src/stores/authStore.js` | Auth state management |
| `src/stores/childStore.js` | Data store with sync support |
| `supabase/config.toml` | Local Supabase configuration |
| `supabase/migrations/` | Database schema |
