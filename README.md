# Syncademy

Syncademy has been fully migrated to a Firebase-first frontend application.
The old Node.js / PostgreSQL backend has been removed, and the app now uses Firebase Auth and Firestore for school registration, student onboarding, assignments, resources, and payments.

## What is included

- React + Vite frontend with Tailwind CSS
- Firebase Auth for login and registration
- Firestore for school, user, assignment, resource, and payment data
- Admin / Student role support
- School ID generation: `SCH-XXXX`
- Clean modern UI with loading and success/error states
- Fully working login and registration flows

## Quick Start

### Prerequisites
- Node.js v16+ ([Download](https://nodejs.org/))

### Install and run

```bash
cd "c:\Users\manis\OneDrive\Desktop\Syncademy-main"
npm install
npm run dev
```

Open the app at: `http://localhost:5173`

## Firebase Setup

The app already includes `src/firebase.ts` with Firebase configuration.
If you want to use your own Firebase project, update the values in `src/firebase.ts`.

## Page flow

- `/login` - Login with email and password
- `/register-school` - Register school admin and generate School ID
- `/register-student` - Register student using School ID
- `/dashboard` - Overview for admin or student
- `/assignments` - Assignment management
- `/resources` - Resource sharing and offline download
- `/payments` - Payment tracking
- `/maps` - Location-aware map view

## Sample test accounts

Use the frontend registration forms to create these accounts, then log in:

- Admin:
  - Email: `admin@test.com`
  - Password: `123456`

- Student:
  - Email: `student@test.com`
  - Password: `123456`
  - School ID: use the generated `SCH-XXXX` code shown after admin registration

## Available scripts

```bash
npm run dev
npm run build
npm run preview
```

## Project structure

- `src/firebase.ts` - Firebase initialization
- `src/services/api.ts` - Firebase Auth and Firestore service functions
- `src/utils/auth.ts` - Local auth state helpers
- `src/pages/` - App views and forms
- `src/components/` - Shared UI components

## Status

✅ **Firebase migration complete**
✅ **Backend removed**
✅ **App builds successfully**
✅ **No legacy PostgreSQL or Express dependencies remain**

## Notes

- The `backend/` folder has been deleted.
- The `package.json` no longer includes backend or PostgreSQL dependencies.
- The app is ready for a hackathon demo with Firebase Auth + Firestore.
psql -d syncademy -f backend/seed.sql
```

4. Install dependencies:

```bash
npm install
```

## Running locally

Start the development servers together:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`

## Available backend endpoints

- `POST /api/auth/register-school`
- `POST /api/auth/register-student`
- `POST /api/auth/login`
- `GET /api/dashboard`
- `GET /api/assignments`
- `POST /api/assignments`
- `POST /api/assignments/submissions`
- `GET /api/resources`
- `POST /api/resources`
- `GET /api/payments`
- `POST /api/payments`
- `GET /api/students/pending`
- `PATCH /api/students/:id/approval`

## Notes

- Admins log in with `schoolId` and password.
- Students log in with `schoolId`, roll number, and password.
- Offline submission and payment actions are queued in the browser and automatically sync when the device reconnects.
- Map tiles can be added in `public/tiles/{z}/{x}/{y}.png` for offline map viewing.

## Sample credentials

- Admin password: `admin123`
- Student password: `student123`
- Student roll number: `RV-001`

## Validation

- Frontend build has been validated with `npm run build`
- Backend JavaScript syntax has been validated using Node

Enjoy using Syncademy for resilient low-connectivity school access.
