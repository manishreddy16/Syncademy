# Syncademy

Syncademy has been fully migrated to a Firebase-first frontend application.
The app now uses Firebase Authentication and Firestore for user management, registrations, assignments, resources, payments, and offline sync.

## What is included

- React + Vite frontend with Tailwind CSS
- Firebase Auth for email/password login and Google Sign-In
- Firestore for schools, users, assignments, resources, submissions, registrations, and payments
- Admin and Student portals with separate dashboards and role-based navigation
- Offline-first queueing for assignments, resources, payments, and registration requests
- Automatic sync of pending tasks when online is restored
- Map integration and current location display for students

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

The app includes `src/firebase.ts` with Firebase configuration.
If you want to use your own Firebase project, update the values in `src/firebase.ts`.

## Page flow

- `/login` - Login with email/password or Google
- `/register-school` - Register a school admin and generate a School ID
- `/register-student` - Create a student registration request for admin approval
- `/admin/dashboard` - Admin portal for approvals, assignments, resources, and payments
- `/student/dashboard` - Student portal with balance, submissions, and map
- `/assignments` - Assignment creation and student submissions
- `/resources` - Resource upload, download, and offline caching
- `/payments` - View student payment history and create payment requests
- `/maps` - Current location map view

## Sample test credentials

For example test accounts, see `SAMPLE_CREDENTIALS.md`.

## Available scripts

```bash
npm run dev
npm run build
npm run preview
```

## Project structure

- `src/firebase.ts` - Firebase initialization and offline persistence
- `src/services/api.ts` - Auth and registration service functions
- `src/services/payment.ts` - Payment and balance logic
- `src/services/assignments.ts` - Assignment and submission logic
- `src/services/resources.ts` - Resource upload and sync logic
- `src/utils/auth.ts` - Local auth session helpers
- `src/utils/offlineStorage.ts` - Offline queue and local storage helpers
- `src/utils/autoSync.ts` - Automatic sync on reconnect
- `src/pages/` - App page components
- `src/components/` - Shared UI components

## Status

✅ Firebase Auth and Firestore are fully integrated
✅ Offline queueing and sync supported for assignments, resources, payments, and registrations
✅ Separate admin and student portal workflows enforced
✅ Maps and current location display available
✅ The project builds successfully with `npm run build`
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
