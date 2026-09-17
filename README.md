# FoodBridge - Food Waste Exchange Platform

FoodBridge is a full-stack project where restaurants post surplus food and NGOs claim it in real time.

## Tech Stack

- Frontend: React, React Router, Axios, Socket.io Client
- Backend: Node.js, Express, JWT, Socket.io
- Database: MySQL
- Authentication: bcrypt password hashing and JWT tokens

## Step-by-Step Build Plan

1. Install Node.js and MySQL.
2. Create the database by running `database/schema.sql` in MySQL Workbench or the MySQL CLI.
3. Open `server`, copy `.env.example` to `.env`, and fill in your MySQL password.
4. Install and run the backend.
5. Open `client`, install and run the React frontend.
6. Register one restaurant and one NGO account.
7. Login as restaurant, create a food post.
8. Login as NGO, open Food Feed, and claim the food.
9. Login as admin to verify users and view impact analytics.

## Run the Database

```bash
mysql -u root -p < database/schema.sql
```

## Run the Backend

From the `server` folder:

```bash
cd server
copy .env.example .env
npm install
npm run seed:admin
npm run dev
```

The default admin login is:

```text
email: admin@foodbridge.test
password: admin123
```

Backend URL:

```text
http://localhost:5000
```

## Run the Frontend

```bash
cd client
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## Main API Routes

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/foods
POST   /api/foods
PATCH  /api/foods/:id/status
GET    /api/foods/restaurant/dashboard
POST   /api/claims
GET    /api/claims/mine
PATCH  /api/claims/:id/cancel
GET    /api/admin/users
PATCH  /api/admin/users/:id/verify
GET    /api/admin/impact
```

## Suggested Next Features

- Cloudinary image upload instead of image URL.
- Google Maps nearby food search using latitude and longitude.
- QR code pickup confirmation.
- Email reminders for pickup time.
- Ratings after completed pickup.
- Charts for monthly food saved and top restaurants.

## Resume Line

Developed a full-stack Food Waste Exchange Platform using React, Node.js, Express, MySQL, JWT authentication, role-based dashboards, real-time food claiming with Socket.io, and live impact analytics.
