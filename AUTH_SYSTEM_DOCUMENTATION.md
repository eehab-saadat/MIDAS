# MIDAS Authentication & Role-Based Access Control

## Overview

The authentication system for MIDAS includes login/signup pages with role-based access control for two user roles: **Doctor** and **Receptionist/Nurse**.

## Features

### 1. **Authentication System**
- Login page with email/password validation
- Signup page with role selection
- Local storage-based session management (demo purposes)
- Hardcoded demo credentials for testing

### 2. **Two User Roles**

#### Doctor
- **Permissions**: Full access to all features
- **Features Available**:
  - View patient list
  - Add new patients
  - View patient details
  - Access AI diagnosis tools
  - All clinical features

#### Receptionist/Nurse
- **Permissions**: Limited access
- **Features Available**:
  - View patient list
  - View patient details
- **Restrictions**:
  - Cannot add new patients
  - Cannot access diagnosis tools
  - View-only access

## Demo Credentials

### Doctor Account
- **Email**: `doctor@midas.com`
- **Password**: `doctor123`
- **Role**: Doctor

### Receptionist/Nurse Account
- **Email**: `nurse@midas.com`
- **Password**: `nurse123`
- **Role**: Receptionist

## File Structure

```
frontend/
├── app/
│   ├── login/
│   │   └── page.tsx           # Login page component
│   ├── signup/
│   │   └── page.tsx           # Signup page component
│   └── page.tsx               # Main patients page (updated with auth)
├── components/
│   ├── user-menu.tsx          # User profile/logout menu
│   └── protected-route.tsx    # Route protection component
└── lib/
    └── auth.ts                # Authentication utilities
```

## Core Components

### 1. **auth.ts** - Authentication Utilities
Located at: `lib/auth.ts`

**Functions**:
- `getCurrentUser()` - Get current logged-in user
- `setCurrentUser(user)` - Set user in localStorage
- `loginUser(email, password)` - Authenticate user
- `signupUser(name, email, password, role)` - Register new user
- `logoutUser()` - Clear user session

**Types**:
```typescript
type UserRole = "doctor" | "receptionist";

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
```

### 2. **Login Page** (`app/login/page.tsx`)
- Email and password input fields
- Error messages display
- Demo credentials reference panel
- Link to signup page
- Follows MIDAS design language with gradient background
- Matches the application's color scheme (primary blue)

### 3. **Signup Page** (`app/signup/page.tsx`)
- Full name input
- Email input
- Password and confirm password fields
- Role selection dropdown (Doctor/Receptionist)
- Role-specific information display
- Form validation
- Link to login page

### 4. **User Menu Component** (`components/user-menu.tsx`)
- Displays user avatar with initials
- Shows user name and role
- Includes role-specific information
- Logout button
- Positioned in top-right corner next to theme toggle

### 5. **Protected Route Component** (`components/protected-route.tsx`)
- HOC for protecting routes based on authentication
- Optional role-based access control
- Redirects to login if not authenticated
- Shows loading state while checking auth

## Implementation Details

### Session Management
- User data is stored in `localStorage` with key `midas_user`
- Session persists across page refreshes
- Automatic redirect to login if session is not found

### Authentication Flow

#### Login
1. User enters email and password
2. System checks against hardcoded demo users
3. On success, user data is stored in localStorage
4. Redirected to main page (`/`)

#### Signup
1. User enters name, email, password, and role
2. System validates password match
3. On success, user data is stored in localStorage
4. Redirected to main page (`/`)

#### Logout
1. User clicks logout in user menu
2. Session is cleared from localStorage
3. Redirected to login page

### Role-Based Features on Main Page

#### Doctor Features
- ✅ "Add Patient" button visible
- ✅ Patient addition modal accessible
- ✅ Full patient management
- ✅ Role indicator badge

#### Receptionist/Nurse Features
- ❌ "Add Patient" button hidden
- ❌ Patient addition modal not accessible
- ✅ View patient list
- ✅ Role indicator badge

## Usage

### Starting the Application
```bash
cd frontend
npm install
npm run dev
```

Then visit `http://localhost:3000/login`

### First Login
1. Navigate to login page
2. Enter demo credentials (see Demo Credentials section)
3. You'll be redirected to the patients list page
4. Click user avatar in top-right to view profile and logout

### Testing Role-Based Access
1. Login as doctor - you'll see the "Add Patient" button
2. Logout
3. Login as receptionist - "Add Patient" button will be hidden
4. Both roles can view and click on patient details

## Design Language

The authentication pages follow the MIDAS design system:

### Color Scheme
- **Primary**: Teal/Cyan (oklch format)
- **Background**: Light neutral with gradient
- **Cards**: White with subtle borders
- **Dark Mode**: Supported with theme toggle

### Components Used
- Custom UI components from `@/components/ui`
- Lucide React icons
- Tailwind CSS for styling
- Shadcn/ui patterns

### Visual Elements
- Gradient backgrounds on auth pages
- Logo (MIDAS) centered
- Card-based form layout
- Error states with alert icons
- Demo credentials reference panel with color-coded sections
- Smooth transitions and hover effects
- Loading spinner during authentication

## Future Enhancements (When Moving to Production)

1. **Backend Integration**
   - Replace hardcoded users with API authentication
   - Implement JWT tokens
   - Add password hashing (bcrypt)
   - Add email verification

2. **Security**
   - Implement secure session cookies
   - Add CSRF protection
   - Add rate limiting
   - Implement 2FA

3. **Extended Roles**
   - Add admin role
   - Add technician role
   - Implement permission matrix

4. **User Management**
   - User profile page
   - Change password
   - Profile picture upload
   - Account settings

## Troubleshooting

### Blank Login Page
- Clear browser cache and localStorage
- Ensure JavaScript is enabled
- Check browser console for errors

### Cannot Login
- Verify email and password match demo credentials exactly
- Case-sensitive email field
- Clear localStorage: `localStorage.removeItem('midas_user')`

### "Add Patient" Button Not Showing
- Ensure you're logged in as a doctor
- Check role in user menu
- Refresh the page

### Session Lost After Refresh
- Check browser's localStorage settings
- Ensure localStorage is not disabled
- Check for any privacy mode restrictions

## Notes for Developers

### Adding New Roles
1. Update `UserRole` type in `lib/auth.ts`
2. Add new user in `DEMO_USERS` array
3. Update role-based logic in components
4. Update `UserMenu` component for new role display

### Modifying Demo Users
Edit the `DEMO_USERS` array in `lib/auth.ts`:
```typescript
const DEMO_USERS = [
  {
    id: "1",
    email: "your@email.com",
    password: "yourpassword",
    name: "Your Name",
    role: "doctor" as UserRole,
  },
  // ... more users
];
```

### Adding Route Protection
Wrap pages with `ProtectedRoute` component:
```typescript
import { ProtectedRoute } from "@/components/protected-route";

export default function SomePage() {
  return (
    <ProtectedRoute allowedRoles={["doctor"]}>
      {/* Your page content */}
    </ProtectedRoute>
  );
}
```
