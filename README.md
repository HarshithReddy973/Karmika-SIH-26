# Coop Gig Services — Phase 0 & Phase 1 Starter

This is the working starter project: Vite + React app, routing, i18n (English/Hindi),
Supabase client wiring, auth-aware routing (customer/worker/admin), and the full
Phase 1 database schema.

## What's already done for you
- Working React app scaffolded (Vite) with all Phase 1 packages installed
- Login/Signup page wired to real Supabase Auth calls
- Role-based routing (customer -> /customer, worker -> /worker, admin -> /admin)
- `useAuth` hook that gives any page the logged-in user + role
- Multilingual setup (English + Hindi) with a working translation system
- Full SQL schema for all Phase 1 tables (`database/phase1_schema.sql`)
- Verified the whole app builds with zero errors (`npm run build` passes)

## What YOU need to do (step by step)

### Step 1 - Create your Supabase project (5 min)
1. Go to https://supabase.com -> sign up (free, GitHub login is easiest) -> "New Project"
2. Pick any name/region/password (save the DB password somewhere safe)
3. Wait ~2 minutes for it to finish provisioning

### Step 2 - Run the database schema (2 min)
1. In your Supabase project, go to the **SQL Editor** tab (left sidebar)
2. Click "New Query"
3. Open `database/phase1_schema.sql` from this project, copy ALL of it, paste it in
4. Click "Run" - you should see "Success. No rows returned"
5. Go to the **Table Editor** tab - you should now see `users`, `services`,
   `worker_profiles`, `bookings`, `ratings`, `welfare_contributions` tables,
   and `services` should already have 6 sample rows in it

### Step 3 - Turn off email confirmation (for hackathon speed) (1 min)
1. In Supabase: **Authentication** -> **Providers** -> **Email**
2. Turn OFF "Confirm email" (so signup logs someone in immediately -
   much easier for demos and testing; you can turn it back on for
   production later)

### Step 4 - Connect your app to your Supabase project (2 min)
1. In Supabase: **Project Settings** -> **API**
2. Copy the "Project URL" and the "anon public" key
3. In this project folder, run: `cp .env.example .env`
4. Open `.env` and paste in your two values

### Step 5 - Run it locally
```
npm install
npm run dev
```
Open the printed localhost URL. You should see the Login/Signup page.

### Step 6 - Test the full auth flow
1. Sign up as a **customer** - you should land on a page saying
   "Welcome, [your name]" with "Role confirmed: customer"
2. Log out, sign up again with a different email as a **worker** -
   you should land on the Worker Home stub instead
3. To test the admin view: sign up normally, then go to Supabase's
   Table Editor -> `users` table -> find your row -> manually change
   `role` to `admin` -> refresh the app (or log out/in) -> you'll now
   land on the Admin Home stub

If all three of those work, **Phase 0 and Phase 1 are fully done and verified.**

### Step 7 - Push to GitHub + deploy (do this now, not later)
1. Create a new empty repo on GitHub
2. `git init && git add . && git commit -m "Phase 0-1: setup, auth, schema"`
3. `git remote add origin <your-repo-url> && git push -u origin main`
4. Go to https://vercel.com -> sign up with GitHub -> "Add New Project" ->
   import this repo
5. Important: In Vercel's project settings -> Environment Variables,
   add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the same
   values from your `.env` (Vercel won't have your local .env file)
6. Deploy - you now have a live URL you can share with your team and
   later with judges

## What's next (Phase 2)
Once the above all works, come back and we'll build: Browse Services page,
Book Service form with the map, and the real-time booking flow.

## Folder guide
```
src/
  pages/
    LoginSignup.jsx      <- real auth, done
    HomeRedirect.jsx     <- routes by role, done
    CustomerHome.jsx     <- stub, Phase 2 builds this out
    WorkerHome.jsx       <- stub, Phase 2 builds this out
    AdminHome.jsx        <- stub, Phase 4 builds this out
  components/
    ProtectedRoute.jsx   <- guards routes by login+role
  lib/
    supabaseClient.js    <- the one Supabase connection, reused everywhere
    useAuth.js           <- hook: get current user/role anywhere
  i18n/
    en.json / hi.json    <- add more languages by copying this pattern
    index.js

database/
  phase1_schema.sql        <- run this once in Supabase SQL Editor
```
