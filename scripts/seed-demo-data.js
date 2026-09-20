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

async function createAuthUser(email) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })
  if (error) {
    // If the demo has been seeded before, the user may already exist -
    // look them up instead of failing the whole script.
    if (error.message?.toLowerCase().includes('already') ) {
      const { data: list } = await supabase.auth.admin.listUsers()
      const existing = list.users.find((u) => u.email === email)
      if (existing) return existing
    }
    throw error
  }
  return data.user
}

async function main() {
  console.log('Seeding demo data...\n')

  // ---- 1. Fetch existing services (created by phase1_schema.sql) ----
  const { data: services, error: servicesErr } = await supabase.from('services').select('*')
  if (servicesErr) throw servicesErr
  if (!services || services.length === 0) {
    throw new Error('No services found - run database/phase1_schema.sql first.')
  }
  const servicesByCategory = Object.fromEntries(services.map((s) => [s.category, s]))

  // ---- 2. Create worker accounts + profiles ----
  console.log(`Creating ${WORKER_NAMES.length} demo workers...`)
  const workers = []
  for (let i = 0; i < WORKER_NAMES.length; i++) {
    const name = WORKER_NAMES[i]
    const email = `demo.worker${i + 1}@karmika.test`
    const authUser = await createAuthUser(email)

    await supabase.from('users').upsert({
      id: authUser.id,
      full_name: name,
      phone: `9${String(700000000 + i * 111).padStart(9, '0')}`,
      role: 'worker',
      language_pref: 'en',
    })

    const skills = randomSample(SKILL_CATEGORIES, Math.random() > 0.5 ? 2 : 1)
    const loc = jitterLocation(CITY_CENTER, SPREAD_KM)
    const hasEShram = Math.random() > 0.4

    await supabase.from('worker_profiles').upsert({
      user_id: authUser.id,
      skills,
      verified: true,
      is_available: Math.random() > 0.15, // most available, a few not
      rating_avg: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      jobs_this_week: Math.floor(Math.random() * 7),
      lat: loc.lat,
      lng: loc.lng,
      location: null, // set via RPC below so PostGIS geography column matches lat/lng
      e_shram_number: hasEShram ? `EX${1000000000 + i}` : null,
    })

    // Set the geography column directly (can't use the set_worker_location
    // RPC here since it relies on auth.uid(), which is null for a
    // service-role script with no logged-in user).
    await supabase
      .from('worker_profiles')
      .update({
        location: `SRID=4326;POINT(${loc.lng} ${loc.lat})`,
      })
      .eq('user_id', authUser.id)

    workers.push({ id: authUser.id, name, skills, lat: loc.lat, lng: loc.lng })
    console.log(`  ✓ ${name} (${skills.join(', ')})`)
  }

  // ---- 3. Create customer accounts ----
  console.log(`\nCreating ${CUSTOMER_NAMES.length} demo customers...`)
  const customers = []
  for (let i = 0; i < CUSTOMER_NAMES.length; i++) {
    const name = CUSTOMER_NAMES[i]
    const email = `demo.customer${i + 1}@karmika.test`
    const authUser = await createAuthUser(email)

    await supabase.from('users').upsert({
      id: authUser.id,
      full_name: name,
      phone: `8${String(800000000 + i * 222).padStart(9, '0')}`,
      role: 'customer',
      language_pref: 'en',
    })
    customers.push({ id: authUser.id, name })
    console.log(`  ✓ ${name}`)
  }

  // ---- 4. Create bookings spread across the last 14 days with varied statuses ----
  console.log('\nCreating demo bookings...')
  const BOOKING_COUNT = 26
  // Weighted status distribution so every dashboard tab has something to show.
  const STATUS_PLAN = [
    ...Array(6).fill('pending'), // unassigned - populates Matched Workers / Job Requests
    ...Array(5).fill('accepted'),
    ...Array(3).fill('in_progress'),
    ...Array(4).fill('completed'), // awaiting payment - lets you demo Payment Summary live
    ...Array(8).fill('confirmed'), // paid - populates Welfare Fund + Forecast history
  ]

  let welfareRowsCreated = 0

  for (let i = 0; i < BOOKING_COUNT; i++) {
    const status = STATUS_PLAN[i % STATUS_PLAN.length]
    const service = randomChoice(services)
    const customer = randomChoice(customers)
    const daysBack = Math.floor(Math.random() * 14)
    const createdAt = daysAgo(daysBack)
    const loc = jitterLocation(CITY_CENTER, SPREAD_KM)

    const needsWorker = status !== 'pending'
    const matchingWorkers = workers.filter((w) => w.skills.includes(service.category))
    const worker = needsWorker && matchingWorkers.length > 0 ? randomChoice(matchingWorkers) : null

    const bookingData = {
      customer_id: customer.id,
      worker_id: worker ? worker.id : null,
      service_id: service.id,
      status,
      lat: loc.lat,
      lng: loc.lng,
      scheduled_time: createdAt.toISOString(),
      is_emergency: Math.random() > 0.85,
      created_at: createdAt.toISOString(),
      accepted_at: worker ? new Date(createdAt.getTime() + 10 * 60000).toISOString() : null,
      completed_at: ['completed', 'confirmed'].includes(status)
        ? new Date(createdAt.getTime() + 90 * 60000).toISOString()
        : null,
    }

    const { data: booking, error: insertErr } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()
    if (insertErr) { console.error('  ✗ booking insert failed:', insertErr.message); continue }

    // Set the geography column to match, same reasoning as for workers above.
    await supabase
      .from('bookings')
      .update({ location: `SRID=4326;POINT(${loc.lng} ${loc.lat})` })
      .eq('id', booking.id)

    // Phase 7: a 'confirmed' (paid) booking should have a welfare contribution,
    // matching exactly what the real Payment Summary screen does (5% of base price).
    if (status === 'confirmed' && worker) {
      const amount = Math.round(service.base_price * 0.05 * 100) / 100
      await supabase.from('welfare_contributions').insert({
        worker_id: worker.id,
        booking_id: booking.id,
        amount,
      })
      welfareRowsCreated++
    }
  }
  console.log(`  ✓ ${BOOKING_COUNT} bookings created (${welfareRowsCreated} with welfare contributions)`)

  console.log('\n✅ Done seeding demo data.')
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
