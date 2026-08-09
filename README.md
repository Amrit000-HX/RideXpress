<p align="center">
  <h1 align="center">🚀 RideXpress</h1>
  <p align="center">
    <strong>A full-featured ride-booking & parcel delivery platform — built with React, TypeScript, and Framer Motion.</strong>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
    <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
    <img src="https://img.shields.io/badge/Framer_Motion-12-FF0080?style=for-the-badge&logo=framer&logoColor=white" />
    <img src="https://img.shields.io/badge/GSAP-3.x-88CE02?style=for-the-badge&logo=greensock&logoColor=black" />
  </p>
</p>

---

## 📖 Overview

**RideXpress** is a modern transport & logistics web platform that allows customers to book rides and schedule parcel deliveries, while providing a complete employee portal for delivery riders and drivers. Built with a premium design aesthetic featuring dual themes — a **Cream & Green** customer-facing interface and a **Cinematic Noir** employee dashboard.

---

## ✨ Features

### 🧑‍💼 Customer Experience
| Feature | Description |
|---|---|
| **Landing Page** | Brutalist / Kinetic aesthetic with animated sections, hero, services, testimonials |
| **Book a Ride** | Stacking-card scroll effect showcasing all vehicle types (Scooty, Bike, Car, Jeep, SUV, Bus) with fares and details |
| **Deliver a Parcel** | Two service tiers — Local (within 100 km) and Long Distance / Abroad, with animated cards |
| **Parcel Booking Form** | Full parcel intake form: category dropdown, weight, dimensions, camera/file photo upload, pickup & delivery address, scheduling |
| **Login Page** | Split-screen SaaS-style login with GSAP PillNav toggle (Customer ↔ Employee) |
| **Registration Page** | Multi-step registration wizard with OTP verification; separate flows for Customers and Employees |

### 🚗 Vehicle Options (Book a Ride)
- **Scooty** — Budget city rides, ₹8/km
- **Bike** — Fast solo rides, ₹10/km
- **Hatchback Car** — Comfortable 4-seater, ₹14/km
- **Jeep / MUV** — Rugged terrain, ₹18/km
- **XL SUV** — Premium comfort, ₹22/km
- **Mini Bus** — Group travel (12–20 seats), ₹35/km

### 📦 Parcel Delivery Flow
- Choose delivery type (Local ≤100km | Long Distance / International)
- Fill detailed parcel form:
  - Parcel category (Electronics, Documents, Clothing, Food, Medical, etc.)
  - Weight (kg) & dimensions (L×W×H cm)
  - Upload parcel photo via camera or file picker
  - Sender & receiver details
  - Pickup & delivery addresses with landmark
  - Scheduling (Immediate / Scheduled)
  - Optional insurance & fragile handling flags

### 👷 Employee Portal
| Feature | Description |
|---|---|
| **Employee Registration** | Multi-step wizard with vehicle & legal document upload (RC, Insurance, Driving License, ID proof) |
| **Employee Login** | Dedicated sign-in tab on the login page → redirects to dashboard |
| **Employee Dashboard** | Full cinematic-noir themed hub |

#### Employee Dashboard Sections
1. **Hero Profile** — Huge animated name display, vehicle type badge, initials avatar, 4 quick-stat chips (Rating, Total Trips, Today's Earnings, Shift Status)
2. **Today's Assigned Deliveries** — Real-time assignment list with route, type, priority, time window, and estimated earning
3. **Delivery Status Board** — Tabbed view (Pending / Completed / Failed) with `AnimatePresence` transitions
4. **Upcoming Rides** — Available ride cards with Accept button
5. **Notifications Panel** — Color-coded notification feed (Ride, Delivery, Payment, Alert, System) with unread dots
6. **Current Shift & Working Hours** — Shift start/end, animated progress bar, break tracking
7. **Delivery Priority Queue** — Urgency-ranked queue with color-coded priority dots and time windows
8. **Completed Rides** — Horizontal-scroll cards with route, duration, fare, and star ratings

---

## 🎨 Design System

### Customer Theme — *Cream & Green*
| Token | Value | Usage |
|---|---|---|
| Cream | `#F5F0E8` | Background, Cards |
| Sage Green | `#6B9E72` | Primary accent, CTAs |
| Charcoal | `#1A1A1A` | Text, headers |

### Landing Page — *Kinetic Brutalist*
- Typography: **Archivo Black** (display) + **Inter** (body)
- Bold orange/black contrast — replaced with Cream/Charcoal/Green
- Heavy weight contrasts, sharp edges, kinetic motion

### Employee Dashboard — *Cinematic Noir*
| Token | Value | Usage |
|---|---|---|
| Deep Black | `#0e0e0e` | Page background |
| Surface | `#1a1a1a` | Card backgrounds |
| Cream | `#F5F0E8` | Primary text |
| Sage Green | `#6B9E72` | Accents, earnings |
| Danger Red | `#D46B6B` | Failed states |
| Amber | `#C9914A` | Alert/warning |

Design elements:
- **Grain overlay** via SVG noise + `mix-blend-mode: overlay`
- **Scroll-linked parallax** via Framer Motion `useScroll` + `useTransform`
- **Huge typography** — name at `clamp(3.5rem, 8vw, 7rem)`
- **Sharp edges** — minimal border-radius (2px)
- **Space Mono** for all labels and metadata

---

## 🛠️ Tech Stack

### Core
| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.x | UI component library |
| **TypeScript** | 6.0 | Type safety |
| **Vite** | 8.x | Build tool & dev server |
| **React Router DOM** | 7.x | Client-side routing |

### Animation & Motion
| Technology | Version | Purpose |
|---|---|---|
| **Framer Motion** | 12.x | Page animations, scroll effects, AnimatePresence, stacking cards |
| **GSAP** | 3.x | PillNav toggle liquid hover animations on the login page |

### Icons & Fonts
| Technology | Purpose |
|---|---|
| **Lucide React** | Icon system (1.25+, 250+ icons used) |
| **Google Fonts** | Archivo Black, Inter, Space Mono, Outfit |

### Quality
| Technology | Purpose |
|---|---|
| **OXLint** | Fast Rust-based linter |
| **TypeScript strict mode** | Compile-time safety |

---

## 🗂️ Project Structure

```
ridexpress-app/
├── public/                  # Static assets
├── src/
│   ├── assets/              # Images (vehicles, services, hero)
│   ├── components/
│   │   ├── Navbar.tsx       # Responsive navigation bar
│   │   ├── Navbar.css
│   │   ├── Footer.tsx       # Site footer
│   │   └── Footer.css
│   ├── contexts/
│   │   └── AuthContext.tsx  # Auth state (login/logout via localStorage)
│   ├── pages/
│   │   ├── Home.tsx                  # Landing / hero page
│   │   ├── BookRide.tsx              # Stacking-card ride booking
│   │   ├── BookRide.css
│   │   ├── DeliverParcel.tsx         # Delivery service selection page
│   │   ├── DeliverParcel.css
│   │   ├── ParcelForm.tsx            # Parcel booking intake form
│   │   ├── ParcelForm.css
│   │   ├── LoginPage.tsx             # Split-screen GSAP login
│   │   ├── LoginPage.css
│   │   ├── RegisterPage.tsx          # Multi-step registration wizard
│   │   ├── RegisterPage.css
│   │   ├── EmployeeForm.tsx          # Employee onboarding (docs upload)
│   │   ├── EmployeeForm.css
│   │   ├── EmployeeDashboard.tsx     # Full employee hub (Cinematic Noir)
│   │   └── EmployeeDashboard.css
│   ├── App.tsx              # Root router + layout management
│   ├── App.css
│   ├── main.tsx             # React entry point
│   └── index.css            # Global styles & design tokens
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚦 Routing

| Route | Page | Navbar/Footer |
|---|---|---|
| `/` | Home (Landing Page) | ✅ |
| `/book` | Book a Ride | ✅ |
| `/deliver` | Deliver a Parcel | ✅ |
| `/login` | Login Page | ❌ |
| `/register` | Register Page | ❌ |
| `/parcel-form` | Parcel Booking Form | ❌ |
| `/employee-form` | Employee Onboarding | ❌ |
| `/employee-dashboard` | Employee Dashboard | ❌ (custom nav) |

---

## 🔐 Auth Flow

```
Customer:
  Register (/register, role=customer) → OTP verify → login() → /book

Employee:
  Register (/register, role=employee) → OTP verify → /employee-form
  Employee Form (docs upload) → login() → /employee-dashboard
  Login Page (Employee tab) → login() → /employee-dashboard
```

Auth state is persisted in `localStorage` via `AuthContext`. Employee profile data (`emp_name`, `emp_vehicle`) is also stored in `localStorage` after registration.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18.x
- **npm** ≥ 9.x

### Installation

```bash
# Clone the repository
git clone https://github.com/Amrit000-HX/RideXpress.git
cd RideXpress

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at **http://localhost:5173**

### Build for Production

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

---

## 📱 Responsive Design

RideXpress is fully responsive across:
- **Desktop** (1400px+) — full grid layouts
- **Laptop** (1100px) — condensed sidebar
- **Tablet** (900px) — stacked grid
- **Mobile** (600px) — optimized single-column layouts, reduced typography scale

---

## 🗺️ Roadmap

- [ ] Backend API integration (Node.js / Express)
- [ ] Real authentication with JWT
- [ ] Live GPS tracking via Google Maps API
- [ ] Payment gateway integration (Razorpay / Stripe)
- [ ] Push notifications for ride/delivery updates
- [ ] Admin dashboard for platform management
- [ ] PWA (Progressive Web App) support
- [ ] Dark mode toggle for customer-facing pages

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ using React + TypeScript + Framer Motion
</p>
