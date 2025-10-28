# Authentication System

## Customer Authentication

### Features
- ✅ Customer registration
- ✅ Customer login/logout
- ✅ Protected routes
- ✅ User profile display
- ✅ Session management

### Pages

#### Login
- **URL**: `/login`
- **Features**:
  - Email/password authentication
  - Social login buttons (UI only, integration needed)
  - Remember me option
  - Forgot password link

#### Register  
- **URL**: `/register`
- **Features**:
  - Create new customer account
  - Auto-login after registration
  - Terms of service acceptance
  - Phone number (optional)

#### Account Dashboard
- **URL**: `/account`
- **Protected**: Yes
- **Features**:
  - Welcome message with customer name
  - Quick access to:
    - My Keys
    - Orders
    - Profile
    - Wishlist
    - Wallet
    - Settings
  - Statistics display

### API Endpoints Used

```typescript
// Customer Registration
POST /store/customers
{
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
}

// Customer Login
POST /store/auth
{
  email: string
  password: string
}

// Get Current Customer
GET /store/customers/me

// Logout
DELETE /store/auth
```

### Auth Context

Located in `src/contexts/AuthContext.tsx`, provides:
- `customer`: Current customer object
- `loading`: Authentication loading state
- `isAuthenticated`: Boolean authentication status
- `login(email, password)`: Login function
- `logout()`: Logout function
- `refreshCustomer()`: Refresh customer data

### Usage Example

```tsx
import { useAuth } from '@/contexts/AuthContext'

export default function MyComponent() {
  const { customer, isAuthenticated, logout } = useAuth()
  
  if (!isAuthenticated) {
    return <div>Please login</div>
  }
  
  return (
    <div>
      <p>Welcome, {customer.first_name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Protected Routes

Use the `ProtectedRoute` component to protect pages:

```tsx
import ProtectedRoute from '@/components/ProtectedRoute'

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <div>Your protected content here</div>
    </ProtectedRoute>
  )
}
```

---

## Admin Authentication

### Features
- ✅ Admin login
- ✅ Dashboard access
- ✅ Role-based access control

### Pages

#### Admin Login
- **URL**: `/admin`
- **Features**:
  - Admin email/password authentication
  - Redirects to Medusa Admin Dashboard
  - Default credentials shown

#### Admin Dashboard
- **URL**: `http://localhost:9000/app`
- **Backend Admin Panel**: Medusa's built-in admin interface

### Default Admin Credentials

```
Email: admin@digitalgamestore.com
Password: admin123
```

**⚠️ IMPORTANT**: Change these credentials in production!

### Creating New Admin Users

```bash
cd digital-game-store
npx medusa user --email admin@example.com --password your_password
```

### Admin API Endpoints

```typescript
// Admin Login
POST /admin/auth
{
  email: string
  password: string
}

// Admin Logout
DELETE /admin/auth
```

---

## Security Features

### Client-Side
- ✅ Token stored in localStorage
- ✅ Automatic redirect on 401
- ✅ Protected routes with authentication check
- ✅ Logout clears all stored data

### Server-Side
- ✅ JWT-based authentication
- ✅ HttpOnly cookies
- ✅ CORS configuration
- ✅ Password hashing

---

## Development

### Testing Authentication

1. **Register a Customer**:
   - Go to `/register`
   - Fill in the form
   - Auto-login after registration

2. **Login as Customer**:
   - Go to `/login`
   - Use registered credentials
   - Redirects to `/account`

3. **Access Admin**:
   - Go to `/admin`
   - Use: admin@digitalgamestore.com / admin123
   - Redirects to Medusa Admin

4. **Test Protected Routes**:
   - Try to access `/account` without login
   - Should redirect to `/login`

---

## Next Steps

### To Implement
- [ ] Password reset functionality
- [ ] Email verification
- [ ] OAuth social login (Google, Facebook)
- [ ] Two-factor authentication
- [ ] Session timeout
- [ ] Remember me functionality
- [ ] Account settings page

### Security Enhancements
- [ ] Rate limiting on login
- [ ] CAPTCHA on registration
- [ ] Password strength requirements
- [ ] Account lockout after failed attempts
- [ ] IP-based access control for admin

---

## Troubleshooting

### "Not authenticated" error
- Check if backend is running
- Verify API URLs in `.env.local`
- Clear localStorage and try again

### Admin dashboard not loading
- Ensure backend is running on port 9000
- Check admin user exists in database
- Verify CORS settings in `medusa-config.ts`

### Customer data not loading
- Check publishable API key configuration
- Verify sales channel linkage
- Check browser console for errors

