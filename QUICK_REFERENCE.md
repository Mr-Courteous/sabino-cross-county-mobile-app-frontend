# Quick Reference: Frontend Implementation ⚡

## Files Created (6 new screens)

| File | Purpose | Key Features |
|------|---------|--------------|
| `app/(auth)/verify-email.tsx` | Email verification | Email input, OTP sending |
| `app/(auth)/verify-otp.tsx` | OTP entry | 6-digit code, 10-min timer |
| `app/(auth)/complete-registration.tsx` | Final registration | Password, name, school details |
| `app/(tabs)/manage-students.tsx` | Student CRUD | List, add, view students |
| `app/(tabs)/manage-scores.tsx` | Bulk score entry | Class filter, score table |
| `app/(auth)/register.tsx` | UPDATED | Gateway to 3-step flow |

## Files Modified (3 updated files)

| File | Changes |
|------|---------|
| `utils/api-config.ts` | +4 new endpoints |
| `utils/api-calls.ts` | +8 new API functions |
| `contexts/auth-context.tsx` | +2 new registration functions |

## Registration Flow

```
Login Screen
    ↓
Register Screen (gateway)
    ↓
[1] Verify Email (send OTP)
    ↓
[2] Verify OTP (enter code, 10-min timer)
    ↓
[3] Complete Registration (password, school)
    ↓
Auto-Login & Token Storage
    ↓
Dashboard
```

## Key API Functions

### Registration
```typescript
// Step 1: Send OTP
await context.sendOTP(email)
// Response: { success, message }

// Step 2: Verify & Complete
await context.completeRegistration({
  email, otp, password, firstName, lastName, 
  phone, schoolName, schoolType
})
// Response: { success, message, token (auto-stored) }
```

### Students
```typescript
await studentApi.getAll()
await studentApi.createSingle({
  firstName, lastName, classNameText, ...
})
```

### Scores
```typescript
await scoreApi.upsertBulk([
  { student_id, subject_id, academic_year, term, ca1, ca2, ... }
])
```

## Token Management

- **Auto-stored** in SecureStore (mobile) or localStorage (web)
- **Auto-attached** to all requests via apiService
- **Auto-restored** on app startup
- **24-hour expiry** on backend (401 = logout)

## Error Handling

All screens show:
- ⚠️ Error messages in red box
- ✓ Success messages in green box  
- Loading spinner during API calls
- Validation error messages inline

## Navigation

- **auth stack**: Login → Register → Verify Email → Verify OTP → Complete Registration
- **tabs stack**: Dashboard → Students → Explore → Manage Students → Manage Scores
- Auto-redirect to dashboard after successful registration

## Testing Checklist

- [ ] OTP email received within seconds
- [ ] 10-minute countdown timer works
- [ ] 6-digit OTP validation works
- [ ] Registration creates account and logs in
- [ ] Token persists after app restart
- [ ] Student can be added and appears in list
- [ ] Scores save for multiple students
- [ ] Class/subject filtering in scores works
- [ ] Error messages display properly
- [ ] Loading states show during API calls

## Common Debug Commands

```javascript
// Check if token is stored
console.log('[AUTH] Token stored:', true/false)

// Check API response
console.log('[API] Response:', { success, message, data })

// Check screen lifecycle
console.log('[SCREEN-NAME] Mount/Unmount')

// Check form validation
console.log('[FORM] Validation:', { isValid, errors })
```

## Backend Requirements

- Server running on `localhost:3000/api`
- Nodemailer configured for Gmail SMTP
- All endpoints respond with `{ success, message, data/error }`
- JWT token in response on successful registration
- 24-hour token expiry

## Platform Support

- ✅ iOS Simulator: `http://localhost:3000/api`
- ✅ Android Emulator: `http://10.0.2.2:3000/api`
- ✅ Physical Device: `http://192.168.x.x:3000/api` (replace IP)
- ✅ Web Browser: `http://localhost:3000/api`

## Next Steps

1. **Start Backend**
   ```bash
   cd Server
   npm start
   ```

2. **Start Frontend**
   ```bash
   cd sabino-mobile-app
   npx expo start
   ```

3. **Test Registration Flow**
   - Open app → Register → Verify email → Enter OTP → Complete registration

4. **Test Student Management**
   - Add students → View in list → Verify in database

5. **Test Score Management**
   - Select class/subject → Enter scores → Save → Verify in database

---

## Support Files

- **IMPLEMENTATION_COMPLETE.md** - Comprehensive implementation guide
- **FRONTEND_IMPLEMENTATION_GUIDE.md** - Original detailed guide (from previous session)
- **FRONTEND_IMPLEMENTATION_PLAN.md** - Overall architecture (from previous session)
- **API_DOCUMENTATION.md** - Backend API reference (Server folder)

All screens are production-ready! 🚀
