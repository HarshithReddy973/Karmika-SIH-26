// Phase 8 — Demo Data Seeder
//
// Creates realistic fake workers, customers, and bookings across a spread
// of statuses and dates, so the app doesn't look embarrassingly empty
// during judging: the Matched Workers list has real candidates, the
// Demand Forecast chart has real history to chart, and the Welfare Fund
// tab has real contributions.
//
// SAFETY: this uses the Supabase SERVICE ROLE key, which bypasses all
// normal permission checks. NEVER put this key in a VITE_-prefixed env
// var (that would ship it to every visitor's browser) and NEVER commit
// it to git. It only belongs in your local .env, read here by a plain
// Node script that never runs in the browser.
//
// Run with:  node --env-file=.env scripts/seed-demo-data.js

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '\nMissing env vars. Make sure your .env has both:\n' +
    '  VITE_SUPABASE_URL=...\n' +
    '  SUPABASE_SERVICE_ROLE_KEY=...  (Project Settings -> API -> service_role secret)\n' +
    '\nThen run: node --env-file=.env scripts/seed-demo-data.js\n'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---- Configuration - adjust to your demo city ----
const CITY_CENTER = { lat: 12.9716, lng: 77.5946 } // Bengaluru city center; change if needed
const SPREAD_KM = 6 // workers/bookings scattered within this radius
const DEMO_PASSWORD = 'Demo@12345'

const WORKER_NAMES = [
  'Ramesh Kumar', 'Suresh Babu', 'Lakshmi Devi', 'Anitha Rani', 'Manoj Gowda',
  'Venkatesh Rao', 'Kavya Shetty', 'Prakash Naik', 'Divya Reddy', 'Sunil Patil',
  'Meena Kumari', 'Ganesh Pillai',
]
const CUSTOMER_NAMES = ['Ananya Sharma', 'Rohit Verma', 'Priya Iyer', 'Arjun Nair', 'Sneha Joshi']

const SKILL_CATEGORIES = ['electrician', 'plumber', 'cleaning', 'carpenter', 'painter', 'caregiver']

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomSample(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function jitterLocation(center, maxKm) {
  // Rough conversion: 1 degree latitude ~= 111km, longitude scaled by cos(latitude)
  const kmPerDegreeLat = 111
  const kmPerDegreeLng = 111 * Math.cos((center.lat * Math.PI) / 180)
  const dLat = (Math.random() - 0.5) * 2 * (maxKm / kmPerDegreeLat)
  const dLng = (Math.random() - 0.5) * 2 * (maxKm / kmPerDegreeLng)
  return { lat: center.lat + dLat, lng: center.lng + dLng }
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// Creates the auth user, or - if this script has been run before and the
// email already exists - looks the existing user up instead of failing.
// perPage is set explicitly and high: this project has been through 8
// phases of multi-person testing, so the default 50-per-page listUsers()
// result could easily miss an existing demo account on a re-run, which
// would otherwise make this fall through to a confusing failure.
async function createAuthUser(email) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })
  if (!error) return data.user

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listErr) {
    throw new Error(`createUser failed for ${email} (${error.message}), and looking up the existing user also failed: ${listErr.message}`)
  }
  const existing = list.users.find((u) => u.email === email)
  if (existing) return existing

  // Genuinely couldn't create OR find this user - surface the real reason
  // rather than silently pressing on with a missing account.
  throw new Error(`Could not create or find auth user for ${email}: ${error.message}`)
}

// Upserts a row into public.users, THEN re-reads it back to confirm it's
// really there. This is the direct fix for the FK-violation bug: any
// customer/worker whose profile row can't be verified to exist is never
// added to the arrays used to build bookings, so bookings.customer_id /
// worker_id can never point at a row that doesn't actually exist.
async function upsertAndVerifyUser(authUser, payload) {
  const { error: upsertErr } = await supabase.from('users').upsert({ id: authUser.id, ...payload })
  if (upsertErr) {
    throw new Error(`public.users upsert failed for ${authUser.email}: ${upsertErr.message}`)
  }

  const { data: row, error: verifyErr } = await supabase
    .from('users')
    .select('id')
    .eq('id', authUser.id)
    .maybeSingle()
  if (verifyErr) {
    throw new Error(`Could not verify public.users row for ${authUser.email}: ${verifyErr.message}`)
  }
  if (!row) {
    throw new Error(
      `public.users row for ${authUser.email} (${authUser.id}) does not exist after upsert - ` +
      `the upsert reported success but the row isn't readable back. Not proceeding with this user.`
    )
  }
}

async function upsertAndVerifyWorkerProfile(authUser, payload) {
  const { error: upsertErr } = await supabase.from('worker_profiles').upsert({ user_id: authUser.id, ...payload })
  if (upsertErr) {
    throw new Error(`worker_profiles upsert failed for ${authUser.email}: ${upsertErr.message}`)
  }

  const { data: row, error: verifyErr } = await supabase
    .from('worker_profiles')
    .select('user_id')
    .eq('user_id', authUser.id)
    .maybeSingle()
  if (verifyErr) {
    throw new Error(`Could not verify worker_profiles row for ${authUser.email}: ${verifyErr.message}`)
  }
  if (!row) {
    throw new Error(`worker_profiles row for ${authUser.email} does not exist after upsert.`)
  }
}

async function main() {
  console.log('Seeding demo data...\n')

  // ---- 1. Fetch existing services (created by phase1_schema.sql) ----
  const { data: services, error: servicesErr } = await supabase.from('services').select('*')
  if (servicesErr) throw servicesErr
  if (!services || services.length === 0) {
    throw new Error('No services found - run database/phase1_schema.sql first.')
  }

  // ---- 2. Create worker accounts + profiles ----
  console.log(`Creating ${WORKER_NAMES.length} demo workers...`)
  const workers = []
  for (let i = 0; i < WORKER_NAMES.length; i++) {
    const name = WORKER_NAMES[i]
    const email = `demo.worker${i + 1}@karmika.test`

    try {
      const authUser = await createAuthUser(email)

      await upsertAndVerifyUser(authUser, {
        full_name: name,
        phone: `9${String(700000000 + i * 111).padStart(9, '0')}`,
        role: 'worker',
        language_pref: 'en',
      })

      const skills = randomSample(SKILL_CATEGORIES, Math.random() > 0.5 ? 2 : 1)
      const loc = jitterLocation(CITY_CENTER, SPREAD_KM)
      const hasEShram = Math.random() > 0.4

      await upsertAndVerifyWorkerProfile(authUser, {
        skills,
        verified: true,
        is_available: Math.random() > 0.15, // most available, a few not
        rating_avg: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        jobs_this_week: Math.floor(Math.random() * 7),
        lat: loc.lat,
        lng: loc.lng,
        location: null, // set directly below so the PostGIS column matches lat/lng
        e_shram_number: hasEShram ? `EX${1000000000 + i}` : null,
      })

      // Set the geography column directly (can't use the set_worker_location
      // RPC here since it relies on auth.uid(), which is null for a
      // service-role script with no logged-in user).
      const { error: locErr } = await supabase
        .from('worker_profiles')
        .update({ location: `SRID=4326;POINT(${loc.lng} ${loc.lat})` })
        .eq('user_id', authUser.id)
      if (locErr) throw new Error(`Setting worker location failed for ${email}: ${locErr.message}`)

      workers.push({ id: authUser.id, name, skills, lat: loc.lat, lng: loc.lng })
      console.log(`  ✓ ${name} (${skills.join(', ')})`)
    } catch (err) {
      console.error(`  ✗ ${name} (${email}) skipped: ${err.message}`)
    }
  }

  // ---- 3. Create customer accounts ----
  console.log(`\nCreating ${CUSTOMER_NAMES.length} demo customers...`)
  const customers = []
  for (let i = 0; i < CUSTOMER_NAMES.length; i++) {
    const name = CUSTOMER_NAMES[i]
    const email = `demo.customer${i + 1}@karmika.test`

    try {
      const authUser = await createAuthUser(email)

      await upsertAndVerifyUser(authUser, {
        full_name: name,
        phone: `8${String(800000000 + i * 222).padStart(9, '0')}`,
        role: 'customer',
        language_pref: 'en',
      })

      customers.push({ id: authUser.id, name })
      console.log(`  ✓ ${name}`)
    } catch (err) {
      console.error(`  ✗ ${name} (${email}) skipped: ${err.message}`)
    }
  }

  if (customers.length === 0) {
    throw new Error(
      '\nNo customers were successfully created/verified - cannot create any bookings. ' +
      'See the ✗ lines above for the exact reason each one failed.'
    )
  }
  if (workers.length === 0) {
    console.warn(
      '\n⚠️  No workers were successfully created/verified. Bookings will still be ' +
      'created, but all as unassigned (pending) since there is no worker to assign.'
    )
  }

  // ---- 4. Create bookings spread across the last 14 days with varied statuses ----
  console.log('\nCreating demo bookings...')
  const BOOKING_TARGET = 26
  // Weighted status distribution so every dashboard tab has something to show.
  const STATUS_PLAN = [
    ...Array(6).fill('pending'), // unassigned - populates Matched Workers / Job Requests
    ...Array(5).fill('accepted'),
    ...Array(3).fill('in_progress'),
    ...Array(4).fill('completed'), // awaiting payment - lets you demo Payment Summary live
    ...Array(8).fill('confirmed'), // paid - populates Welfare Fund + Forecast history
  ]

  let bookingsCreated = 0
  let bookingsFailed = 0
  let welfareRowsCreated = 0

  for (let i = 0; i < BOOKING_TARGET; i++) {
    const status = STATUS_PLAN[i % STATUS_PLAN.length]
    const service = randomChoice(services)
    const customer = randomChoice(customers)
    const daysBack = Math.floor(Math.random() * 14)
    const createdAt = daysAgo(daysBack)
    const loc = jitterLocation(CITY_CENTER, SPREAD_KM)

    const needsWorker = status !== 'pending'
    const matchingWorkers = workers.filter((w) => w.skills.includes(service.category))
    const worker = needsWorker && matchingWorkers.length > 0 ? randomChoice(matchingWorkers) : null
    // If this status needs a worker but none is available (e.g. no workers
    // were seeded, or none match this service's category), fall back to
    // 'pending' rather than inserting a row that implies an assignment
    // that doesn't exist.
    const effectiveStatus = needsWorker && !worker ? 'pending' : status

    const bookingData = {
      customer_id: customer.id,
      worker_id: worker ? worker.id : null,
      service_id: service.id,
      status: effectiveStatus,
      lat: loc.lat,
      lng: loc.lng,
      scheduled_time: createdAt.toISOString(),
      is_emergency: Math.random() > 0.85,
      created_at: createdAt.toISOString(),
      accepted_at: worker ? new Date(createdAt.getTime() + 10 * 60000).toISOString() : null,
      completed_at: ['completed', 'confirmed'].includes(effectiveStatus)
        ? new Date(createdAt.getTime() + 90 * 60000).toISOString()
        : null,
    }

    const { data: booking, error: insertErr } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()
    if (insertErr) {
      bookingsFailed++
      console.error('  ✗ booking insert failed:', insertErr.message)
      continue
    }

    // Set the geography column to match, same reasoning as for workers above.
    const { error: bookingLocErr } = await supabase
      .from('bookings')
      .update({ location: `SRID=4326;POINT(${loc.lng} ${loc.lat})` })
      .eq('id', booking.id)
    if (bookingLocErr) {
      console.warn(`  ⚠️  Booking ${booking.id} created but setting its location failed: ${bookingLocErr.message}`)
    }

    bookingsCreated++

    // Phase 7: a 'confirmed' (paid) booking should have a welfare contribution,
    // matching exactly what the real Payment Summary screen does (5% of base price).
    if (effectiveStatus === 'confirmed' && worker) {
      const amount = Math.round(service.base_price * 0.05 * 100) / 100
      const { error: welfareErr } = await supabase.from('welfare_contributions').insert({
        worker_id: worker.id,
        booking_id: booking.id,
        amount,
      })
      if (welfareErr) {
        console.warn(`  ⚠️  Booking ${booking.id} created but its welfare contribution failed: ${welfareErr.message}`)
      } else {
        welfareRowsCreated++
      }
    }
  }

  console.log(
    `  ✓ ${bookingsCreated}/${BOOKING_TARGET} bookings created` +
    (bookingsFailed > 0 ? ` (${bookingsFailed} failed - see ✗ lines above)` : '') +
    ` (${welfareRowsCreated} with welfare contributions)`
  )

  console.log('\n✅ Done seeding demo data.')
  console.log(`   Workers verified:   ${workers.length}/${WORKER_NAMES.length}`)
  console.log(`   Customers verified: ${customers.length}/${CUSTOMER_NAMES.length}`)
  console.log(`   Bookings created:   ${bookingsCreated}/${BOOKING_TARGET}`)
  console.log(`\nDemo login credentials (all use password: ${DEMO_PASSWORD}):`)
  console.log('  Workers:   demo.worker1@karmika.test  ... demo.worker12@karmika.test')
  console.log('  Customers: demo.customer1@karmika.test ... demo.customer5@karmika.test')
  console.log('\nTo re-seed with fresh random data, just run this script again -')
  console.log('existing demo accounts are reused, and it adds another batch of bookings.')
}

main().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message)
  process.exit(1)
})