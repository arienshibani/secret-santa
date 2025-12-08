# Quick Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)
- npm or yarn

## Step-by-Step Setup

### 1. Install Dependencies

If you encounter npm cache permission issues, run:
```bash
sudo chown -R $(whoami) ~/.npm
```

Then install:
```bash
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (takes a few minutes)
3. Go to SQL Editor in your Supabase dashboard
4. Copy the contents of `supabase-schema.sql` and run it
5. **Important**: Run the security fix migration `supabase-rls-fix.sql` to restrict admin access
6. Go to Project Settings > API
7. Copy your Project URL, anon/public key, and service_role key

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=your-random-secret-key-here
```

**Getting the service_role key:**
- In Supabase Dashboard > Project Settings > API
- Find the "service_role" key (NOT the anon key)
- Copy it to `SUPABASE_SERVICE_ROLE_KEY`

**Generating JWT_SECRET:**
- Run: `openssl rand -base64 32`
- Or use any strong random string (at least 32 characters)
- This is used to sign admin session tokens

### 4. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see your app!

### 5. First Time Setup

1. Go through the setup flow:
   - Enter number of participants
   - Choose contact method
   - Fill in participant details
2. After creating participants, the admin PIN will be automatically generated
3. **Important**: The PIN is a 4-digit number. You'll need to check the Supabase database to see it, or modify the code to display it on the results page.

### 6. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add the environment variables:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (private - for server-side admin operations)
   - `JWT_SECRET` (private - for session management)
4. Deploy!

## Getting the Admin PIN

After the first setup, the admin PIN is stored in the `admin_config` table in Supabase. You can:

1. Go to Supabase Dashboard > Table Editor > admin_config
2. View the PIN value
3. Or, you can modify `src/routes/results/+page.svelte` to display the PIN after setup

## Troubleshooting

### npm install fails
- Fix npm cache permissions: `sudo chown -R $(whoami) ~/.npm`
- Or use: `npm install --cache /tmp/.npm`

### Supabase connection errors
- Verify your environment variables are set correctly
- Check that the SQL schema has been run
- Ensure Row Level Security policies are set up

### Build errors
- Make sure all dependencies are installed
- Check that TypeScript is properly configured
- Verify SvelteKit version compatibility

