# Supabase Authentication Migration Plan
## From Device Tokens to Supabase Auth

> **🎯 KEY POINT**: Authentication is ONLY for the admin panel (`/admin/*`). Customer-facing features (menu, check-in, booking) remain completely public without any authentication.

---

## 📋 Project Overview

**Objective**: Replace the current device token authentication system with Supabase Authentication for better security, persistence, and maintainability.

**Scope**: 
- ✅ **Admin Panel** (`/admin/*`): Full authentication with indefinite sessions
- ✅ **Customer Pages** (menu, check-in, booking): Remain 100% public, no login required

**Timeline**: Estimated 3-5 days for complete implementation

**Key Benefits**:
- ✅ Indefinite session persistence (no 90-day expiration)
- ✅ Automatic token refresh in background
- ✅ Built-in security features (refresh token rotation, session management)
- ✅ Row Level Security (RLS) integration
- ✅ Less maintenance overhead
- ✅ Multi-device support
- ✅ Better security with auth hooks and custom claims

---

## 🎯 Architecture Overview

### Authentication Scope
**Important**: Authentication is ONLY for admin panel (`/admin/*` routes). Customer-facing pages (menu, check-in, booking) remain completely public without any authentication requirements.

**Public Routes (No Auth)**:
- `/` - Homepage
- `/menu` - Restaurant menu
- `/checkin` - Guest check-in
- `/booking` - Booking system
- Any other customer-facing pages

**Protected Routes (Auth Required)**:
- `/admin` - Admin dashboard
- `/admin/bookings` - Booking management
- `/admin/expenses` - Expense management
- `/admin/settings` - System settings
- All other `/admin/*` routes

---

## 🏗️ Phase 1: Setup & Configuration (Day 1)

### Task 1.1: Configure Supabase Auth Settings
**Description**: Configure authentication settings in Supabase Dashboard

**Acceptance Criteria**:
- [ ] Navigate to Authentication > Settings in Supabase Dashboard
- [ ] Set JWT expiry to 3600 seconds (1 hour) - default recommended
- [ ] Enable email confirmations (can be disabled for dev)
- [ ] Configure Site URL and Redirect URLs
- [ ] Review and configure session settings:
  - Time-box user sessions: Set to 0 (unlimited) for indefinite sessions
  - Inactivity timeout: Set to 0 (unlimited)
  - Single session per user: Keep disabled for multi-device support
- [ ] Save all configuration changes

**References**: 
- Supabase Dashboard > Project Settings > Auth
- JWT expiry between 5 minutes to 1 week (1 hour recommended)

---

### Task 1.2: Create Admin User Management Schema
**Description**: Set up database tables and roles for admin user management

**SQL Migration File**: `admin_auth_migration.sql`

```sql
-- Create user roles table for RBAC
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create admin metadata table
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  permissions JSONB DEFAULT '{}',
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_user_id ON public.admin_profiles(user_id);
```

**Acceptance Criteria**:
- [ ] Tables created successfully
- [ ] RLS enabled on both tables
- [ ] Indexes created for performance
- [ ] Run migration in Supabase SQL Editor
- [ ] Verify tables appear in Table Editor

---

### Task 1.3: Implement Custom Access Token Hook for RBAC
**Description**: Create auth hook for adding user role to JWT claims

**SQL Migration File**: `auth_hooks_migration.sql`

```sql
-- Create the auth hook function for custom claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  claims jsonb;
  user_role TEXT;
BEGIN
  -- Fetch the user role
  SELECT role INTO user_role 
  FROM public.user_roles 
  WHERE user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  
  IF user_role IS NOT NULL THEN
    -- Add user_role to claims
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    claims := jsonb_set(claims, '{is_admin}', to_jsonb(true));
  ELSE
    claims := jsonb_set(claims, '{user_role}', 'null');
    claims := jsonb_set(claims, '{is_admin}', to_jsonb(false));
  END IF;

  -- Update the claims in the event
  event := jsonb_set(event, '{claims}', claims);
  
  RETURN event;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT ALL ON TABLE public.user_roles TO supabase_auth_admin;
```

**Acceptance Criteria**:
- [ ] Function created successfully
- [ ] Permissions granted correctly
- [ ] Register hook in Supabase Dashboard (Auth > Hooks)
- [ ] Test hook triggers on authentication

---

## 🔐 Phase 2: RLS Policies Implementation (Day 1-2)

### Task 2.1: Create RLS Policies for Mixed Public/Admin Access
**Description**: Implement Row Level Security policies that allow public access for customer features while restricting admin operations

**SQL Migration File**: `rls_policies_mixed_access.sql`

```sql
-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$;

-- MENU ITEMS: Public read, Admin write
CREATE POLICY "Anyone can view menu items" 
ON public.menu_items FOR SELECT 
USING (true);  -- No authentication required!

CREATE POLICY "Only admins can modify menu items" 
ON public.menu_items FOR INSERT 
USING (public.is_admin());

CREATE POLICY "Only admins can update menu items" 
ON public.menu_items FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Only admins can delete menu items" 
ON public.menu_items FOR DELETE 
USING (public.is_admin());

-- BOOKINGS: Public create/view own, Admin full access
CREATE POLICY "Anyone can create bookings" 
ON public.bookings FOR INSERT 
USING (true);  -- Customers can book without auth

CREATE POLICY "Anyone can view bookings by reference" 
ON public.bookings FOR SELECT 
USING (true);  -- Allow check-in without auth

CREATE POLICY "Only admins can update bookings" 
ON public.bookings FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Only admins can delete bookings" 
ON public.bookings FOR DELETE 
USING (public.is_admin());

-- GUEST PROFILES: Public create (for check-in), Admin manage
CREATE POLICY "Anyone can create guest profiles" 
ON public.guest_profiles FOR INSERT 
USING (true);  -- For self check-in

CREATE POLICY "Guests can view own profile or admins view all" 
ON public.guest_profiles FOR SELECT 
USING (
  (auth.uid() IS NULL AND id = current_setting('request.headers')::json->>'x-guest-id')
  OR public.is_admin()
);

-- ADMIN-ONLY TABLES
-- Policies for user_roles table
CREATE POLICY "Only admins can view roles" 
ON public.user_roles FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Only super admins can manage roles" 
ON public.user_roles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Policies for admin_profiles table  
CREATE POLICY "Users can view their own profile" 
ON public.admin_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.admin_profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.admin_profiles FOR SELECT 
USING (public.is_admin());

-- EXPENSES: Admin only
CREATE POLICY "Only admins can view expenses" 
ON public.property_expenses FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Only admins can manage expenses" 
ON public.property_expenses FOR ALL 
USING (public.is_admin());
```

**Acceptance Criteria**:
- [ ] Public users can view menu without authentication
- [ ] Public users can create bookings without authentication
- [ ] Public users can check-in without authentication
- [ ] Only admins can modify menu items
- [ ] Only admins can manage bookings
- [ ] Admin-only tables completely restricted
- [ ] Test with anonymous users, authenticated non-admins, and admins

---

### Task 2.2: Update Existing Table RLS Policies
**Description**: Configure appropriate public and admin access for all existing tables

**SQL Migration File**: `existing_tables_rls_update.sql`

```sql
-- Helper function to check if user is admin (if not already created)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$;

-- ===== TABLES WITH PUBLIC READ ACCESS =====

-- Menu Categories: Public read, Admin write
CREATE POLICY "public_read_categories" ON public.menu_categories
FOR SELECT USING (true);

CREATE POLICY "admin_manage_categories" ON public.menu_categories
FOR ALL USING (public.is_admin());

-- Room Types/Rates: Public read for booking, Admin manage
CREATE POLICY "public_view_room_types" ON public.room_types
FOR SELECT USING (true);

CREATE POLICY "admin_manage_room_types" ON public.room_types
FOR ALL USING (public.is_admin());

-- ===== TABLES WITH MIXED ACCESS =====

-- Guests: Can self-register, Admin full access
CREATE POLICY "guests_self_register" ON public.guests
FOR INSERT USING (true);

CREATE POLICY "guests_view_own_or_admin" ON public.guests
FOR SELECT USING (
  id = current_setting('request.headers')::json->>'x-guest-id'
  OR public.is_admin()
);

CREATE POLICY "admin_manage_guests" ON public.guests
FOR UPDATE, DELETE USING (public.is_admin());

-- ===== ADMIN-ONLY TABLES =====

-- Properties
CREATE POLICY "admin_view_properties" ON public.properties
FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_manage_properties" ON public.properties
FOR ALL USING (public.is_admin());

-- Expenses
CREATE POLICY "admin_view_expenses" ON public.property_expenses
FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_manage_expenses" ON public.property_expenses
FOR ALL USING (public.is_admin());

-- Reports/Analytics
CREATE POLICY "admin_only_reports" ON public.reports
FOR ALL USING (public.is_admin());

-- Notifications
CREATE POLICY "admin_view_notifications" ON public.notifications
FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_manage_notifications" ON public.notifications
FOR ALL USING (public.is_admin());
```

**Acceptance Criteria**:
- [ ] Helper function created and working
- [ ] Public tables allow appropriate anonymous access
- [ ] Admin-only tables completely restricted
- [ ] Mixed-access tables have correct policies
- [ ] All policies tested with different user types
- [ ] No existing functionality broken
- [ ] Performance impact minimal (indexes added where needed)

---

## 💻 Phase 3: Frontend Implementation (Day 2-3)

### Task 3.1: Set Up Dual Supabase Client Configuration
**Description**: Configure separate Supabase clients for public and admin features

**File**: `src/lib/supabase-public.ts`

```typescript
// Client for customer-facing features (no auth needed)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,      // No session storage for public users
    autoRefreshToken: false,    // No token refresh needed
    detectSessionInUrl: false   // Ignore auth URLs
  }
})
```

**File**: `src/lib/supabase-admin.ts`

```typescript
// Client for admin panel (full auth features)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,        // Auto refresh in background
    persistSession: true,           // Persist to localStorage
    detectSessionInUrl: true,       // Handle magic links
    storage: window.localStorage,   // Use localStorage for persistence
    storageKey: 'supabase.auth.token', // Custom storage key
    flowType: 'pkce'               // Use PKCE flow for security
  }
})

// Export for convenience in admin components
export const supabase = supabaseAdmin
```

**Acceptance Criteria**:
- [ ] Environment variables configured in `.env.local`
- [ ] Public client has no auth persistence
- [ ] Admin client has full auth features
- [ ] Both clients connect successfully
- [ ] No auth overhead on public pages

---

### Task 3.2: Create Authentication Context Provider
**Description**: Build React context for auth state management (admin only)

**File**: `src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabaseAdmin } from '../lib/supabase-admin'  // Use admin client
import jwt_decode from 'jwt-decode'

interface AuthContextType {
  user: User | null
  session: Session | null
  userRole: string | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabaseAdmin.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Decode JWT for custom claims
      if (session?.access_token) {
        const decoded: any = jwt_decode(session.access_token)
        setUserRole(decoded.user_role || null)
        setIsAdmin(decoded.is_admin || false)
      }
      
      setLoading(false)
    })

    const { data: { subscription } } = supabaseAdmin.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.access_token) {
          const decoded: any = jwt_decode(session.access_token)
          setUserRole(decoded.user_role || null)
          setIsAdmin(decoded.is_admin || false)
        } else {
          setUserRole(null)
          setIsAdmin(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabaseAdmin.auth.signOut()
    if (error) throw error
  }

  const refreshSession = async () => {
    const { data, error } = await supabaseAdmin.auth.refreshSession()
    if (error) throw error
    setSession(data.session)
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      isAdmin,
      loading,
      signIn,
      signOut,
      refreshSession
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

**Acceptance Criteria**:
- [ ] Context provider created and exported
- [ ] Uses admin-specific Supabase client
- [ ] Auth state properly managed
- [ ] JWT claims decoded for role information
- [ ] Auth state changes subscribed
- [ ] Helper hook (useAuth) working
- [ ] Loading state handled properly

---

### Task 3.3: Replace AdminAuth Component
**Description**: Create new admin authentication component using Supabase Auth

**File**: `src/components/AdminAuth.tsx`

```typescript
import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

interface AdminAuthProps {
  children: React.ReactNode
}

const AdminAuth: React.FC<AdminAuthProps> = ({ children }) => {
  const { user, isAdmin, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Redirect non-admin users
  if (user && !isAdmin) {
    return <Navigate to="/unauthorized" replace />
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <div className="text-blue-500 text-4xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin Access</h2>
            <p className="text-gray-600">Sign in to access the admin panel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Session persists indefinitely until you sign out
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render children if authenticated and admin
  return <>{children}</>
}

export default AdminAuth
```

**Acceptance Criteria**:
- [ ] Component handles loading state
- [ ] Login form works correctly
- [ ] Error messages displayed properly
- [ ] Redirects non-admin users
- [ ] Renders children when authenticated
- [ ] Session persists on page refresh

---

### Task 3.4: Update App.tsx with Routing Structure
**Description**: Set up routing with clear separation between public and admin routes

**File**: `src/App.tsx`

```typescript
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// PUBLIC PAGES - No authentication required
import HomePage from './pages/HomePage'
import MenuPage from './pages/MenuPage'
import CheckInPage from './pages/CheckInPage'
import BookingPage from './pages/BookingPage'
import GuestPortal from './pages/GuestPortal'

// ADMIN COMPONENTS & PAGES - Authentication required
import AdminAuth from './components/AdminAuth'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminBookings from './pages/admin/AdminBookings'
import AdminExpenses from './pages/admin/AdminExpenses'
import AdminSettings from './pages/admin/AdminSettings'
import AdminReports from './pages/admin/AdminReports'
import AdminMenu from './pages/admin/AdminMenu'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ====== PUBLIC ROUTES - NO AUTHENTICATION ====== */}
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/menu/:categoryId" element={<MenuPage />} />
          <Route path="/checkin" element={<CheckInPage />} />
          <Route path="/checkin/:bookingRef" element={<CheckInPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/confirm" element={<BookingPage />} />
          <Route path="/guest/:guestId" element={<GuestPortal />} />
          
          {/* ====== ADMIN ROUTES - AUTHENTICATION REQUIRED ====== */}
          <Route path="/admin/*" element={
            <AdminAuth>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/dashboard" element={<AdminDashboard />} />
                <Route path="/bookings" element={<AdminBookings />} />
                <Route path="/bookings/:bookingId" element={<AdminBookings />} />
                <Route path="/expenses" element={<AdminExpenses />} />
                <Route path="/menu" element={<AdminMenu />} />
                <Route path="/reports" element={<AdminReports />} />
                <Route path="/settings" element={<AdminSettings />} />
              </Routes>
            </AdminAuth>
          } />
          
          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
```

**Acceptance Criteria**:
- [ ] AuthProvider wraps entire app
- [ ] Public routes accessible without authentication
- [ ] Admin routes protected by AdminAuth wrapper
- [ ] Clear separation between public and admin routes
- [ ] No authentication checks on public pages
- [ ] Admin auth only loads for `/admin/*` routes
- [ ] 404 handling for unknown routes

### Task 3.5: Implement Public Pages Without Authentication
**Description**: Ensure customer-facing pages work without any authentication

**File Example**: `src/pages/CheckInPage.tsx`

```typescript
import React, { useState } from 'react'
import { supabasePublic } from '../lib/supabase-public'  // Use public client

function CheckInPage() {
  const [bookingRef, setBookingRef] = useState('')
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Direct database access - RLS allows public reads
      const { data, error } = await supabasePublic
        .from('bookings')
        .select(`
          *,
          rooms (
            room_number,
            room_type
          )
        `)
        .eq('booking_reference', bookingRef)
        .single()

      if (error) throw error
      
      if (data) {
        // Process check-in without any auth checks
        const { error: updateError } = await supabasePublic
          .from('bookings')
          .update({ 
            check_in_time: new Date().toISOString(),
            status: 'checked_in' 
          })
          .eq('id', data.id)
        
        if (!updateError) {
          setBooking(data)
        }
      }
    } catch (error) {
      console.error('Check-in error:', error)
    } finally {
      setLoading(false)
    }
  }

  // No auth checks, no protected routes, just public functionality
  return (
    <div className="public-page">
      <h1>Guest Check-In</h1>
      {/* Check-in form - works without authentication */}
      <form onSubmit={handleCheckIn}>
        <input
          type="text"
          value={bookingRef}
          onChange={(e) => setBookingRef(e.target.value)}
          placeholder="Enter booking reference"
          required
        />
        <button type="submit" disabled={loading}>
          Check In
        </button>
      </form>
      
      {booking && (
        <div>
          <h2>Welcome, {booking.guest_name}!</h2>
          <p>Room: {booking.rooms?.room_number}</p>
        </div>
      )}
    </div>
  )
}

export default CheckInPage
```

**File Example**: `src/pages/MenuPage.tsx`

```typescript
import React, { useEffect, useState } from 'react'
import { supabasePublic } from '../lib/supabase-public'

function MenuPage() {
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])

  useEffect(() => {
    // Fetch menu data - no auth required
    fetchMenu()
  }, [])

  const fetchMenu = async () => {
    // Public read access via RLS
    const { data: items } = await supabasePublic
      .from('menu_items')
      .select(`
        *,
        menu_categories (
          name,
          description
        )
      `)
      .eq('is_available', true)
      .order('sort_order')

    if (items) {
      setMenuItems(items)
    }
  }

  // Completely public page - no auth logic
  return (
    <div className="menu-page">
      <h1>Our Menu</h1>
      <div className="menu-items">
        {menuItems.map(item => (
          <div key={item.id} className="menu-item">
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <span>${item.price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MenuPage
```

**Acceptance Criteria**:
- [ ] Public pages use `supabasePublic` client
- [ ] No authentication checks in public components
- [ ] RLS policies allow public read access
- [ ] Customer features work without login
- [ ] No auth-related UI on public pages
- [ ] Public pages load instantly without auth checks

## 🧪 Phase 4: Testing & Validation (Day 3-4)

### Task 4.1: Authentication Flow Testing
**Description**: Test all authentication scenarios including public access

**Test Cases**:
```typescript
// Test file: src/__tests__/auth.test.ts

describe('Public Access', () => {
  test('Menu page loads without authentication', async () => {
    // Test implementation
  })
  
  test('Check-in works without authentication', async () => {
    // Test implementation
  })
  
  test('Booking creation works without authentication', async () => {
    // Test implementation
  })
})

describe('Admin Authentication', () => {
  test('Admin routes redirect to login when not authenticated', async () => {
    // Test implementation
  })
  
  test('Admin can sign in with valid credentials', async () => {
    // Test implementation
  })
  
  test('Non-admin users cannot access admin panel', async () => {
    // Test implementation
  })
  
  test('Session persists after page refresh', async () => {
    // Test implementation
  })
  
  test('Token auto-refreshes before expiry', async () => {
    // Test implementation
  })
})
})
```

**Acceptance Criteria**:
- [ ] All test cases pass
- [ ] No console errors during auth flow
- [ ] Session persists across browser sessions
- [ ] Token refresh works automatically
- [ ] Sign out clears all auth data

---

### Task 4.2: RLS Policy Testing
**Description**: Verify Row Level Security policies work correctly for both public and admin access

**SQL Test Queries**:
```sql
-- Test PUBLIC ACCESS (should succeed)
-- As anonymous user
SELECT * FROM menu_items;  -- Should work
SELECT * FROM bookings WHERE booking_reference = 'TEST123';  -- Should work
INSERT INTO bookings (guest_name, email) VALUES ('Test', 'test@test.com');  -- Should work

-- Test ADMIN RESTRICTIONS (should fail for anonymous)
UPDATE menu_items SET price = 100 WHERE id = 1;  -- Should fail
DELETE FROM bookings WHERE id = 1;  -- Should fail
SELECT * FROM user_roles;  -- Should fail
SELECT * FROM property_expenses;  -- Should fail

-- Test as authenticated non-admin user
-- Sign in as regular user first
SELECT * FROM menu_items;  -- Should work (public read)
UPDATE menu_items SET price = 100;  -- Should fail (not admin)

-- Test as admin user
-- Sign in as admin first
SELECT * FROM bookings;  -- Should see all
UPDATE bookings SET status = 'confirmed';  -- Should work
SELECT * FROM user_roles;  -- Should work
SELECT * FROM property_expenses;  -- Should work
```

**JavaScript Test Cases**:
```javascript
// Test public access without auth
const { data: menuData } = await supabasePublic
  .from('menu_items')
  .select('*')  // Should succeed

const { data: bookingData } = await supabasePublic
  .from('bookings')
  .insert({ guest_name: 'John' })  // Should succeed

// Test admin operations require auth
const { error: updateError } = await supabasePublic
  .from('menu_items')
  .update({ price: 100 })
  .eq('id', 1)  // Should fail with RLS error

// Test with admin auth
await supabaseAdmin.auth.signInWithPassword({ email: 'admin@test.com', password: 'password' })
const { data: adminData } = await supabaseAdmin
  .from('property_expenses')
  .select('*')  // Should succeed for admin
```

**Acceptance Criteria**:
- [ ] Anonymous users can read public data (menu, etc.)
- [ ] Anonymous users can create bookings
- [ ] Anonymous users cannot access admin tables
- [ ] Anonymous users cannot modify any data except creating bookings/check-ins
- [ ] Regular authenticated users still cannot access admin features
- [ ] Admin users can access all data
- [ ] Admin users can modify all permitted data
- [ ] Service role bypasses all RLS (for migrations/seeds)

---

### Task 4.3: Performance Testing
**Description**: Ensure authentication doesn't impact performance

**Metrics to Monitor**:
- Initial page load time
- Time to authenticate
- Token refresh latency
- API response times with auth

**Acceptance Criteria**:
- [ ] Page load < 2 seconds
- [ ] Authentication < 1 second
- [ ] Token refresh transparent to user
- [ ] No noticeable API slowdown

---

## 🚀 Phase 5: Deployment & Cleanup (Day 4-5)

### Task 5.1: Create Initial Admin User
**Description**: Set up first admin user in the system

**SQL Script**:
```sql
-- After creating user via Supabase Auth
-- Insert admin role for the user
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_ID_FROM_AUTH>', 'super_admin');

-- Insert admin profile
INSERT INTO public.admin_profiles (user_id, full_name)
VALUES ('<USER_ID_FROM_AUTH>', 'System Administrator');
```

**Acceptance Criteria**:
- [ ] Admin user created in Auth
- [ ] Role assigned in user_roles table
- [ ] Profile created in admin_profiles
- [ ] Can sign in and access admin panel

---

### Task 5.2: Remove Device Token System
**Description**: Clean up old authentication code and tables

**Files to Remove/Update**:
- `device_tokens_migration.sql` - Archive
- `TOKEN_MANAGEMENT_GUIDE.md` - Archive
- Old `AdminAuth.tsx` - Deleted
- Device token related API calls - Removed

**SQL Cleanup**:
```sql
-- Drop device_tokens table (after confirming no longer needed)
DROP TABLE IF EXISTS device_tokens CASCADE;

-- Remove any device token related functions
DROP FUNCTION IF EXISTS validate_device_token CASCADE;
```

**Acceptance Criteria**:
- [ ] Old auth code removed
- [ ] Device token table dropped
- [ ] No references to device tokens in codebase
- [ ] Documentation updated
- [ ] Git commit with clear message

---

### Task 5.3: Update Documentation
**Description**: Document new authentication system with clear separation of public/admin access

**Files to Create/Update**:
- `AUTHENTICATION_GUIDE.md` - New comprehensive guide
- `README.md` - Update setup instructions
- `.env.example` - Add Supabase variables

**Documentation Template**:
```markdown
# Authentication Guide

## Overview
This application uses Supabase Authentication with Role-Based Access Control (RBAC) for the admin panel only. Customer-facing features (menu, check-in, booking) remain completely public without authentication.

## Architecture

### Public Pages (No Authentication)
- **Menu** (`/menu`) - Restaurant menu viewing
- **Check-in** (`/checkin`) - Guest self check-in
- **Booking** (`/booking`) - Table/room reservations
- **Guest Portal** (`/guest/*`) - Guest information access

These pages:
- Use `supabasePublic` client with no auth persistence
- Have RLS policies allowing public read/create access
- Never show login prompts or auth UI
- Work instantly without auth checks

### Admin Panel (Authentication Required)
- **Dashboard** (`/admin`) - Overview and analytics
- **Bookings** (`/admin/bookings`) - Manage all bookings
- **Expenses** (`/admin/expenses`) - Financial management
- **Settings** (`/admin/settings`) - System configuration

Admin pages:
- Use `supabaseAdmin` client with full auth
- Protected by AdminAuth wrapper component
- Require valid admin role in database
- Session persists indefinitely until logout

## Features
- Email/password authentication for admins
- Indefinite session persistence for admins
- Automatic token refresh
- Role-based access control
- Row Level Security
- Public access for customer features

## Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Never expose these in frontend:
SUPABASE_SERVICE_ROLE_KEY=your_service_key  # Backend only!
```

## RLS Policy Structure

### Public Access Tables
- `menu_items` - Anyone can read, admins can write
- `bookings` - Anyone can create/read, admins can manage
- `guest_profiles` - Guests can self-register, admins manage

### Admin-Only Tables
- `user_roles` - Admin role assignments
- `admin_profiles` - Admin user profiles
- `property_expenses` - Financial data
- `reports` - Business analytics

## Adding New Admins
1. Create user via Supabase Auth Dashboard
2. Add role in user_roles table:
   ```sql
   INSERT INTO user_roles (user_id, role) 
   VALUES ('<user_id>', 'admin');
   ```
3. User can now access `/admin` panel

## Security Best Practices
- Service keys only in backend/environment variables
- RLS enabled on all tables
- Public access carefully controlled via policies
- Admin operations require authentication
- Regular security audits of policies

## Troubleshooting

### Customer can't access menu/check-in
- Check RLS policies allow public SELECT
- Verify using `supabasePublic` client
- No auth checks in component code

### Admin can't log in
- Verify user exists in auth.users
- Check user_roles table has admin role
- Confirm email is verified (if required)
- Test with fresh incognito window

### Session not persisting
- Check `persistSession: true` in admin client
- Verify localStorage not being cleared
- Confirm JWT expiry settings (≥ 3600)
```

**Acceptance Criteria**:
- [ ] Clear distinction between public and admin access
- [ ] Environment variables documented
- [ ] RLS policy structure explained
- [ ] Admin management process clear
- [ ] Troubleshooting covers both public and admin scenarios
- [ ] Security best practices included
- [ ] README updated with new setup

---

## 📊 Success Metrics

### Functional Requirements Met
- ✅ Admin users remain logged in indefinitely
- ✅ No 90-day token expiration for admins
- ✅ Automatic session refresh for admins
- ✅ Multi-device support for admins
- ✅ Admin role enforcement on `/admin/*` routes
- ✅ **Customer pages remain completely public**
- ✅ **No authentication friction for customers**
- ✅ **Menu, check-in, booking work without login**

### Technical Requirements Met
- ✅ Supabase Auth integrated for admin panel
- ✅ RLS policies allow public customer access
- ✅ RLS policies restrict admin operations
- ✅ Custom claims in JWT for admin roles
- ✅ Dual Supabase client configuration
- ✅ React context for admin auth state
- ✅ Secure password authentication for admins
- ✅ Public pages use no authentication resources

### Performance Requirements Met
- ✅ Fast authentication for admins (< 1s)
- ✅ Transparent token refresh for admins
- ✅ **Zero authentication overhead on public pages**
- ✅ Public pages load instantly
- ✅ No auth checks on customer routes
- ✅ Efficient RLS policies with indexes

### User Experience Requirements Met
- ✅ Customers never see login screens
- ✅ Customers can book/check-in without accounts
- ✅ Admin panel fully secured
- ✅ Admins stay logged in indefinitely
- ✅ Clean separation of public/admin areas

---

## 🔧 Rollback Plan

If critical issues arise:

1. **Immediate Rollback**:
   - Revert to previous git commit
   - Restore device_tokens table from backup
   - Redeploy old authentication code
   - **Verify public pages still work without auth**

2. **Partial Rollback**:
   - Keep Supabase Auth for new features
   - Maintain device tokens for backward compatibility
   - **Ensure public access remains unaffected**
   - Gradual migration approach

3. **Data Recovery**:
   - All auth data in Supabase Auth dashboard
   - User sessions can be manually managed
   - Admin roles stored in database
   - **Public access requires no recovery**

**Critical**: Any rollback must maintain public access to customer features

---

## 📚 Resources & References

### Supabase Documentation
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Session Management](https://supabase.com/docs/guides/auth/sessions)

### Implementation Examples
- [React Authentication Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
- [Auth UI React Components](https://supabase.com/docs/guides/auth/quickstarts/react)

### Tools & Libraries
- `@supabase/supabase-js`: Core Supabase client
- `@supabase/auth-ui-react`: Pre-built auth UI (optional)
- `jwt-decode`: For decoding JWT tokens

---

## ✅ Final Checklist

Before considering migration complete:

- [ ] All device token code removed
- [ ] Supabase Auth fully functional for admin panel
- [ ] **Public pages work without authentication**
- [ ] **Customer features (menu, check-in, booking) tested without login**
- [ ] RLS policies allow appropriate public access
- [ ] RLS policies restrict admin operations
- [ ] Admin access properly restricted to `/admin/*` routes
- [ ] Sessions persist indefinitely for admins
- [ ] No auth prompts on public pages
- [ ] Dual Supabase client configuration working
- [ ] Documentation clearly separates public/admin access
- [ ] Team trained on public vs admin authentication
- [ ] Monitoring in place for both public and admin access
- [ ] Backup plan documented
- [ ] Production deployment successful

---

## 📝 Notes

- Keep service keys secure and never expose in frontend
- Public pages should NEVER import auth components
- Monitor Supabase Auth quotas for admin users only
- Consider implementing rate limiting on public endpoints
- Plan for admin password reset flow
- Set up email templates for admin auth in Supabase
- Configure custom domain for admin auth emails (optional)
- Consider implementing 2FA for admin users (future enhancement)
- Ensure RLS policies are optimized with proper indexes
- Test public access thoroughly in incognito mode

---

**Migration Status**: Ready to Begin
**Last Updated**: Current Date
**Owner**: Development Team