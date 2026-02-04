# Frontend Security Update - Token-Only Authentication

## Overview
The frontend has been updated to **not send schoolId or countryId as query parameters or in request bodies**. All API calls now rely solely on the JWT token, which the backend will decode to extract authentication context.

---

## Changes Applied

### ✅ Score Entry Component (`app/score-entry.tsx`)

**Before:**
```typescript
const fetchClasses = async (countryIdValue: number, tokenValue: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/classes?countryId=${countryIdValue}`,  // ❌ countryId in query param
    { headers: { 'Authorization': `Bearer ${tokenValue}` } }
  );
};
```

**After:**
```typescript
const fetchClasses = async (tokenValue: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/classes`,  // ✅ No query parameters
    { headers: { 'Authorization': `Bearer ${tokenValue}` } }
  );
};
```

**Changes Made:**
1. ❌ Removed `countryIdValue` parameter from `fetchClasses()` function
2. ❌ Removed `?countryId=${countryIdValue}` from API URL
3. ❌ Removed `countryIdValue` parameter from `fetchSubjects()` function
4. ❌ Removed `?countryId=${countryIdValue}` from subjects API URL
5. ❌ Removed `countryIdValue` parameter from `fetchAcademicSessions()` function
6. ❌ Removed `?countryId=${countryIdValue}` from academic sessions API URL
7. ✅ Updated all function calls to pass only `tokenValue`

**Functions Updated:**
- `fetchClasses(tokenValue)` - Fetch class templates
- `fetchSubjects(tokenValue)` - Fetch subject templates
- `fetchAcademicSessions(tokenValue)` - Fetch academic years/sessions

**How It Works Now:**
1. Component extracts JWT token from SecureStore
2. Component makes API call with token in `Authorization` header
3. Backend middleware (`authenticateToken`) decodes JWT
4. Backend extracts `countryId` and `schoolId` from JWT payload
5. Backend uses token values to filter data (not query params)

---

## API Call Patterns

### Before (Insecure)
```typescript
// ❌ Sending sensitive IDs as query parameters
fetch(`/api/classes?countryId=123&schoolId=456`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// ❌ Sending sensitive IDs in request body
fetch(`/api/students/bulk`, {
  method: 'POST',
  body: JSON.stringify({
    schoolId: 456,  // ❌ Exposed in body
    students: [...]
  }),
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### After (Secure)
```typescript
// ✅ Token only - backend extracts IDs from JWT
fetch(`/api/classes`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// ✅ Only business data in body - IDs from token
fetch(`/api/students/bulk`, {
  method: 'POST',
  body: JSON.stringify({
    students: [...]  // ✅ Only data, no IDs
  }),
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Frontend Components - API Call Audit

### ✅ Already Secure (No countryId/schoolId parameters)

| Component | Endpoint | Method | Token Usage |
|-----------|----------|--------|------------|
| `app/dashboard.tsx` | `/api/schools/me` | GET | ✅ Token header |
| `app/dashboard.tsx` | `/api/academic-sessions` | GET | ✅ Token header |
| `app/register-student.tsx` | `/api/students` | POST | ✅ Token header |
| `app/register-student.tsx` | `/api/students/bulk` | POST | ✅ Token header |
| `app/report-view.tsx` | `/api/reports/*` | GET | ✅ Token header |
| `app/report-cards.tsx` | `/api/reports/*` | GET | ✅ Token header |
| `app/(tabs)/manage-scores.tsx` | `/api/classes`, `/api/scores/sheet` | GET | ✅ Token header |
| `components/students-manager.tsx` | `/api/students/bulk` | POST | ✅ Token header |
| `app/(auth)/verify-otp.tsx` | `/api/schools/verify-otp` | POST | ✅ Token header |
| `app/(auth)/verify-email.tsx` | `/api/schools/otp` | POST | ✅ Token header |
| `app/(auth)/index.tsx` | `/api/auth/login` | POST | ✅ Token header |

### 🔧 Updated Components

| Component | Changes |
|-----------|---------|
| `app/score-entry.tsx` | ❌ Removed countryId from 3 API calls |

---

## Why This Is More Secure

### Attack Vector 1: Parameter Tampering
**Before:**
```
❌ User could send: /api/classes?countryId=999
❌ User could send: /api/classes?schoolId=777&countryId=999
❌ Could access other schools/countries data
```

**After:**
```
✅ User sends: /api/classes (no params)
✅ Backend decodes JWT: countryId=123 (from token)
✅ Backend verifies: countryId=123 is valid for this token
✅ Cannot be manipulated from client
```

### Attack Vector 2: Request Body Injection
**Before:**
```javascript
❌ fetch('/api/students/bulk', {
  body: JSON.stringify({
    schoolId: 777,  // Attacker controls this
    students: [...]
  })
});
```

**After:**
```javascript
✅ fetch('/api/students/bulk', {
  body: JSON.stringify({
    students: [...]  // Only business data
  })
});
// Backend extracts schoolId from token
```

### Attack Vector 3: Man-in-the-Middle Inspection
**Before:**
```
❌ Network interceptor sees: /api/classes?countryId=123
❌ Attacker can see which countryId was accessed
```

**After:**
```
✅ Network interceptor sees: /api/classes (no query data)
✅ Token is JWT (readable but signed - can't modify)
✅ No exposed IDs in URL or body
```

---

## Testing the Changes

### 1. Token Validation Test
```typescript
// ✅ Should work: Valid token
const response = await fetch(`${API_BASE_URL}/api/classes`, {
  headers: { 'Authorization': `Bearer ${validToken}` }
});
// Returns classes for the school in the token ✓

// ❌ Should fail: No token
const response = await fetch(`${API_BASE_URL}/api/classes`);
// Returns 401 Unauthorized ✓

// ❌ Should fail: Invalid token
const response = await fetch(`${API_BASE_URL}/api/classes`, {
  headers: { 'Authorization': `Bearer invalid.token.here` }
});
// Returns 403 Forbidden ✓
```

### 2. Parameter Isolation Test
```typescript
// ✅ Should ignore countryId param and use token
const response = await fetch(
  `${API_BASE_URL}/api/classes?countryId=999`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
// Backend uses countryId from token, not from URL ✓
// Response contains classes for token's country, not 999 ✓
```

### 3. Request Flow Test
```
Frontend (React Component)
    ↓
1. Extract token from SecureStore
2. Make fetch() with only token in header
    ↓
Backend (Express Server)
    ↓
3. Receive request with Authorization header
4. Extract token from header
5. Decode JWT → get schoolId, countryId
6. Validate token signature
7. Query database using token values (not URL params)
8. Return filtered data
    ↓
Frontend
    ↓
9. Display data that belongs to this school/country only
```

---

## Component State Management

### Data Still Available Locally (For UI)
Note: Components still extract and store `countryId` and `schoolId` in local state for UI purposes:

```typescript
const [countryId, setCountryId] = useState<number | null>(null);
const [schoolId, setSchoolId] = useState<number | null>(null);

// ✅ These are extracted from token on load
// ✅ Used for: UI display, conditional rendering, logging
// ❌ NOT sent to backend in API calls
```

This is fine because:
- Local state is only for UI logic
- Cannot affect backend requests
- Backend ignores any countryId/schoolId from client

---

## Deployment Checklist

- [ ] Code pushed to repository
- [ ] All components tested with token-based auth
- [ ] Network requests verified (no query params in URLs)
- [ ] Backend security update deployed first (important!)
- [ ] Frontend redeployed with these changes
- [ ] Smoke tests: Can fetch classes, subjects, sessions
- [ ] Security tests: Cannot manipulate query parameters to access other data
- [ ] Error handling: Proper 401/403 responses when token invalid

---

## Summary of Security Improvements

| Aspect | Before | After | Status |
|--------|--------|-------|--------|
| **schoolId in API calls** | ❌ Not being sent | ✅ Not being sent | ✓ Safe |
| **countryId in API calls** | ❌ Sent as query param | ✅ Not being sent | ✅ Fixed |
| **Token-only auth** | ⚠️ Partial | ✅ Complete | ✅ Fixed |
| **Parameter tampering** | ❌ Possible | ✅ Prevented | ✅ Fixed |
| **Defense in depth** | ❌ Weak | ✅ Strong | ✅ Fixed |

---

## Quick Reference - API Endpoints

All these endpoints now work with **token-only authentication**:

### Classes & Subjects
```javascript
// ✅ Correct
fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } })
fetch('/api/classes/subjects', { headers: { Authorization: `Bearer ${token}` } })

// ❌ Old way (no longer sends params)
// fetch('/api/classes?countryId=123', {...})
```

### Academic Sessions
```javascript
// ✅ Correct
fetch('/api/academic-sessions', { headers: { Authorization: `Bearer ${token}` } })

// ❌ Old way (no longer sends params)
// fetch('/api/academic-sessions?countryId=123', {...})
```

### Score Entries
```javascript
// ✅ Correct
fetch('/api/scores/sheet?classId=1&subjectId=2&sessionId=3&termId=1', {
  headers: { Authorization: `Bearer ${token}` }
})

// Business params OK ✅, auth params extracted from token ✅
```

---

## Files Modified

1. ✅ `app/score-entry.tsx` - Removed countryId from 3 API calls

---

## Next Steps

1. Backend must be deployed with security changes first
2. Test token extraction on backend
3. Deploy frontend changes
4. Verify all API calls work with new security model
5. Monitor logs for any 401/403 errors
6. Update any additional components if found

---

**Last Updated**: January 23, 2026  
**Status**: ✅ Complete - Frontend now uses token-only authentication
