# Registration Error Handling & Debugging Guide

## Changes Made

### Backend (schoolController.js)
1. **All error responses now include `success: false` flag**
   - Field validation errors
   - OTP verification errors  
   - Duplicate email errors
   - Catch/exception errors

2. **Success response now includes JWT token**
   - Format: `{ success: true, message: '...', token: '...', data: { registration_code, school } }`
   - Token is generated immediately after school registration
   - Token enables auto-login on frontend

### Frontend

#### api-service.ts
- Spreads all response fields so frontend can access `token`, `message`, etc directly
- Returns both `success` flag and original backend data
- Better error logging on response failures

#### api-calls.ts (schoolApi.completeRegistration)
- Checks for `response.token` directly (not nested in `response.data.token`)
- Returns formatted response with all fields flattened

#### auth-context.tsx (completeRegistration function)
- Checks `if (response.success && response.token)` 
- Extracts user data from `response.data?.school`
- Stores token in both SecureStore (mobile) and localStorage (web)
- Returns `{ success, message }` to screen

#### complete-registration.tsx Screen
- Enhanced error display with better styling
- Shows clear ❌ error message box
- Logs all steps to console with [COMPLETE-REGISTRATION] prefix

---

## How to Debug

### 1. Check Network Response
Open browser DevTools → Network tab → Check `/schools` POST request:

**Expected Success Response (201):**
```json
{
  "success": true,
  "message": "School registered successfully",
  "token": "eyJhbGc...",
  "data": {
    "registration_code": "ABC123DE",
    "school": {
      "id": 1,
      "name": "School Name",
      "email": "admin@school.com",
      "school_type": "primary"
    }
  }
}
```

**Expected Error Response (400 or 500):**
```json
{
  "success": false,
  "message": "Error description shown to user",
  "error": "Technical error details",
  "data": {}
}
```

### 2. Check Console Logs

#### On Backend
```
✅ If registration successful:
[Backend logs JWT generation]
[Responds with token]

❌ If OTP invalid:
console.log("Invalid or expired verification code")

❌ If email already exists:
console.log("A school with this email is already registered")
```

#### On Frontend
Look for `[COMPLETE-REGISTRATION]` prefix:

```javascript
// These should appear in console:
[COMPLETE-REGISTRATION] Submitting registration data
[COMPLETE-REGISTRATION] Email: admin@school.com
[COMPLETE-REGISTRATION] OTP: 123456

[AUTH-CONTEXT] Completing registration...
📋 [AUTH-CONTEXT] Response: { success: true, message: '...', hasToken: true }
✅ [AUTH-CONTEXT] Registration successful...
💾 [AUTH-CONTEXT] Saving to SecureStore...
✅ [AUTH-CONTEXT] Saved to SecureStore

[COMPLETE-REGISTRATION] Registration successful!
[COMPLETE-REGISTRATION] Navigating to dashboard...
```

---

## Common Issues & Solutions

### Issue: "Registration failed" but no specific error message

**Possible Causes:**
1. Backend not returning proper error message
2. OTP database not set up correctly
3. JWT_SECRET not configured

**Solution:**
```javascript
// Check backend console:
- Look for "Verify OTP and check if expired" logs
- Check if email_verifications table has data
- Check if schools table creation succeeded
```

### Issue: Backend says success but frontend shows failed

**Possible Causes:**
1. Response format mismatch (token location wrong)
2. Frontend checking wrong field for success

**Solution:**
- Check the network response (see Debug Step 1 above)
- Verify `response.token` exists (not `response.data.token`)
- Look for 📋 log showing response structure

### Issue: Token not persisted after registration

**Possible Causes:**
1. SecureStore permissions issue
2. localStorage disabled
3. Token not properly set in apiService

**Solution:**
```javascript
// Check logs:
💾 [AUTH-CONTEXT] Saving to SecureStore...
✅ [AUTH-CONTEXT] Saved to SecureStore

// If saves fail, check:
- Platform.OS value (should be 'web' or 'ios'/'android')
- SecureStore import is correct
- Permissions granted in app.json
```

### Issue: User redirects to dashboard but session lost on refresh

**Cause:** Token not properly stored

**Solution:**
1. Check console for storage errors
2. Verify `localStorage.getItem('userToken')` returns token
3. Check SecureStore permissions in app.json

---

## Test Flow with Debugging

### Step 1: Open Registration
```
[AUTH-CONTEXT] Sending OTP to: admin@school.com
✅ [AUTH-CONTEXT] OTP sent successfully
```

### Step 2: Check Email for OTP
```
Backend: Email sent successfully via Nodemailer
Frontend: Countdown timer starts (10 minutes)
```

### Step 3: Enter OTP
```
[VERIFY-OTP] Verifying OTP: 123456 for email: admin@school.com
```

### Step 4: Complete Registration (THIS IS WHERE ERRORS SHOW)
```
[COMPLETE-REGISTRATION] Submitting registration data
[COMPLETE-REGISTRATION] Email: admin@school.com
[COMPLETE-REGISTRATION] OTP: 123456

🌐 API Request: POST http://localhost:3000/api/schools
📦 Request Body: { email, otp, password, name, school_type, ... }

📨 Raw Response (201): { success: true, token: "...", ... }
✅ API Success: 201

📋 [AUTH-CONTEXT] Response: { success: true, message: '...', hasToken: true }
✅ [AUTH-CONTEXT] Registration successful...
```

### If Error:
```
📨 Raw Response (400): { success: false, message: "Invalid OTP", error: "..." }
❌ API Error: 400 Invalid OTP

[AUTH-CONTEXT] Registration failed: Invalid OTP
```

---

## Response Format Reference

### What Backend Returns (Endpoint: POST /schools)

**Success (201):**
```json
{
  "success": true,
  "message": "School registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "registration_code": "5E7F2A1C",
    "school": {
      "id": 1,
      "registration_code": "5E7F2A1C",
      "name": "My School",
      "email": "admin@school.com",
      "school_type": "primary"
    }
  }
}
```

**Error - Invalid OTP (400):**
```json
{
  "success": false,
  "message": "Invalid or expired verification code",
  "error": "Invalid or expired verification code"
}
```

**Error - Email Exists (400):**
```json
{
  "success": false,
  "message": "A school with this email is already registered",
  "error": "A school with this email is already registered"
}
```

**Error - Server Error (500):**
```json
{
  "success": false,
  "message": "Registration failed. Please try again later.",
  "error": "Detailed error message from server"
}
```

---

## Frontend Response Handling

### In api-calls.ts:
```typescript
const response = await apiService.post(API_ENDPOINTS.SCHOOLS, {...});
// response now contains:
// - response.success (boolean)
// - response.token (string - JWT token)
// - response.message (string - user message)
// - response.data (object - school data)
// - response.error (string - if failed)
```

### In auth-context.tsx:
```typescript
const response = await schoolApi.completeRegistration(data);

// Check success
if (response.success && response.token) {
  // Store token and set user
  setToken(response.token);
  // Return success to screen
  return { success: true, message: response.message };
} else {
  // Return error to screen
  return { success: false, message: response.message };
}
```

### In complete-registration.tsx Screen:
```typescript
const result = await authContext.completeRegistration({...});

if (result.success) {
  // Navigate to dashboard
  router.replace('/(tabs)');
} else {
  // Display error message
  setError(result.message);
}
```

---

## Verify Everything Works

Run this in browser DevTools console after registration:

```javascript
// 1. Check token stored
localStorage.getItem('userToken')
// Should return: "eyJhbGc..."

// 2. Check user data
JSON.parse(localStorage.getItem('userData'))
// Should return: { schoolId: 1, email: "...", name: "...", type: "school" }

// 3. Check context token
// (In React DevTools, check AuthContext value)
```

---

## Summary of Fixes

| Component | Issue | Fix |
|-----------|-------|-----|
| Backend | Not returning token | Added JWT generation in registration endpoint |
| Backend | Inconsistent error format | Added `success: false` to all errors |
| Frontend | Checking wrong response field | Updated to check `response.token` directly |
| Frontend | Error not displaying | Improved error box styling and visibility |
| API Service | Response fields not accessible | Added spread operator to return all fields |
| Auth Context | Token not extracted properly | Updated to handle new response format |

All error messages now flow properly from backend → API service → Auth context → Screen display.
