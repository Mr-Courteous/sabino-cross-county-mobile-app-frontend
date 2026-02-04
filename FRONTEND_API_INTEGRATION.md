# Frontend API Integration Guide

## Overview

The Expo frontend has been fully connected to your backend API with:
- ✅ Complete API service layer
- ✅ Authentication context (login/register with JWT)
- ✅ School context for state management
- ✅ Secure token storage (expo-secure-store)
- ✅ Updated screens with real API calls

---

## 📦 What Was Added

### 1. **API Service Layer** (`utils/`)
- `api-config.ts` - API configuration and endpoints
- `api-service.ts` - Generic HTTP client with error handling
- `api-calls.ts` - Typed API functions for all features

### 2. **Context Providers** (`contexts/`)
- `auth-context.tsx` - Authentication state & functions
- `school-context.tsx` - School selection & management

### 3. **Updated Components**
- `app/_layout.tsx` - Added providers and auth-based routing
- `app/(tabs)/_layout.tsx` - Added logout button
- `app/(tabs)/index.tsx` - Fetch and display schools
- `app/(auth)/index.tsx` - Real login with API
- `app/(auth)/register.tsx` - Real registration with API

### 4. **New Dependencies**
- `expo-secure-store` - Secure token storage

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd sabino-mobile-app
npm install
```

### 2. Configure API Base URL

Edit `utils/api-config.ts`:

```typescript
// For local development (iOS simulator)
const API_BASE_URL = 'http://localhost:3000/api';

// For Android emulator
const API_BASE_URL = 'http://10.0.2.2:3000/api';

// For production
const API_BASE_URL = 'https://api.yourdomain.com/api';
```

### 3. Start the Server

Make sure backend is running:
```bash
# Terminal 1: Backend
cd Server
npm run dev

# Terminal 2: Frontend
cd sabino-mobile-app
npm start
```

---

## 🔐 Authentication Flow

### Register
```typescript
import { useAuth } from '@/contexts/auth-context';

const { register } = useAuth();

const success = await register(
  'admin@school.com',
  'password123',
  'John',
  'Doe',
  '+2348012345678'
);

if (success) {
  // Token is stored securely
  // User is logged in
}
```

### Login
```typescript
const { login } = useAuth();

const success = await login('admin@school.com', 'password123');

if (success) {
  // Token is stored securely
  // User is logged in
}
```

### Logout
```typescript
const { logout } = useAuth();

await logout();
// User is logged out
// Token is cleared
```

---

## 🏫 Using the API

### Import API Functions
```typescript
import {
  schoolApi,
  academicYearApi,
  classApi,
  studentApi,
  preferencesApi,
  subscriptionApi,
} from '@/utils/api-calls';
```

### Create School
```typescript
const response = await schoolApi.create({
  name: 'Test School',
  city: 'Lagos',
  address: '123 Main St',
});

if (response.success) {
  console.log('School created:', response.data?.school);
} else {
  console.error('Error:', response.error);
}
```

### Get All Schools
```typescript
const response = await schoolApi.getAll();

if (response.success) {
  const schools = response.data?.schools;
  // Use schools...
}
```

### Create Academic Year
```typescript
const response = await academicYearApi.create(schoolId, {
  startYear: 2024,
  endYear: 2025,
  isCurrent: true,
});
```

### Create Class
```typescript
const response = await classApi.create(schoolId, yearId, {
  className: 'JSS1',
  formTeacher: 'Mr. Johnson',
  capacity: 50,
});
```

### Create Student
```typescript
const response = await studentApi.create(schoolId, {
  classId: 1,
  firstName: 'Chioma',
  lastName: 'Okafor',
  admissionNumber: 'GSS/2024/001',
  gender: 'Female',
  parentName: 'Mrs. Okafor',
  parentPhone: '+2348012345678',
});
```

### Get School Preferences
```typescript
const response = await preferencesApi.get(schoolId);

if (response.success) {
  const prefs = response.data;
  // Use preferences...
}
```

### Update School Preferences
```typescript
const response = await preferencesApi.update(schoolId, {
  themeColor: '#1a73e8',
  logoUrl: 'https://example.com/logo.png',
  stampUrl: 'https://example.com/stamp.png',
});
```

### Get Subscription Plans
```typescript
const response = await subscriptionApi.getPlans();

if (response.success) {
  const plans = response.data?.plans;
  // Display plans...
}
```

### Subscribe to Plan
```typescript
const response = await subscriptionApi.subscribe(schoolId, planId);

if (response.success) {
  console.log('Subscribed successfully');
}
```

---

## 🎯 Using Contexts

### Auth Context
```typescript
import { useAuth } from '@/contexts/auth-context';

export function MyComponent() {
  const { user, isSignedIn, isLoading, login, register, logout } = useAuth();

  return (
    <View>
      {isSignedIn && <Text>Welcome, {user?.firstName}!</Text>}
    </View>
  );
}
```

### School Context
```typescript
import { useSchool } from '@/contexts/school-context';

export function SchoolSelector() {
  const { selectedSchool, schools, setSelectedSchool } = useSchool();

  return (
    <FlatList
      data={schools}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => setSelectedSchool(item)}>
          <Text>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
```

---

## 📝 Example: Complete Student Registration Flow

```typescript
import { useAuth } from '@/contexts/auth-context';
import { useSchool } from '@/contexts/school-context';
import { classApi, studentApi } from '@/utils/api-calls';

export function RegisterStudentScreen() {
  const { user } = useAuth();
  const { selectedSchool } = useSchool();
  const [classes, setClasses] = useState([]);

  // Load classes
  useEffect(() => {
    if (selectedSchool) {
      loadClasses();
    }
  }, [selectedSchool]);

  const loadClasses = async () => {
    const response = await classApi.getByYear(selectedSchool.id, yearId);
    if (response.success) {
      setClasses(response.data?.classes || []);
    }
  };

  const handleRegisterStudent = async (studentData) => {
    const response = await studentApi.create(selectedSchool.id, {
      ...studentData,
      classId: selectedClass.id,
    });

    if (response.success) {
      Alert.alert('Success', 'Student registered');
    } else {
      Alert.alert('Error', response.error);
    }
  };

  return (
    <View>
      {/* Student form */}
    </View>
  );
}
```

---

## 🛠️ Error Handling

All API calls return a consistent response format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

### Handle Errors
```typescript
const response = await schoolApi.create({ name: 'School' });

if (response.success) {
  // Success
  console.log(response.data);
} else {
  // Error
  console.error(response.error);
  Alert.alert('Error', response.error);
}
```

### Common Errors
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (not school owner)
- `404` - Not found
- `400` - Bad request (validation error)
- `500` - Server error

---

## 🔒 Security Notes

### Token Management
- Tokens are stored in secure storage automatically
- Tokens are included in all authenticated requests
- Tokens expire after 30 days (backend config)
- Logout clears the token

### Best Practices
- Never log token in console (except development)
- Always check `response.success` before using `response.data`
- Handle `401` errors by forcing re-login
- Validate user input before sending to API
- Use HTTPS in production

---

## 📱 Testing the Integration

### Test Login/Register
1. Start backend: `npm run dev`
2. Start frontend: `npm start`
3. Click "Register School"
4. Fill in all fields
5. Should redirect to dashboard

### Test School Creation
1. Login with registered account
2. Dashboard shows "No Schools Yet"
3. Create a school from API (or implement UI)
4. School appears in list

### Test School Selection
1. Multiple schools display
2. Tap a school to select it
3. Dashboard updates with selected school

---

## 🎓 Component Examples

### Create School Component
```typescript
import { schoolApi } from '@/utils/api-calls';
import { useState } from 'react';
import { TextInput, TouchableOpacity, Text, Alert } from 'react-native';

export function CreateSchoolForm() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const response = await schoolApi.create({ name, city });
    setLoading(false);

    if (response.success) {
      Alert.alert('Success', 'School created');
      setName('');
      setCity('');
    } else {
      Alert.alert('Error', response.error);
    }
  };

  return (
    <>
      <TextInput
        placeholder="School Name"
        value={name}
        onChangeText={setName}
        editable={!loading}
      />
      <TextInput
        placeholder="City"
        value={city}
        onChangeText={setCity}
        editable={!loading}
      />
      <TouchableOpacity onPress={handleCreate} disabled={loading}>
        <Text>{loading ? 'Creating...' : 'Create'}</Text>
      </TouchableOpacity>
    </>
  );
}
```

### Students List Component
```typescript
import { studentApi } from '@/utils/api-calls';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, Text, View } from 'react-native';
import { useCallback, useState } from 'react';

export function StudentsList({ schoolId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [schoolId])
  );

  const loadStudents = async () => {
    setLoading(true);
    const response = await studentApi.getAll(schoolId);
    if (response.success) {
      setStudents(response.data?.students || []);
    }
    setLoading(false);
  };

  return (
    <FlatList
      data={students}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <View style={{ padding: 15, borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text style={{ fontWeight: '600' }}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={{ color: '#666' }}>{item.admission_number}</Text>
        </View>
      )}
      onRefresh={loadStudents}
      refreshing={loading}
    />
  );
}
```

---

## 🐛 Troubleshooting

### "Network Error"
- Ensure backend is running
- Check API_BASE_URL is correct
- On Android emulator, use `http://10.0.2.2:3000/api`
- On iOS simulator, use `http://localhost:3000/api`

### "401 Unauthorized"
- Token may have expired
- User needs to login again
- Check token is being stored properly

### "Cannot connect to localhost"
- Backend not running?
- Port 3000 in use?
- Check firewall settings

### "CORS Error"
- Backend should have CORS enabled
- Check backend `index.js` has `cors()` middleware

---

## 📚 API Reference

See [API_DOCUMENTATION.md](../Server/API_DOCUMENTATION.md) in the backend folder for complete endpoint details.

---

## ✅ Checklist

- [x] API service layer created
- [x] Auth context implemented
- [x] School context implemented
- [x] Login screen connected
- [x] Register screen connected
- [x] Dashboard shows schools
- [x] Logout button added
- [x] Secure token storage
- [x] Error handling
- [ ] Student registration form (next)
- [ ] Students list (next)
- [ ] School preferences form (next)
- [ ] Class management (next)

---

Everything is ready to build additional screens! 🎉
