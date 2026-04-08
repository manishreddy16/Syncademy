# Syncademy Setup Guide

## Project Overview
Syncademy is a full-stack offline-first education platform with React frontend and Node.js/Express backend. It supports offline submissions, resource caching, location awareness, and payment tracking.

## Prerequisites
1. **Node.js** (v16+) - [Download](https://nodejs.org/)
2. **PostgreSQL** (v12+) - [Download](https://www.postgresql.org/downloads/)
3. **npm** or yarn

## Quick Start (5 minutes)

### Step 1: Navigate to Project
```bash
cd c:\Users\manis\OneDrive\Desktop\Syncademy-main
```

### Step 2: Set Up Database
Before running the application, you need a PostgreSQL database. Create one:

**For Windows (using psql):**
```bash
# Connect to PostgreSQL (enter your password when prompted)
psql -U postgres

# Create database
CREATE DATABASE syncademy;

# Exit psql
\q
```

**For Mac/Linux:**
```bash
createdb syncademy
```

### Step 3: Verify .env Configuration
The `.env` file has been created with the following settings:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/syncademy
PORT=4000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
VITE_API_URL=http://localhost:4000/api
```

**⚠️ If your PostgreSQL password is different, update the DATABASE_URL accordingly.**

### Step 4: Initialize Database
```bash
npm run db:setup
```

This will:
- Create all necessary tables
- Seed sample data
- Display login credentials

### Step 5: Start the Application
```bash
npm run dev
```

This starts both frontend (Vite) and backend (Express) concurrently:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000/api

### Step 6: Login with Sample Credentials

#### Admin Account
- **School ID:** 1
- **Password:** password

#### Student Account (Approved)
- **School ID:** 1
- **Roll Number:** RV-001
- **Password:** password

#### Student Account (Pending - Needs approval)
- **School ID:** 1
- **Roll Number:** RV-002
- **Password:** password

## Project Structure

```
Syncademy/
├── src/                          # React Frontend
│   ├── pages/                   # Page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── AssignmentsPage.tsx
│   │   ├── ResourcesPage.tsx
│   │   ├── PaymentsPage.tsx
│   │   ├── MapsPage.tsx
│   │   ├── RegisterAdminPage.tsx
│   │   └── RegisterStudentPage.tsx
│   ├── components/              # Reusable components
│   │   ├── Sidebar.tsx
│   │   └── ProtectedRoute.tsx
│   ├── services/                # API integration
│   │   └── api.ts
│   ├── utils/                   # Utilities
│   │   ├── auth.ts
│   │   └── storage.ts
│   ├── styles/                  # Global styles
│   ├── App.tsx                  # Main app component
│   └── main.tsx                 # Entry point
│
├── backend/                      # Node.js/Express Backend
│   ├── controllers/             # Business logic
│   │   ├── authController.js
│   │   ├── dashboardController.js
│   │   ├── assignmentController.js
│   │   ├── resourceController.js
│   │   ├── paymentController.js
│   │   └── studentController.js
│   ├── models/                  # Database queries
│   │   ├── authModel.js
│   │   ├── studentModel.js
│   │   ├── assignmentModel.js
│   │   ├── resourceModel.js
│   │   ├── paymentModel.js
│   │   ├── submissionModel.js
│   │   └── adminModel.js
│   ├── routes/                  # API routes
│   │   ├── authRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── assignmentRoutes.js
│   │   ├── resourceRoutes.js
│   │   ├── paymentRoutes.js
│   │   └── studentRoutes.js
│   ├── middleware/              # Express middleware
│   │   └── authMiddleware.js
│   ├── db.js                    # Database connection
│   ├── server.js                # Express server
│   ├── schema.sql               # Database schema
│   ├── seed.sql                 # Sample data
│   └── setup-db.js              # Database initialization
│
├── .env                         # Environment variables
├── .gitignore                   # Git ignore rules
├── package.json                 # NPM dependencies
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS config
├── postcss.config.js           # PostCSS configuration
├── tsconfig.json               # TypeScript config
└── index.html                  # HTML entry point
```

## Available Scripts

```bash
# Start development server (frontend + backend)
npm run dev

# Build production frontend
npm run build

# Preview production build
npm run preview

# Start backend only
npm start

# Initialize database
npm run db:setup
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://postgres:postgres@localhost:5432/syncademy | PostgreSQL connection string |
| PORT | 4000 | Backend server port |
| JWT_SECRET | your-super-secret-jwt-key-change... | Secret key for JWT tokens (⚠️ change in production) |
| VITE_API_URL | http://localhost:4000/api | Frontend API URL |

## Features

✅ **User Management**
- School admin registration and login
- Student registration and approval workflow
- Role-based access control

✅ **Assignments**
- Create and manage assignments
- Student submissions
- Offline submission queueing

✅ **Resources**
- Share educational materials
- Offline caching support
- Local storage for low-bandwidth regions

✅ **Payments**
- Payment tracking and recording
- Offline payment queueing
- Sync when online

✅ **Maps**
- Location awareness with Leaflet
- GPS-based positioning
- Offline tile support

✅ **Offline-First Architecture**
- Queue system for offline requests
- Automatic sync when online
- LocalStorage caching

## Database Schema

### Users & Authentication
- **schools** - School organizations
- **admins** - Administrative accounts
- **students** - Student accounts

### Content
- **assignments** - Course assignments
- **submissions** - Student submissions
- **resources** - Shared educational materials
- **payments** - Payment records

## API Endpoints

### Authentication
- `POST /api/auth/register-school` - Register a new school
- `POST /api/auth/register-student` - Register a new student
- `POST /api/auth/login` - Login (admin or student)

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

### Assignments
- `GET /api/assignments` - Fetch assignments
- `POST /api/assignments` - Create assignment (admin only)
- `POST /api/assignments/submissions` - Submit assignment

### Resources
- `GET /api/resources` - Fetch resources
- `POST /api/resources` - Share resource (admin only)

### Payments
- `GET /api/payments` - Fetch payment records
- `POST /api/payments` - Record payment

### Students
- `GET /api/students/pending` - Get pending approvals (admin)
- `PATCH /api/students/:id/approval` - Approve/reject student

## Troubleshooting

### White Screen on Startup
- ✅ Frontend builds successfully
- ✅ All dependencies installed
- ✅ .env file configured
- Check browser console (F12) for errors

### Database Connection Error
```
Error: DATABASE_URL is required in .env
```
- Verify `.env` file exists
- Verify DATABASE_URL is correctly formatted
- Ensure PostgreSQL is running
- Check database exists: `createdb syncademy`

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::4000
```
- Change PORT in `.env` file
- Or kill process using port: `lsof -i :4000` (Mac/Linux) or `netstat -ano | findstr :4000` (Windows)

### Socket Hang Up Error
- Ensure backend is running with `npm run dev`
- Verify DATABASE_URL connection string
- Check PostgreSQL service is running

### CORS Errors
- Backend already has CORS enabled
- Verify frontend is accessing correct API_URL
- Check VITE_API_URL in browser console

## Production Deployment

### Environment Setup
1. Update `.env` with production database
2. Change JWT_SECRET to a strong random value
3. Set VITE_API_URL to production backend URL

### Building for Production
```bash
npm run build
npm start
```

### Database Backup
```bash
pg_dump syncademy > backup.sql
```

## Support
For issues or questions, check:
1. Browser console for errors (F12)
2. Terminal output for backend errors
3. Database connection string in `.env`
4. PostgreSQL service status

## What's Fixed
✅ .env file created with all required variables
✅ Dependencies installed successfully
✅ Database setup script created
✅ Frontend builds without errors
✅ Backend routes configured
✅ Offline sync features enabled
✅ Authentication middleware in place
✅ Complete database schema
✅ Sample data seeding
