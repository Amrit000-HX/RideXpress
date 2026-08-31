# 🚗 RideXpress — Smart Urban Mobility & Parcel Delivery Platform

<div align="center">

![RideXpress Banner](./src/assets/hero.png)

**A full-stack, cloud-native web platform unifying on-demand ride-hailing and express parcel delivery.**

![React](https://img.shields.io/badge/React_18-TypeScript-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-v22-339933?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)
![Express](https://img.shields.io/badge/Express.js-4.x-000000?logo=express)
![Leaflet](https://img.shields.io/badge/Leaflet.js-OpenStreetMap-199900?logo=leaflet)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.x-FF0055?logo=framer)

</div>

---

## 📌 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Live Demo & Repository](#2-live-demo--repository)
3. [Detailed Tech Stack](#3-detailed-tech-stack)
4. [Project Architecture](#4-project-architecture)
5. [Key Features](#5-key-features)
6. [API Endpoint Reference](#6-api-endpoint-reference)
7. [How Backend Functions Work](#7-how-backend-functions-work)
8. [Database Schema](#8-database-schema)
9. [Environment Configuration](#9-environment-configuration)
10. [Local Setup & Installation](#10-local-setup--installation)
11. [Current Limitations](#11-current-limitations)
12. [Future Scope & Roadmap](#12-future-scope--roadmap)

---

## 1. Project Overview

**RideXpress** is a modern, full-stack ride-hailing and express parcel delivery web application built for the MERN (MongoDB, Express, React, Node.js) stack. It provides an end-to-end digital experience for three types of users:

| Role | Access |
|---|---|
| **Customer** | Book rides, view map, confirm bookings, receive receipts |
| **Driver / Employee** | Register vehicle and profile via multi-step onboarding form, access employee dashboard |
| **Admin** | Manage users, employees, and system via seeded admin accounts |

### Core Capabilities:
- 🛵 **8 Vehicle Fleet Booking** — Scooty, Moto, Auto, Standard Hatchback, Sedan, Jeep, XL SUV, and more.
- 🗺️ **Full-Screen Interactive Map** — GPS auto-detect, draggable pins, address autocomplete, live OSRM driving routes.
- 💰 **Dynamic Fare Engine** — Real-time per-km cost calculated from actual driving distance returned by OSRM.
- 🔐 **2-Step Email OTP Authentication** — Password verification followed by a timed 6-digit code sent to the user's inbox via Gmail SMTP.
- 🧾 **Animated Digital Bill & Receipt** — Post-ride invoice with itemized fare, driver assignment, and Start-Ride PIN.
- 📦 **Parcel Delivery Module** — Schedule door-to-door courier bookings with auto-generated tracking IDs.

---

## 2. Live Demo & Repository

| Resource | URL |
|---|---|
| **GitHub Repository** | [github.com/Amrit000-HX/RideXpress](https://github.com/Amrit000-HX/RideXpress) |
| **Local Frontend** | `http://localhost:5173` |
| **Local API** | `http://localhost:5000/api` |

### Demo Accounts (Live MongoDB Atlas):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ridexpress.com` | `Admin@12345` |
| Customer | `user@ridexpress.com` | `User@12345` |
| Driver | `driver@ridexpress.com` | `Driver@12345` |

---

## 3. Detailed Tech Stack

### 🖥️ Frontend

#### React 18 (TypeScript) + Vite
- **What it does:** Powers the entire user interface. Every page — from the home screen to the booking map — is a React component.
- **Why TypeScript:** Adds strict type-checking to prevent runtime errors. For example, the `RideReceiptData` interface in `RideReceipt.tsx` enforces that every booking passed to the receipt page has required fields like `bookingId`, `pickupAddress`, `totalFare`, etc.
- **Vite:** Ultra-fast build tool and development server. Compiles the entire project in under 2 seconds with Hot Module Replacement (HMR) so changes appear instantly in the browser.
- **Example in RideXpress:** When a customer clicks "Book Scooty" and the full-screen map appears, that is a React state transition — the `BookRide.tsx` component switches `selected` state from `null` to the Scooty vehicle object, which triggers the `<MapPicker />` component to mount via `AnimatePresence`.

#### Framer Motion 12
- **What it does:** Provides all animation and physics-based transitions throughout the site.
- **How it works:** Instead of CSS keyframe animations, Framer Motion uses a declarative API. You set `initial`, `animate`, and `exit` states, and Framer calculates smooth interpolations between them.
- **Examples in RideXpress:**
  - **Vehicle Selector Cards:** Each vehicle (Scooty, Car, SUV) stacks on top of the previous using `useMotionValue` + `useTransform` to create a scroll-linked z-index and scale parallax effect.
  - **Verification Tick on Ride Receipt:** The SVG checkmark circle path draws itself using `pathLength: 0 → 1` animation triggered after booking confirmation.
  - **OTP Input Screen Transition:** The login page transitions from the password form to the OTP digit grid using `AnimatePresence` with an opacity + slide animation.

#### Leaflet.js + React-Leaflet
- **What it does:** Renders the interactive map for ride bookings at 100% free of charge.
- **How it works:** Leaflet.js is a lightweight, open-source JavaScript mapping library. React-Leaflet wraps it into React components (`<MapContainer>`, `<TileLayer>`, `<Marker>`, `<Polyline>`).
- **Why not Google Maps?** Google Maps Platform charges per API call — for a student project and emerging transport businesses, this is cost-prohibitive. Leaflet + OpenStreetMap is completely free.
- **Example in RideXpress:** In `MapPicker.tsx`, when the user clicks "📍 Use My Location", the browser's `navigator.geolocation.getCurrentPosition()` API returns GPS coordinates. These coordinates are passed to the Leaflet map's `setView()` function, and a Nominatim API call reverse-geocodes the latitude/longitude into a readable address (e.g., "MG Road, Sector 3, Gurgaon") which appears in the pickup bar.

#### Nominatim API (OpenStreetMap Geocoding)
- **What it does:** Converts raw GPS coordinates into human-readable addresses (reverse geocoding) and converts text search queries into lat/lng coordinates (forward geocoding).
- **Example in RideXpress:** When a user types "Kohinoor Mall" in the drop-point search bar, Nominatim returns a list of matching places with their coordinates. The user picks one, and the drop pin moves to that location on the map.

#### OSRM (Open Source Routing Machine)
- **What it does:** Calculates the actual road-driving distance (in km) and estimated time between two geographic coordinates — similar to what Google Maps does for route calculation.
- **Example in RideXpress:** After both pickup and drop pins are placed on the map, `MapPicker.tsx` fires a fetch request to the public OSRM API:
  ```
  GET https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}
  ```
  OSRM returns the trip distance (e.g., `6.8 km`) and duration. This distance is multiplied by the selected vehicle's per-km rate to produce the live fare shown at the bottom of the map.

#### Lucide React (Icon Library)
- **What it does:** Provides all UI icons — arrows, locks, maps, phones, stars, printers — as React SVG components.
- **Example in RideXpress:** The `<KeyRound>` icon appears next to the 4-digit Start Ride PIN on the receipt. The `<Star>` icon with `fill="#f59e0b"` renders the golden rating star next to the driver's rating (e.g., ★ 4.94).

---

### 🖧 Backend

#### Node.js + Express.js
- **What it does:** Runs the RESTful API server on Port 5000. Every request from the React frontend (login, register, book ride, get profile) hits an Express route handler.
- **How it works:** Express uses a middleware-chain pattern. Each API request passes through:
  1. **CORS Middleware** → Allows only `http://localhost:5173` to call the API.
  2. **JSON Parser** → Converts the JSON request body into a JavaScript object.
  3. **Auth Middleware** (for protected routes) → Extracts and verifies the JWT token from the `Authorization: Bearer <token>` header.
  4. **Route Handler** → The specific controller function that handles the business logic.
  5. **Response** → JSON object sent back to the frontend.

#### Bcryptjs (Password Hashing)
- **What it does:** Securely hashes user passwords before saving them to MongoDB so the raw password is never stored anywhere.
- **How it works:** Bcrypt applies 10 "salt rounds" of cryptographic hashing. The same plaintext password will produce a different hash each time (due to the random salt), making rainbow table attacks impossible.
- **Example in RideXpress:** When `amritacharya2007@gmail.com` registers with password `Amrit@2007`, the actual string stored in MongoDB Atlas is something like:
  ```
  $2a$10$7Kn5xMHzE6XGq3jJKhTXnOr8mK1gDpwT4yCqKmN9rV0Z2aO...
  ```
  During login, `bcrypt.compare("Amrit@2007", storedHash)` returns `true` to validate the login.

#### JWT (JSON Web Tokens)
- **What it does:** After successful login (OTP verified), the backend generates a signed JWT token containing `{ id: user._id, role: "user" }`. This token is stored in the browser and sent with every subsequent API request to identify the logged-in user.
- **How it works:** The token has 3 parts (Header.Payload.Signature) and is signed with `JWT_SECRET` from `.env`. No password or session is stored on the server — the token itself is the proof of authentication.
- **Expiry:** Tokens expire after `7d` (7 days) configured in `.env`.
- **Example in RideXpress:** When a logged-in user visits `/book`, the `ProtectedRoute` component in React checks `AuthContext` for a valid token. If present, the page loads. If absent or expired, the user is redirected to `/login`.

#### Nodemailer (Gmail SMTP Email)
- **What it does:** Sends the 6-digit OTP verification code to the user's email inbox using Google's Gmail SMTP servers.
- **How it works:** The backend creates a Nodemailer transporter authenticated with a Gmail App Password (a 16-character code generated from Google Account settings, separate from the regular Gmail password). When `loginRequest` is called, it calls `sendOtpEmail({ to, otp, name })` which dispatches a branded HTML email.
- **Example in RideXpress:** When `amritacharya2007@gmail.com` submits their login credentials, the backend sends an email with subject `"Your RideXpress Verification Code: 839201"` and a styled HTML card showing the 6-digit code, sent from `adilaptop2007@gmail.com` (the SMTP sender account).

---

### ☁️ Database

#### MongoDB Atlas + Mongoose ODM
- **What it does:** MongoDB is the cloud NoSQL database. Mongoose adds schema validation, model creation, and query convenience methods on top of MongoDB's native driver.
- **How it works:** Documents are stored as JSON-like BSON objects inside Collections. Each Collection corresponds to a Mongoose Model.
- **Live Atlas Cluster:** `cluster0.fdxwawa.mongodb.net` — Database name: `ridexpress`
- **Active Collections:**
  | Collection | Purpose |
  |---|---|
  | `users` | Customer and admin accounts |
  | `employees` | Driver/rider accounts with vehicle categories |
  | `otps` | Temporary 10-minute OTP codes (auto-deleted by TTL index) |
  | `rides` | Ride bookings created via the map |

#### MongoDB TTL Index (Time-To-Live) on OTPs
- **What it does:** Automatically deletes OTP documents from the `otps` collection after exactly 10 minutes — no cron job or manual cleanup needed.
- **How it works:** The `Otp` Mongoose schema defines `{ expires: 600 }` on a `createdAt` Date field with `index: { expires: 600 }`. MongoDB's background TTL Monitor process scans periodically and removes expired documents.
- **Example in RideXpress:** At `00:10:00`, the user requests an OTP. The document is created at that timestamp. At `00:20:00`, MongoDB automatically removes it. If the user enters the OTP at `00:21:00`, the `Otp.findOne()` query returns `null` → the backend responds with "Invalid or expired verification code."

---

## 4. Project Architecture

```
RideXpress/
├── ridexpress-app/
│   ├── src/                          # React Frontend (TypeScript)
│   │   ├── App.tsx                   # Root router — all page routes
│   │   ├── pages/
│   │   │   ├── Home.tsx              # Landing page with features & vehicle showcase
│   │   │   ├── BookRide.tsx          # Stacking vehicle cards + Map Picker
│   │   │   ├── RideReceipt.tsx       # Animated bill & verification tick
│   │   │   ├── LoginPage.tsx         # 2-Step OTP authentication UI
│   │   │   ├── RegisterPage.tsx      # Customer registration form
│   │   │   ├── EmployeeForm.tsx      # Multi-step driver onboarding wizard
│   │   │   ├── EmployeeDashboard.tsx # Driver's trip management workspace
│   │   │   ├── DeliverParcel.tsx     # Parcel booking landing page
│   │   │   └── ParcelForm.tsx        # Parcel delivery scheduling form
│   │   ├── components/
│   │   │   ├── Navbar.tsx            # Sticky header with auth-aware links
│   │   │   ├── Footer.tsx            # Site footer with quick links
│   │   │   ├── ProtectedRoute.tsx    # RBAC route guard wrapper
│   │   │   └── MapPicker/
│   │   │       ├── MapPicker.tsx     # Full-screen Leaflet map with GPS + OSRM
│   │   │       └── MapPicker.css     # Floating control styling
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx       # Global auth state — user, token, login/logout
│   │   └── services/
│   │       ├── api.ts                # Axios instance with base URL + interceptors
│   │       └── authService.ts        # API calls: loginRequest, verifyOtp, register
│   │
│   └── backend/                      # Node.js + Express API Server
│       ├── app.js                    # Express app setup, middleware, route mounting
│       ├── server.js                 # HTTP server start, MongoDB Atlas connection
│       ├── .env                      # Environment secrets (never commit)
│       └── src/
│           ├── models/
│           │   ├── User.js           # Customer schema (name, email, passwordHash, role)
│           │   ├── Employee.js       # Driver schema (employeeId, vehicleCategory, etc.)
│           │   ├── Otp.js            # Temporary OTP schema with TTL index
│           │   └── Ride.js           # Ride booking schema
│           ├── controllers/
│           │   ├── authController.js # registerUser, login, loginRequest, verifyOtp
│           │   └── rideController.js # createRide, getMyRides, getAvailableRides
│           ├── routes/
│           │   ├── authRoutes.js     # /api/auth/* endpoint definitions
│           │   └── rideRoutes.js     # /api/rides/* endpoint definitions
│           ├── middleware/
│           │   ├── authMiddleware.js # JWT token verification for protected routes
│           │   └── roleMiddleware.js # RBAC — restrict by role (user/employee/admin)
│           └── utils/
│               ├── generateToken.js  # JWT sign & return
│               └── emailService.js   # Nodemailer Gmail SMTP transporter + HTML template
```

---

## 5. Key Features

### 🗺️ Feature 1: Full-Window Interactive Map Booking
**Page:** `/book` → Select Vehicle → Map opens in 100% viewport.

**User flow:**
1. Customer scrolls through stacking vehicle cards (Scooty, Car, Jeep, etc.).
2. Selects a vehicle → Full-screen map slides in with a spring animation.
3. Floating top bar: Back button, vehicle type pill, destination search input, GPS locate button.
4. Floating bottom card: Live pickup address, drop address, driving distance, and dynamic fare.
5. Click **"Confirm Scooty"** → Map closes → Navigates to `/ride-receipt`.

**Live fare example:** For Scooty at ₹4/km, a 6.8 km OSRM-calculated route = **₹27.20 base + distance + fees**.

---

### 🔐 Feature 2: Two-Step Email OTP Authentication
**Page:** `/login`

**User flow:**
1. Customer enters Email (`amritacharya2007@gmail.com`) + Password (`Amrit@2007`) → Clicks **"Continue to Verification"**.
2. Backend `POST /api/auth/login-request`:
   - Verifies password against Bcrypt hash.
   - Generates 6-digit OTP (`906322`).
   - Saves to `otps` MongoDB collection with 10-min TTL.
   - Sends branded HTML email via Gmail SMTP.
3. UI transitions on the same page to a 6-box OTP input grid.
4. Customer enters the code from their email → Backend `POST /api/auth/verify-otp` confirms, deletes OTP, issues JWT.
5. Customer redirected to `/book`.

**Additional UX features:** Auto-advance between digits, paste support, 30s resend countdown timer, Demo Code auto-fill pill in development mode.

---

### 🧾 Feature 3: Animated Digital Bill & Receipt
**Page:** `/ride-receipt` (auto-navigated after booking)

**Contains:**
- Animated SVG checkmark tick (Framer Motion `pathLength` draw animation).
- Booking ID, Booking timestamp.
- 4-digit **Start Ride PIN** banner (shared with driver at pickup).
- **Assigned Driver card:** Name, Rating (⭐ 4.94), Vehicle plate number, Phone.
- **Passenger card:** Full name, Email, Verified Passenger badge.
- **Route timeline:** 🟢 Pickup → 📏 Distance → 🔴 Destination.
- **Itemized Fare:** Base Fare + Distance Charge + Service Fee + GST (5%) = Total.
- **Print / Save Invoice** button (browser print dialog with custom `@media print` CSS).

---

### 📦 Feature 4: Express Parcel Booking
**Pages:** `/deliver` → `/parcel-form`

Customers schedule door-to-door parcel delivery with:
- Package type selection (Documents, Electronics, Clothing, Fragile).
- Sender & receiver address fields.
- Weight and size category.
- Auto-generated tracking ID (`RX-PRCL-XXXXXX`).

---

### 🧑‍✈️ Feature 5: Driver Onboarding Portal
**Page:** `/employee-form`

Multi-step wizard form:
- **Step 1:** Personal Info (Name, Contact, City).
- **Step 2:** Vehicle Details (Type, Registration, Insurance, RC Book).
- **Step 3:** Banking Details (for future payout integration).
- **Completion:** Auto-assigns sequential Employee ID (`EMP-000001`, `EMP-000002`, ...) and saves to MongoDB.

---

## 6. API Endpoint Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register/user` | Public | Register a new customer account |
| `POST` | `/api/auth/register/employee` | Public | Register a new driver/employee account |
| `POST` | `/api/auth/login-request` | Public | Step 1: Verify password, send OTP email |
| `POST` | `/api/auth/verify-otp` | Public | Step 2: Verify OTP, receive JWT token |
| `POST` | `/api/auth/resend-otp` | Public | Resend a fresh 6-digit OTP to email |
| `POST` | `/api/auth/login` | Public | Legacy direct login (backward compatible) |
| `GET` | `/api/auth/me` | 🔐 JWT | Get current user profile |
| `POST` | `/api/auth/logout` | 🔐 JWT | Logout (client clears token) |

### Rides (`/api/rides`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/rides` | 🔐 JWT (user) | Create a new ride booking |
| `GET` | `/api/rides/my-rides` | 🔐 JWT (user) | Get rides history for current user |
| `GET` | `/api/rides/available` | 🔐 JWT (employee) | Get pending rides for drivers to accept |

---

## 7. How Backend Functions Work

### 7A. Customer Registration (`POST /api/auth/register/user`)

```
Client sends: { name, email, password, phone, city }
                        │
                        ▼
        ┌───────────────────────────────┐
        │ 1. Validate required fields   │
        │    (name, email, password ≥ 6)│
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌───────────────────────────────┐
        │ 2. Check if email exists in   │
        │    MongoDB users collection   │
        │    → if yes: 409 Conflict     │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌───────────────────────────────┐
        │ 3. bcrypt.hash(password, 10)  │
        │    → Secure hash created      │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌───────────────────────────────┐
        │ 4. User.create({...})         │
        │    Saves to MongoDB Atlas     │
        │    role: 'user' (hardcoded)   │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌───────────────────────────────┐
        │ 5. generateToken({ id, role })│
        │    → JWT signed with secret   │
        └──────────────┬────────────────┘
                       │
                       ▼
        Response 201: { success, token, user profile }
```

---

### 7B. 2-Step OTP Login (Full Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                        STEP 1: Login Request                     │
│                POST /api/auth/login-request                      │
│  { email: "amrit@gmail.com", password: "Amrit@2007", type: user }│
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
              Find user by email in MongoDB
              bcrypt.compare(password, hash)
                                │
                          ✅ Match
                                │
              Generate 6-digit OTP (e.g. 906322)
                                │
              Otp.deleteMany({ email })  ← Remove old OTP
              Otp.create({ email, otp, expires in 10 min })
                                │
              sendOtpEmail({ to, otp, name })
              → Nodemailer → smtp.gmail.com → User inbox
                                │
              Response 200: { success: true, email }

═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                        STEP 2: Verify OTP                        │
│                POST /api/auth/verify-otp                         │
│           { email: "amrit@gmail.com", otp: "906322" }           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
              Otp.findOne({ email, otp: "906322" })
                                │
                        ✅ Found & Not Expired
                                │
              Otp.deleteMany({ email })  ← Consume OTP (one-time)
                                │
              User.findOne({ email })   ← Reload full profile
                                │
              generateToken({ id: user._id, role: "user" })
                                │
              Response 200: { success: true, token, user profile }
                                │
              ← Frontend: stores token in localStorage/context
              ← User redirected to /book
```

---

### 7C. Ride Confirmation & Receipt Generation

```
User clicks "Confirm Scooty" on the MapPicker
                │
                ▼
BookRide.tsx — handleConfirm() executes:
  - Reads: pickupLoc.address, dropLoc.address from state
  - Reads: distanceKm, fare from state (calculated by OSRM)
  - Reads: selected.type (vehicle), user.name, user.email from context
  - Generates: bookingId (RX-RIDE-XXXXXX)
  - Generates: startRidePin (random 4-digit)
  - Calls: navigate('/ride-receipt', { state: rideData })
                │
                ▼
RideReceipt.tsx mounts:
  - Reads booking data from router state via useLocation()
  - Calculates itemized fare:
    baseFare     = totalFare × 25%
    distanceFare = totalFare × 65%
    serviceFee   = ₹15 flat
    taxAmount    = (base + distance + fee) × 5% GST
  - Renders animated checkmark tick
  - Renders driver assignment (sample/future: from API)
  - Renders Start Ride PIN, route timeline, fare table
  - Enables print via window.print()
```

---

## 8. Database Schema

### User Schema (`users` collection)
```js
{
  name: String (required),
  email: String (unique, lowercase),
  passwordHash: String (select: false),
  phone: String,
  city: String,
  role: enum ['user', 'admin'],
  isActive: Boolean (default: true),
  createdAt: Date (auto)
}
```

### Employee Schema (`employees` collection)
```js
{
  employeeId: String (unique, e.g. "EMP-000001"),
  name: String (required),
  email: String (unique),
  passwordHash: String (select: false),
  phone: String,
  department: String,
  designation: String,
  vehicleCategory: String,
  role: "employee" (hardcoded),
  isActive: Boolean,
  createdAt: Date (auto)
}
```

### OTP Schema (`otps` collection)
```js
{
  email: String (lowercase, required),
  otp: String (6-digit, required),
  accountType: enum ['user', 'employee'],
  createdAt: Date,   // ← TTL Index: expires after 600 seconds (10 min)
}
```

### Ride Schema (`rides` collection)
```js
{
  customer: ObjectId (ref: User),
  pickupAddress: String,
  dropAddress: String,
  pickupCoords: { lat, lng },
  dropCoords: { lat, lng },
  vehicleType: String,
  distanceKm: Number,
  fare: Number,
  status: enum ['pending', 'accepted', 'completed', 'cancelled'],
  driver: ObjectId (ref: Employee, optional),
  createdAt: Date (auto)
}
```

---

## 9. Environment Configuration

Create `backend/.env`:

```env
# Server
PORT=5000

# MongoDB Atlas
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/ridexpress?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=7d

# CORS — Vite dev server
CLIENT_ORIGIN=http://localhost:5173

# Admin seed credentials
ADMIN_EMAIL=admin@ridexpress.com
ADMIN_PASSWORD=Admin@12345

# Gmail SMTP — for real email OTP delivery
SMTP_SERVICE=gmail
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM="RideXpress" <your_gmail@gmail.com>
```

> **Gmail App Password:** Generate at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (requires 2-Step Verification enabled).

---

## 10. Local Setup & Installation

### Prerequisites
- Node.js v18+ (`node -v`)
- npm v9+ (`npm -v`)
- MongoDB Atlas account (free tier)
- Gmail account with App Password generated

### Step 1: Clone Repository
```bash
git clone https://github.com/Amrit000-HX/RideXpress.git
cd RideXpress/ridexpress-app
```

### Step 2: Install Dependencies
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### Step 3: Configure Environment
```bash
# Copy and fill in your credentials
cp .env.example .env
# Edit backend/.env with MongoDB URI, JWT secret, Gmail SMTP
```

### Step 4: Seed Admin Account
```bash
cd backend
node scripts/seedAdmin.js
```

### Step 5: Run Development Servers

**Terminal 1 — Backend API:**
```bash
cd backend
npm run dev
# Server running at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd ridexpress-app
npm run dev
# App running at http://localhost:5173
```

### Step 6: Test Email Delivery (Optional)
```bash
cd backend
node scripts/testEmail.js your_email@gmail.com
```

---

## 11. Current Limitations

| Limitation | Description |
|---|---|
| **No Real Driver Matching** | After a booking is confirmed, the driver shown on the receipt page is a sample placeholder (`Arjun Mehta`). No actual driver-customer matching algorithm exists yet. |
| **No Real-Time WebSocket Updates** | The platform uses standard REST API polling. There is no live tracking of the driver's vehicle location on the customer's map screen. |
| **Cash & UPI Only (Conceptual)** | Payment gateways (Razorpay, Stripe) are not yet integrated. The payment method shown on receipts is a display label only. |
| **Static Driver Ratings** | Driver ratings (e.g., ⭐ 4.94) are currently hardcoded. No rating submission or aggregation system exists yet. |
| **No Push Notifications** | Ride status updates (driver accepted, driver arriving) are not pushed to the customer in real-time. |
| **OSRM Rate Limits** | The free public OSRM API (`router.project-osrm.org`) has no SLA and may be throttled under high concurrent usage. |
| **No Parcel DB Persistence** | Parcel bookings are visually confirmed but not yet saved to the MongoDB `rides` collection. |
| **No Admin Dashboard UI** | Admin accounts exist in the database but there is no dedicated admin management UI for viewing users, rides, and metrics. |
| **Mobile App Absent** | RideXpress is currently a web-only platform. No native iOS or Android application exists. |

---

## 12. Future Scope & Roadmap

### 🔜 Phase 2: Core Operations
- [ ] **Real-Time Driver Matching:** When a customer books a ride, broadcast the request to all active nearby drivers via **Socket.io** WebSockets. First driver to accept gets assigned.
- [ ] **Live GPS Tracking:** Driver's location (from their mobile browser GPS) streamed to the customer's map screen in real-time via Socket.io rooms.
- [ ] **Payment Gateway Integration:** Razorpay / Stripe integration for UPI, card, and wallet payments with automated invoice generation via payment webhooks.

### 🔜 Phase 3: Business Intelligence
- [ ] **Admin Analytics Dashboard:** Charts showing daily rides, revenue, most active routes, and driver performance metrics using **Recharts** or **Chart.js**.
- [ ] **Ride Rating System:** Post-trip rating modal (1–5 stars) for customers to rate drivers. Driver average rating recalculated and stored.
- [ ] **Driver Incentive Engine:** Surge pricing based on demand zones and time-of-day using geospatial MongoDB queries.

### 🔜 Phase 4: Mobile & Scale
- [ ] **React Native Mobile App:** Native Android + iOS apps sharing the same backend API.
- [ ] **Self-Hosted OSRM Server:** Deploy a private OSRM server for unthrottled routing queries at scale.
- [ ] **Microservices Migration:** Split auth, rides, and notifications into independent services with a gateway using **Nginx** or **Kong API Gateway**.
- [ ] **Kubernetes Deployment:** Container orchestration for horizontal scaling during peak hours.

---

## 📜 License

This project was developed as a Minor Project for academic purposes.

---

<div align="center">
Built with ❤️ by the RideXpress Development Team · Powered by Open-Source Technologies
</div>
