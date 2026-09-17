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

## Demo link 
https://salonirohil.github.io/foodbridge/#/
## ADMIN
<img width="1917" height="970" alt="image" src="https://github.com/user-attachments/assets/afacca8f-5d90-4535-87b1-afb5f55f6796" />
<img width="1917" height="922" alt="image" src="https://github.com/user-attachments/assets/965cbaf0-ff08-42fe-9872-13850c69a9d1" />
<img width="1917" height="973" alt="image" src="https://github.com/user-attachments/assets/94154edd-1f5a-4ef8-a1b9-25e77debd4e0" />
<img width="1912" height="972" alt="image" src="https://github.com/user-attachments/assets/d66d8bf4-50fc-4b13-af0e-db0be843e612" />
## Restaurant 
<img width="1916" height="973" alt="image" src="https://github.com/user-attachments/assets/58eb0712-3a95-478c-bf31-0b41e8d31c8d" />
<img width="1917" height="982" alt="image" src="https://github.com/user-attachments/assets/ca7ffde2-dbde-4fbc-9990-d2993bca2c48" />

## NGO
<img width="1917" height="973" alt="image" src="https://github.com/user-attachments/assets/3528faf3-631f-4bda-8b95-c5943a722c4e" />
<img width="1913" height="977" alt="image" src="https://github.com/user-attachments/assets/253b0ba6-1074-4efb-bd39-de7238c41d9c" />
<img width="1912" height="982" alt="image" src="https://github.com/user-attachments/assets/fa83c007-5c9b-4de1-86cf-e64fcb8edcd5" />




