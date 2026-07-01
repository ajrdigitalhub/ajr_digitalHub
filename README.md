# 🚀 AJR Digital HUB

A **comprehensive SaaS platform** for building dynamic forms, managing digital products, monitoring analytics, and controlling applications from a centralized admin system.

---

## 🌐 Overview

**AJR Digital HUB** is a full-stack web application designed to:

* Build dynamic forms and UI templates
* Manage digital product marketplace
* Monitor application usage and analytics
* Control multiple applications from a master admin panel
* Provide SaaS-based subscription and feature control

---

## ✨ Key Features

### 🏠 Landing Page

* Dynamic hero slider (admin-controlled)
* Animated UI with scroll effects
* Testimonials & statistics
* Live preview sections for marketing

---

### 🛒 Marketplace

* Dynamic product cards
* HTML-based preview system
* Admin-configurable content
* Image upload support (Firebase)

---

### 🧩 Form Builder

* Dynamic form creation
* Save & manage templates
* Real-time preview

---

### 🧠 Admin Control Panel

* Multi-app management system
* Provision new applications
* Hero slider configuration
* Marketplace configuration
* Service monitoring (API, DB, WhatsApp)

---

### 📊 Analytics & Monitoring

* API usage tracking
* Error logs
* Real-time activity monitoring
* Firebase-like analytics dashboard

---

### 🔐 Authentication System

* Optional login (only for actions like purchase/form save)
* Role-based access:

  * Admin
  * User
* JWT + Refresh Token support
* Idle session timeout with countdown

---

### 🎨 UI/UX Enhancements

* Theme switching (light/dark)
* Toast notifications
* Button loaders & progress indicators
* Scroll-based animations
* Professional SaaS UI design

---

## 🛠️ Tech Stack

### Frontend

* Angular (Zoneless Architecture)
* SCSS / Tailwind-style UI
* RxJS for state handling

### Backend

* Node.js + Express
* REST API architecture
* JWT Authentication

### Database

* PostgreSQL (JSONB-based flexible schema)

### Storage

* Firebase (image storage)

---

## 📁 Project Structure

```
/frontend
  /components
  /pages
  /services
  /shared

/backend
  /controllers
  /routes
  /services
  /middleware

/database
  database.sql
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-repo/ajr-digital-hub.git
cd ajr-digital-hub
```

---

### 2. Setup Backend

```bash
cd server
npm install
npm run dev
```

---

### 3. Setup Frontend

```bash
cd client
npm install
ng serve
```

---

### 4. Environment Variables

Create `.env` in backend:

```
DB_BACKEND_PORT=4000
JWT_SECRET=your_secret

PG_USER=your_user
PG_HOST=your_host
PG_DATABASE=your_db
PG_PASSWORD=your_password
PG_PORT=6543
PG_SSL=true
```

---

## 🔗 API Endpoints (Core)

### Auth

* POST /api/auth/login
* POST /api/auth/register
* POST /api/auth/refresh

---

### Marketplace

* GET /api/marketplace
* POST /api/admin/marketplace

---

### Apps

* GET /api/admin/apps
* POST /api/admin/apps

---

### Settings

* GET /api/settings/:key
* PUT /api/admin/settings/:key

---

### Analytics

* GET /api/admin/analytics

---

## 🔐 Security

* JWT-based authentication
* Refresh token mechanism
* Role-based access control
* Secure API middleware

---

## 🎯 Future Enhancements

* Payment integration (Stripe/Razorpay)
* Multi-tenant architecture
* Advanced reporting dashboards
* AI-powered analytics
* PWA support

---



---

## 👨‍💻 Author

**AJR Digital HUB Team**

---

## ⭐ Support

If you like this project, please ⭐ star the repository!
