# 🚀 QUICK START - Authentication Fix

## TL;DR - Just Run These Commands

### Terminal 1: Start PostgreSQL
```powershell
# Option A: Run helper script (EASIEST)
cd c:\Users\manis\OneDrive\Desktop\Syncademy-main
.\start-postgresql.bat

# Option B: Manual start
services.msc
# Find postgresql-x64-14 → Right-click → Start
```

### Terminal 2: Setup & Run Backend
```bash
cd c:\Users\manis\OneDrive\Desktop\Syncademy-main
npm run db:setup    # One time only
npm run dev
```

### Browser
```
http://localhost:5173
```

## That's It! 

### Test It
1. Click "Register School"
2. Fill in School Name, Location, Password
3. Click Register
4. ✓ Should work!

### Watch the Logs
- **Backend Console** should show:
  ```
  📝 Register School Request: ...
  ✅ School created: 1
  ```

## If It Doesn't Work

1. **Check PostgreSQL is running:**
   ```powershell
   pg_isready
   # Should show: "accepting connections"
   ```

2. **Check backend is running:**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:4000/api/health" -Method Get
   # Should show: {"status":"ok"}
   ```

3. **Check browser console (F12):**
   - Look for error messages
   - Copy error and check `AUTHENTICATION_DEBUG.md`

4. **Check backend console:**
   - Look for "❌" error messages
   - They indicate what's wrong

## Test Credentials (After `npm run db:setup`)

**Admin Login:**
- School ID: 1
- Password: password

**Student Login:**
- School ID: 1
- Roll: RV-001
- Password: password

## Detailed Help

- Full guide: `AUTHENTICATION_FIX_COMPLETE.md`
- Debug help: `AUTHENTICATION_DEBUG.md`
- Setup guide: `SETUP.md`

## Commands Reference

```bash
# Start backend + frontend
npm run dev

# Setup database (one time)
npm run db:setup

# Just backend
npm start

# Just frontend
npm run build && npm run preview
```

---

**Questions? Check the docs in the project root folder!** 📚
