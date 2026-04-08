# Syncademy - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Start the Development Server

```bash
npm run dev
```

Visit: **http://localhost:5173**

---

## 👥 Test Accounts

### Admin Account (School)
- **Email:** admin@school.com
- **Password:** password123
- **Role:** School Admin
- **School ID:** SCH-XXXX (generated)

### Student Account
- **Email:** student1@school.com  
- **Password:** password123
- **Role:** Student
- **School ID:** SCH-XXXX
- **Status:** Needs admin approval

---

## 🎯 Feature Testing Checklist

### ✅ Feature 1: Registration & Approval

**As Admin:**
1. Go to http://localhost:5173/register-school
2. Enter: admin@school.com / password123 / School Name / Location
3. Click "Register"
4. Copy the **School ID** displayed
5. Note down the School ID (e.g., SCH-1234)

**As Student:**
1. Go to http://localhost:5173/register-student
2. Enter:
   - Email: student1@school.com
   - Password: password123
   - Name: John Doe
   - Roll No: A001
   - School ID: (paste the admin's School ID from above)
3. Click "Register Student"
4. ⚠️ You'll see "Your account is pending approval"

**Back as Admin:**
1. Login with admin@school.com
2. Go to "Students" page
3. Should see student1@school.com in **pending requests**
4. Click "Approve" button
5. Now student can log in

---

### ✅ Feature 2: Persistent Login

**Test:**
1. Login as admin@school.com
2. Check the sidebar - shows your name & balance
3. **Refresh page** (F5)
4. ✓ You're still logged in - session restored!
5. Wait 24+ hours... (or restart browser) → You'll need to login again

---

### ✅ Feature 3: Payment & Balance System

**As Admin:**
1. Dashboard shows "Total Balance Distributed"
2. Scroll to "Student Balance Management"
3. Click "Add Money to All" button
4. Enter amount: **5000**
5. Click "Confirm"
6. ✓ All students get 5000 units added!

**As Student (after Approval):**
1. Login as student1@school.com
2. Check sidebar - shows **50,000 units** (or more if admin added money)
3. Go to "Payments" page
4. Show current balance
5. Click "Make Payment" 
6. Enter amount: **1000**
7. Description: "School Fee"
8. Click "Pay Now"
9. ✓ Balance now shows 49,000 (or corresponding amount)
10. Check "Transaction History" below

---

### ✅ Feature 4: Resources (PDFs)

**As Admin:**
1. Go to "Resources" page
2. Scroll to "Upload Resource"
3. Select a PDF file from your computer
4. Enter description: "Math Chapter 5"
5. Click "Upload Resource"
6. ✓ Resource appears in "Available Resources"

**As Student:**
1. Go to "Resources" page
2. Click "💾 Download" button next to a resource
3. ✓ Says "Resource saved for offline access"
4. Scroll to "Offline Resources" section
5. ✓ Resource now listed there

---

### ✅ Feature 5: Assignments

**As Admin:**
1. Go to "Assignments" page
2. Scroll to "Create Assignment"
3. Enter:
   - Title: "Math Homework 5"
   - Description: "Do problems 1-10"
   - Due Date: Tomorrow at 2 PM
4. Click "Publish Assignment"
5. ✓ Assignment appears in "Current Assignments"

**As Student:**
1. Go to "Assignments" page
2. See assignment in "Available Assignments"
3. Click to select it (blue highlight)
4. Scroll to "Submit Assignment"
5. Enter answer: "Problem 1: 5, Problem 2: 10..."
6. Click "Submit Assignment"
7. ✓ Appears in "Your Submissions" with status "Submitted"

---

### ✅ Feature 6: Offline/Online Status

**Test Online Status:**
1. Look at sidebar - top right
2. Should show **🟢 Online** in green
3. Look at any dashboard - status box shows "Online"
4. Look at "Payments" page - status shows green

**Test Offline Status:**
1. Open DevTools (F12)
2. Go to "Network" tab
3. Check "Offline" checkbox
4. Refresh page
5. ✓ Sidebar shows **🔴 Offline** in red
6. Dashboard shows "Offline"
7. Try to make payment - saves locally with warning
8. Uncheck "Offline" in DevTools
9. ✓ Should show "Pending Tasks" section with yellow warning
10. Click "Sync Now" button
11. ✓ Tasks synced and disappear

---

### ✅ Feature 7: Bluetooth Sharing

**Test Share Button:**
1. Go to "Resources" page
2. Next to a resource, click "Bluetooth" button (purple)
3. ✓ Lists nearby devices (simulated for demo)
4. Click on a device name
5. ✓ Shows "Successfully sent..."

**Test Web Share (Native):**
1. On supported browsers (Chrome, Edge, Safari on iOS)
2. Click "📤 Share" button
3. Choose share option (AirDrop, Messages, etc.)
4. ✓ File shared

---

### ✅ Feature 8: Admin Dashboard Features

**As Admin:**
1. Login and go to Dashboard
2. See stats:
   - Total Students
   - Total Resources
   - Total Assignments
   - Total Balance Distributed
3. See table of all student balances
4. Student Payments table shows transactions
5. Look at admin-specific nav items: "Students", "Analytics"

---

### ✅ Feature 9: Student Dashboard Features

**As Student:**
1. Login and go to Dashboard
2. See stats:
   - 💰 Balance (available funds)
   - 📝 Submissions (how many submitted)
   - ⭐ Status (Active)
3. See "Pending Tasks" if any offline actions
4. See "Recent Transactions" (payments history)
5. See "Recent Submissions" (assignments submitted)

---

### ✅ Feature 10: Fixed 404 on Refresh

**Test:**
1. Login to Student Dashboard
2. Go to `/student/dashboard`
3. Press F5 (refresh)
4. ✓ Page loads correctly - **no 404!**
5. Go to `/admin/analytics`
6. Refresh
7. ✓ Works correctly

---

## 🔧 Advanced Testing

### Test Offline Workflow End-to-End

1. Go to DevTools → Network → Offline
2. As student, go to Payments
3. Try to make payment (amount: 500)
4. ✓ Says "offline mode" or "will sync when online"
5. Payment added locally
6. Go to DevTools → uncheck Offline
7. Back online - you see "Pending Tasks" section
8. Click "Sync Now"
9. ✓ Payment synced to Firestore
10. Check admin dashboard - sees the payment!

### Test IndexedDB (Offline Storage)

```javascript
// In browser console (F12):
// Open DevTools Application tab
// Look for "IndexedDB" → "syncademy_offline_db"
// See stored items

// Or check manually:
const indexedDB = window.indexedDB;
const request = indexedDB.open('syncademy_offline_db');
request.onsuccess = (e) => {
  const db = e.target.result;
  const store = db.transaction('items', 'readonly').objectStore('items');
  store.getAll().onsuccess = (e) => console.log(e.target.result);
};
```

### Test Session Restoration

1. Login as admin
2. Go to browser DevTools → Application → Cookies
3. Look for `syncademy_user` and `syncademy_session` entries
4. Close browser completely
5. Reopen browser to http://localhost:5173/login
6. ✓ You're automatically logged in! (session restored)

---

## 🐛 Quick Debugging

### Check All Errors

```javascript
// In browser console:
console.log(localStorage.getItem('syncademy_user'));
console.log(localStorage.getItem('syncademy_session'));
```

### Check Offline Storage

```javascript
// In browser console:
await navigator.storage.estimate().then(e => {
  console.log(`Used: ${e.usage} bytes`);
  console.log(`Available: ${e.quota} bytes`);
});
```

### Force Sync

```javascript
// In browser console:
import { syncPendingData } from './utils/autoSync';
await syncPendingData();
```

---

## 📊 Expected Results

| Feature | Status | Expected Result |
|---------|--------|-----------------|
| Registration | ✅ | Students appear in pending list |
| Admin Approval | ✅ | Students can login after approval |
| Persistent Login | ✅ | Page refresh keeps you logged in |
| Balance Display | ✅ | Shows in sidebar & dashboard |
| Payments | ✅ | Balance decrements, shows in history |
| Admin Bulk Add | ✅ | All students get money |
| Resources Upload | ✅ | Admin can upload PDFs |
| Resources Download | ✅ | Students can download offline |
| Assignments Create | ✅ | Admins can create |
| Assignments Submit | ✅ | Students can submit |
| Offline Mode | ✅ | Works without internet |
| Auto-Sync | ✅ | Syncs when back online |
| Bluetooth Share | ✅ | Can share files |
| Dashboard Refresh | ✅ | No 404 errors |
| Role-Based Nav | ✅ | Different menus for student/admin |

---

## 🎓 Test Scenarios

### Scenario 1: Complete Student Journey
```
1. Register as student
2. Wait for admin approval
3. Login after approval
4. View balance (50,000)
5. Download resource
6. View assignment
7. Submit assignment
8. Make payment
9. Check dashboard
✓ All features work!
```

### Scenario 2: Complete Admin Journey
```
1. Register school
2. Add money to all students
3. Create assignment
4. Create resource
5. Approve pending students
6. View student payments
7. Check dashboard stats
✓ All features work!
```

### Scenario 3: Offline Journey
```
1. Go offline (DevTools Network)
2. Submit assignment offline
3. Make payment offline
4. Download resource offline
5. See pending tasks
6. Go back online
7. Click sync
8. Verify synced in Firestore
✓ Offline sync works!
```

---

## 🚀 Next Steps

1. ✅ Test all features above
2. ✅ Check browser console for errors
3. ✅ Verify Firestore has data (Firebase Console)
4. ✅ Try on mobile browser
5. ✅ Test offline mode
6. ✅ Deploy to production

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unable to load dashboard" | Clear cache (Ctrl+Shift+Delete), refresh |
| Student can't login without approval | Admin must go to Students page and approve |
| Balance not showing | Check Firestore, verify user has balance field |
| Payments not syncing | Go online, click "Sync Now", check console |
| No pending tasks | Go offline first, then make an action |
| Bluetooth not working | Use Chrome/Edge, accept permissions |
| 404 on refresh | Should be fixed, clear cache if not |

---

## 📈 Performance

- **First Load:** ~2-3 seconds (depending on internet)
- **Offline Load:** ~1 second (from IndexedDB)
- **Sync Time:** ~2-5 seconds (depending on data size)
- **Bundle Size:** ~1.2 MB (gzipped: ~316 KB)

---

## ✨ Features Summary

| Feature | Status | Offline | Sync | Notes |
|---------|--------|---------|------|-------|
| Registration | ✅ | ❌ | - | Requires internet |
| Login/Session | ✅ | ✅ | - | Saved locally |
| Balance | ✅ | ✅ | ✅ | Via IndexedDB |
| Payments | ✅ | ✅ | ✅ | Records locally, syncs when online |
| Resources | ✅ | ✅ | ✅ | Download, store locally |
| Assignments | ✅ | ✅ | ✅ | Submit offline, sync when online |
| Sharing | ✅ | ✅ | - | via Bluetooth/Web Share |
| Admin Controls | ✅ | ❌ | - | Requires internet |

---

Enjoy testing Syncademy! 🎉
