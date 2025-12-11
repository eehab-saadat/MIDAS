# Quick Start Guide - MIDAS Authentication

## What Was Added

A complete login/signup authentication system with role-based access control for MIDAS.

## New Files Created

1. **`frontend/lib/auth.ts`** - Authentication utilities and logic
2. **`frontend/app/login/page.tsx`** - Login page
3. **`frontend/app/signup/page.tsx`** - Signup page
4. **`frontend/components/user-menu.tsx`** - User profile menu
5. **`frontend/components/protected-route.tsx`** - Route protection component

## Modified Files

1. **`frontend/app/page.tsx`** - Updated with:
   - Authentication check on load
   - User menu integration
   - Role-based "Add Patient" button visibility
   - Role info banner display

## How to Use

### Step 1: Start the Application
```bash
cd frontend
npm run dev
```

### Step 2: Login
Navigate to `http://localhost:3000/login`

### Step 3: Use Demo Credentials

**Doctor (Full Access):**
- Email: `doctor@midas.com`
- Password: `doctor123`

**Receptionist/Nurse (Limited Access):**
- Email: `nurse@midas.com`
- Password: `nurse123`

## Key Features

### Two Roles Implemented

#### 👨‍⚕️ Doctor
- Can see: Patient list, Patient details, Add Patient button, Diagnosis tools
- Can do: Add patients, View all patient information, Access diagnosis tools

#### 👩‍⚕️ Receptionist/Nurse
- Can see: Patient list, Patient details only
- Cannot do: Add patients, Access diagnosis tools (shown only patient view)

### Authentication Features
- ✅ Email/password login
- ✅ User registration with role selection
- ✅ Persistent session (localStorage)
- ✅ User profile menu with logout
- ✅ Role-based feature visibility
- ✅ Design consistent with MIDAS theme

## Design

All pages follow the MIDAS design language:
- Teal/Cyan primary color
- Gradient backgrounds
- Card-based layouts
- Dark mode support
- Smooth animations
- Lucide React icons

## Demo Walkthrough

### Scenario 1: Doctor Login
1. Go to `/login`
2. Enter: `doctor@midas.com` / `doctor123`
3. You'll see:
   - Patient list
   - "Add Patient" button
   - User menu showing "Doctor" role
   - Role info banner

### Scenario 2: Receptionist Login
1. Go to `/login`
2. Enter: `nurse@midas.com` / `nurse123`
3. You'll see:
   - Patient list
   - NO "Add Patient" button
   - User menu showing "Receptionist" role
   - Role info banner with limited access message

### Try Signup
1. Go to `/signup`
2. Fill in the form
3. Select a role
4. Submit to create a new demo account

## Current Implementation Notes

⚠️ **Demo Purpose**: This authentication is hardcoded for demonstration purposes.

### Demo Users
- Users are hardcoded in `lib/auth.ts`
- Data stored in browser localStorage
- No backend database required
- Session persists on page refresh
- Logout clears the session

### What to Note
- Passwords are visible in code (demo only)
- All users can be created during signup
- No email verification
- No password reset

## For Production

When moving to production:
1. Implement backend authentication API
2. Use secure JWT tokens
3. Hash passwords with bcrypt
4. Add email verification
5. Implement password reset
6. Add 2FA support
7. Use secure session management

## Customization

### Change Demo Users
Edit `frontend/lib/auth.ts`, find `DEMO_USERS` array and modify as needed.

### Add More Roles
1. Update `UserRole` type in `lib/auth.ts`
2. Add new users to `DEMO_USERS`
3. Update role checks in components

### Customize Colors
The pages use Tailwind CSS classes that respect the MIDAS theme defined in `globals.css`.

## Troubleshooting

**Q: Why is the "Add Patient" button not showing?**
A: You're likely logged in as a receptionist. Doctor role is needed to add patients.

**Q: Lost login session after refresh?**
A: Clear browser cache and try again. Session should persist in localStorage.

**Q: Want to test different roles?**
A: Use the logout button in the user menu (top-right) to switch accounts.

## File Locations Quick Reference

```
/app
  /login/page.tsx              ← Login page
  /signup/page.tsx             ← Signup page
  /page.tsx                    ← Main page (updated with auth)
/components
  /user-menu.tsx               ← User profile menu
  /protected-route.tsx         ← Route protection
/lib
  /auth.ts                     ← Auth logic
```

## Next Steps

1. ✅ Test with demo credentials
2. ✅ Try both doctor and receptionist accounts
3. ✅ Test signup process
4. ✅ Verify role-based features work
5. 📝 See `AUTH_SYSTEM_DOCUMENTATION.md` for detailed documentation
6. 🔗 When ready, integrate with backend authentication API

---

**Enjoy testing the MIDAS authentication system!** 🎉
