# Karmika --- Cooperative Gig Services Platform

Karmika is a cooperative gig-services platform designed to connect
customers with verified local service workers such as electricians,
plumbers, cleaners, carpenters, painters, and caregivers.

The platform focuses on transparent worker selection, location-based
matching, fair job distribution, digital booking and payment workflows,
multilingual support, and worker welfare.

## Core Features

### Customer

-   Sign up / login
-   Browse available services
-   Create service bookings
-   Select service location using the map
-   Choose date/time or mark a request as an emergency
-   Discover nearby verified workers
-   View worker skills, ratings, and reviews
-   Select a worker from matched candidates
-   Track booking status
-   View itemized payment summaries
-   Mock digital payment flow
-   Rate completed services
-   English and Hindi language support

### Worker

-   Worker registration and profile setup
-   Skill-based profile
-   Location registration
-   Verification status
-   Availability status
-   Receive nearby job requests
-   Accept jobs
-   Update job status
-   Add final charges including base price, parts, and extra labour
-   View ratings and welfare information

### Admin

-   Admin dashboard
-   Worker verification queue
-   Booking overview
-   Services management
-   Worker welfare overview
-   Demand forecasting
-   Platform-level operational information
-   Multilingual interface

### Smart Matching

Karmika uses location and skill information to identify suitable workers
for a booking. The matching flow considers service/skill compatibility,
verification, availability, geographic proximity, rating, and
workload/fairness-related factors. PostGIS geography data is used for
location-based matching.

### Transparent Payments

The payment workflow provides an itemized summary containing base
service price, parts/material charges, additional labour charges, and
total amount. The current payment implementation is a mock payment flow
intended for demonstration.

### Worker Welfare

For confirmed/paid demo bookings, a welfare contribution is recorded as
5% of the base service price.

### Demand Forecasting

The admin dashboard includes demand-forecasting functionality based on
booking history, allowing the platform to visualize service demand
trends.

### Multilingual Support

The application currently includes English and Hindi, with the
translation structure allowing additional languages to be added.

## Application Flow

``` text
Customer
   ↓
Browse Services
   ↓
Create Booking
   ↓
Location + Service Matching
   ↓
Nearby Verified Workers
   ↓
Worker Applications
   ↓
Customer Selects Worker
   ↓
Booking Accepted
   ↓
Worker Completes Job
   ↓
Itemized Charges
   ↓
Payment Summary
   ↓
Mock Payment
   ├──→ 5% Welfare Contribution
   ↓
Customer Rating
   ↓
Worker Rating Updated
```

## Technology Stack

### Frontend

-   React
-   Vite
-   JavaScript
-   Leaflet / map-based location UI
-   React component architecture
-   i18n translation files

### Backend / Database

-   Supabase
-   PostgreSQL
-   Supabase Authentication
-   PostGIS for geographic location/matching
-   Supabase database security policies

### Deployment

-   Vercel
-   GitHub

### Development

-   Node.js
-   npm
-   Git / GitHub

## Project Structure

``` text
Karmika/
├── database/
│   ├── phase1_schema.sql
│   ├── phase3_matching_functions.sql
│   └── phase7_welfare.sql
├── scripts/
│   └── seed-demo-data.js
├── src/
│   ├── components/
│   │   ├── admin/
│   │   └── ...
│   ├── i18n/
│   │   ├── en.json
│   │   └── hi.json
│   ├── lib/
│   │   ├── forecast.js
│   │   ├── payment.js
│   │   └── ...
│   ├── pages/
│   │   ├── AdminDashboard.jsx
│   │   ├── BookService.jsx
│   │   ├── BookingTracker.jsx
│   │   ├── BrowseServices.jsx
│   │   ├── MatchedWorkers.jsx
│   │   ├── PaymentSummary.jsx
│   │   ├── WorkerJobRequests.jsx
│   │   └── WorkerProfileSetup.jsx
│   ├── App.jsx
│   └── ...
├── .env.example
├── package.json
└── README.md
```

## Local Setup

### 1. Clone the repository

``` bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Karmika
```

### 2. Install dependencies

``` bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file:

``` env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never commit `.env` to GitHub.

## Database Setup

Run the required SQL files in the Supabase SQL Editor in the appropriate
phase order, including the database files present in the repository such
as:

``` text
database/phase1_schema.sql
database/phase3_matching_functions.sql
database/phase7_welfare.sql
```

## Demo Data Seeder

Karmika includes a local demo-data seeder for presentations and judging.
It creates 12 demo workers, 5 demo customers, 26 demo bookings with
multiple statuses, worker locations and skills, and welfare contribution
records for eligible bookings.

The seeder requires a Supabase service-role key because it creates demo
authentication users and writes privileged database records.

Add it only to your local `.env`:

``` env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Do NOT use a `VITE_` prefix for this variable. Do NOT put it in frontend
code, commit it to GitHub, or expose it to visitors.

Run:

``` bash
npm run seed
```

The expected package script is:

``` json
"seed": "node --env-file=.env scripts/seed-demo-data.js"
```

## Demo Credentials

The demo seeder uses the following password for all generated demo
accounts:

``` text
Demo@12345
```

### Workers

  Name            Email
  --------------- ----------------------------
  Ramesh Kumar    demo.worker1@karmika.test
  Suresh Babu     demo.worker2@karmika.test
  Lakshmi Devi    demo.worker3@karmika.test
  Anitha Rani     demo.worker4@karmika.test
  Manoj Gowda     demo.worker5@karmika.test
  Venkatesh Rao   demo.worker6@karmika.test
  Kavya Shetty    demo.worker7@karmika.test
  Prakash Naik    demo.worker8@karmika.test
  Divya Reddy     demo.worker9@karmika.test
  Sunil Patil     demo.worker10@karmika.test
  Meena Kumari    demo.worker11@karmika.test
  Ganesh Pillai   demo.worker12@karmika.test

### Customers

  Name            Email
  --------------- -----------------------------
  Ananya Sharma   demo.customer1@karmika.test
  Rohit Verma     demo.customer2@karmika.test
  Priya Iyer      demo.customer3@karmika.test
  Arjun Nair      demo.customer4@karmika.test
  Sneha Joshi     demo.customer5@karmika.test

## Run the Application

``` bash
npm run dev
```

Production build:

``` bash
npm run build
```

Preview the production build:

``` bash
npm run preview
```

## Demo / Judging Flow

1.  Login as a customer.
2.  Browse available services.
3.  Create a booking with a location.
4.  View nearby matched workers.
5.  Inspect worker profiles, skills, and ratings.
6.  Select a worker.
7.  Login as the worker.
8.  Accept the job request.
9.  Start and complete the job.
10. Add itemized charges.
11. Return to the customer account.
12. Open the Payment Summary.
13. Complete the mock payment.
14. Show the welfare contribution.
15. Rate the worker.
16. Open the Admin Dashboard.
17. Demonstrate bookings, worker verification, welfare information, and
    demand forecasting.

## Innovation & Uniqueness

-   **Customer-driven worker selection** instead of silent
    auto-assignment.
-   **Skill + location based matching** to connect customers with
    relevant nearby workers.
-   **Transparent itemized pricing** for base service, parts, and
    additional labour.
-   **Integrated worker welfare fund** with a contribution linked to
    completed/paid work.
-   **Cooperative-first platform design** combining digital services
    with worker-focused benefits.

## Future Scope

-   Real payment gateway integration
-   Real-time push notifications
-   Advanced demand forecasting using historical platform data
-   Automated identity/document verification
-   More Indian regional languages
-   Worker earnings and analytics dashboard
-   Production-grade dispute resolution
-   Fraud and abuse detection
-   Native Android/iOS application
-   Expanded cooperative governance features

## Security Notes

-   `.env` files must remain local and must not be committed.
-   Supabase service-role credentials must never be exposed to the
    browser.
-   Frontend variables should use only the required `VITE_`
    configuration.
-   Database access should follow the project's Supabase security
    configuration.
-   Demo credentials are intended only for controlled demonstrations.

## Project Status

Karmika currently includes the core customer, worker, admin, matching,
booking, payment-summary, welfare, multilingual, and demo-data workflows
required for project demonstration.

The payment flow is currently implemented as a mock payment rather than
a live financial transaction.

## Team

**Karmika --- SIH 2026**

A cooperative gig-services platform for household and community
services.
