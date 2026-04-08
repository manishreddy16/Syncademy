# 🔐 Authentication Debugging Guide

## Current Status
- ✅ Frontend: Loading
- ❌ Registration/Login: Not working - PostgreSQL not running
- ✅ Backend server code: Working (with improved error logging)
- ❌ Backend database: Not connected to PostgreSQL

## Root Cause
**PostgreSQL service is not running.** The backend crashes when it tries to connect to the database.

## STEP-BY-STEP FIX

### 1. Start PostgreSQL Service

#### Option A: Using Windows Services (Recommended)
```powershell
# Open Services Manager
services.msc

# Find "postgresql-x64-XX" (where XX is version like 14, 15, etc.)
# Right-click → Start
# Status should show "Running"
```

#### Option B: Using PowerShell
```powershell
# Find PostgreSQL service
Get-Service postgresql* -ErrorAction SilentlyContinue | Select-Object Name, Status

# Start the service
Get-Service postgresql-x64-14 | Start-Service  # Change 14 to your version

# Verify it's running
pg_isready
# Should show: "accepting connections"
```

#### Option C: Using Command Line
```powershell
# Test if PostgreSQL is running
pg_isready -h localhost -p 5432

# If not running, check installation
Get-Command psql
```

### 2. Create the Database
```powershell
# Option 1: Using psql
psql -U postgres -c "CREATE DATABASE syncademy;"

# Option 2: Using PowerShell
psql -U postgres -d postgres -c "CREATE DATABASE syncademy;"
```

### 3. Initialize Database Schema and Sample Data
```bash
cd c:\Users\manis\OneDrive\Desktop\Syncademy-main
npm run db:setup
```

Expected output:
```
🔧 Initializing Syncademy database...
📋 Creating tables...
🌱 Seeding sample data...
✅ Database initialized successfully!

📝 Sample Login Credentials:
  Admin:
    School ID: 1
    Password: password
  Student (Pending Approval):
    School ID: 1
    Roll Number: RV-002
    Password: password
```

### 4. Restart Backend Server
```bash
cd c:\Users\manis\OneDrive\Desktop\Syncademy-main
npm run dev
```

Expected console output:
```
🚀 Starting Syncademy backend server...
📍 Port: 4000
▶️  Frontend API base URL: http://localhost:5173
🔄 Connecting to database: localhost:5432/syncademy
✅ Database connected successfully
✅ Syncademy backend listening on http://localhost:4000
```

### 5. Test Full Registration Flow
1. Open http://localhost:5173
2. Click "Register School"
3. Fill in form:
   - School Name: "My Test School"
   - Location: "Test City"
   - Password: "testpass123"
4. Click "Register School"
5. Check terminal for logs starting with "📝 Register School Request:"

## Debugging: What to Check

### ✅ PostgreSQL is running
```powershell
pg_isready
# Should output: "accepting connections"
```

### ✅ Database exists
```powershell
psql -U postgres -l | findstr syncademy
# Should show "syncademy" database
```

### ✅ Backend is connected
Start backend and check for these messages:
```
✅ Database connected successfully at: [timestamp]
✅ Syncademy backend listening on http://localhost:4000
```

### ✅ Registration endpoint working
```powershell
# Test registration
Invoke-WebRequest -Uri "http://localhost:4000/api/auth/register-school" `
  -Method Post `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"name":"Test","location":"Test","password":"test123"}' | ConvertTo-Json
```

## Common Issues & Solutions

### Issue 1: "ECONNREFUSED" or "Connection refused"
**Problem:** PostgreSQL is not running
**Solution:**
```powershell
# Start PostgreSQL
services.msc
# Find postgresql-x64-XX → Start
# Or use PowerShell
Get-Service postgresql* | Start-Service
```

### Issue 2: "FATAL: database 'syncademy' does not exist"
**Problem:** Database not created
**Solution:**
```bash
psql -U postgres -c "CREATE DATABASE syncademy;"
npm run db:setup
```

### Issue 3: "FATAL: role 'postgres' does not exist"
**Problem:** PostgreSQL user doesn't exist or wrong credentials
**Solution:** Check .env DATABASE_URL format:
```env
DATABASE_URL=postgresql://postgres:YourPassword@localhost:5432/syncademy
```

### Issue 4: Backend crashes on startup
**Problem:** Port 4000 in use or database connection fails
**Solution:**
```powershell
# Check if port 4000 is in use
netstat -ano | findstr :4000

# If in use, kill process
taskkill /PID [PID] /F

# Change PORT in .env if needed
# Set PORT=4001
```

### Issue 5: Frontend shows "Unable to register"
**Problem:** Wrong error message - backend might not be running
**Solution:**
1. Check backend is running: `Invoke-WebRequest -Uri "http://localhost:4000/api/health" -Method Get`
2. Check browser console (F12) for error details
3. Check terminal logs where backend is running

## Improved Error Handling Added

I've added console logging to help identify issues:

### Backend Console Logs Now Show:
- 🚀 Server startup status
- 📍 Port and configuration
- 🔄 Database connection attempts
- 📝 All registration/login requests
- ✅ Successful operations
- ❌ Errors with details

### Frontend Error Messages Now Show:
- Actual error from backend (not generic "registration failed")
- Full error details in browser console (F12)

## Quick Test Flow

```bash
# Terminal 1: Start backend
cd c:\Users\manis\OneDrive\Desktop\Syncademy-main
npm run dev

# Should see:
# ✅ Database connected successfully
# ✅ Syncademy backend listening on http://localhost:4000

# Terminal 2: Start frontend (already running if you used npm run dev)
# Open: http://localhost:5173

# Test registration:
# 1. Navigate to /register-school
# 2. Fill form and submit
# 3. Check console for "📝 Register School Request:"
# 4. Should see "✅ School created:"
```

## Database Connection String

Your `.env` has:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/syncademy
```

This means:
- **User:** postgres
- **Password:** postgres
- **Host:** localhost
- **Port:** 5432
- **Database:** syncademy

If your PostgreSQL setup is different, update this connection string.

## Manual Database Test

```powershell
# Connect to database
psql -U postgres -h localhost -d syncademy

# List tables (inside psql)
\dt

# Should see tables like: schools, students, admins, assignments, etc.

# Exit
\q
```

## Next Steps

1. **Start PostgreSQL service** (services.msc or PowerShell)
2. **Create database:** `psql -U postgres -c "CREATE DATABASE syncademy;"`
3. **Initialize schema:** `npm run db:setup`
4. **Start backend:** `npm run dev`
5. **Test registration:** Try registering a school in frontend
6. **Check logs:** Look for ✅ success or ❌ error in terminal

Once PostgreSQL is running and backend connects, everything will work!
