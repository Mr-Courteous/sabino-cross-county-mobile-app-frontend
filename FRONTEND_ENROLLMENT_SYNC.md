# Frontend Enrollment Sync - Refactored Screens

## Overview

All three Expo screens have been refactored to sync with the new enrollment-based backend API. No Context Provider is used; instead, all fetch calls are performed directly within each component using `SecureStore` (native) or `localStorage` (web) for token management.

---

## Architecture

### Token Management Pattern

```tsx
const getToken = async () => {
  return Platform.OS !== 'web' 
    ? await SecureStore.getItemAsync('userToken') 
    : localStorage.getItem('userToken');
};
```

All components import:
- `API_BASE_URL` from `@/utils/api-service`
- `SecureStore` from `'expo-secure-store'`
- Standard React Native modules

---

## 1. Dashboard Screen (`dashboard.tsx`)

### Purpose
- Load school profile on mount
- **Fetch and cache the active academic session**
- Store `sessionId` locally for use by other screens

### Key Changes

#### State Management
```tsx
const [schoolData, setSchoolData] = useState<any>(null);
const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
const [loading, setLoading] = useState(true);
```

#### On Mount: Dual Fetch
```tsx
useEffect(() => {
  const fetchDashboardData = async () => {
    // 1. Fetch school profile
    const schoolResponse = await fetch(`${API_BASE_URL}/api/schools/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const schoolResult = await schoolResponse.json();
    setSchoolData(schoolResult.data);

    // 2. Fetch active academic session
    const sessionResponse = await fetch(`${API_BASE_URL}/api/academic-sessions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const sessionResult = await sessionResponse.json();
    
    // Find active session
    const activeSession = sessionResult.data.find((s: any) => s.is_active);
    if (activeSession) {
      setActiveSessionId(activeSession.id);
      
      // Store sessionId locally for other screens
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync('activeSessionId', String(activeSession.id));
      } else {
        localStorage.setItem('activeSessionId', String(activeSession.id));
      }
    }
  };
  
  fetchDashboardData();
}, []);
```

### API Endpoints Used
- `GET /api/schools/me` → School profile with logo, name, email
- `GET /api/academic-sessions` → All sessions; filters for `is_active === true`

### Usage Flow
1. User logs in → Dashboard loads
2. Dashboard fetches active session ID
3. SessionId stored in device storage
4. Other screens can retrieve via `SecureStore.getItemAsync('activeSessionId')`

---

## 2. Register Student Screen (`register-student.tsx`)

### Purpose
- Register new students
- **Trigger enrollment transaction on creation**
- Present class and session selectors
- Update student info (no enrollment changes on edit)

### Key Changes

#### New State for Filters
```tsx
const [classes, setClasses] = useState<any[]>([]);
const [sessions, setSessions] = useState<any[]>([]);
const [selectedClass, setSelectedClass] = useState<number | null>(null);
const [selectedSession, setSelectedSession] = useState<number | null>(null);
const [loadingFilters, setLoadingFilters] = useState(false);
```

#### Fetch Classes and Sessions
```tsx
const fetchClassesAndSessions = async () => {
  setLoadingFilters(true);
  const token = await getToken();
  
  const [classRes, sessionRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/classes`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    }),
    fetch(`${API_BASE_URL}/api/academic-sessions`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    })
  ]);

  const classData = await classRes.json();
  const sessionData = await sessionRes.json();

  if (classData.success) {
    setClasses(classData.data);
    if (classData.data.length > 0) setSelectedClass(classData.data[0].id);
  }

  if (sessionData.success) {
    setSessions(sessionData.data);
    const activeSession = sessionData.data.find((s: any) => s.is_active);
    if (activeSession) {
      setSelectedSession(activeSession.id);
    } else if (sessionData.data.length > 0) {
      setSelectedSession(sessionData.data[0].id);
    }
  }

  setLoadingFilters(false);
};
```

#### UI: Class & Session Selectors
```tsx
{/* Class Selector */}
<Text style={styles.label}>Select Class</Text>
<ScrollView horizontal>
  {classes.map((cls: any) => (
    <TouchableOpacity
      key={cls.id}
      style={[styles.filterChip, selectedClass === cls.id && styles.filterChipActive]}
      onPress={() => setSelectedClass(cls.id)}
    >
      <Text style={[styles.filterChipText, ...]}>
        {cls.class_name}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>

{/* Session Selector */}
<Text style={styles.label}>Select Session</Text>
<ScrollView horizontal>
  {sessions.map((session: any) => (
    <TouchableOpacity
      key={session.id}
      style={[styles.filterChip, selectedSession === session.id && styles.filterChipActive]}
      onPress={() => setSelectedSession(session.id)}
    >
      <Text style={[styles.filterChipText, ...]}>
        {session.session_name}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

#### Create Student WITH Enrollment Transaction
```tsx
const handleSave = async () => {
  // Validation
  if (!form.firstName || !form.lastName) {
    Alert.alert("Error", "Names are required");
    return;
  }
  if (!selectedClass) {
    Alert.alert("Error", "Please select a class");
    return;
  }
  if (!selectedSession) {
    Alert.alert("Error", "Please select a session");
    return;
  }

  if (editingId) {
    // Update existing: no enrollment changes
    const response = await fetch(`${API_BASE_URL}/api/students/${editingId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form)
    });
    // Handle response...
  } else {
    // CREATE NEW with auto-enrollment transaction
    const payload = {
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email,
      registration_number: form.registrationNumber,
      gender: form.gender,
      classId: selectedClass,        // REQUIRED: triggers enrollment
      sessionId: selectedSession      // OPTIONAL: uses active if not provided
    };

    const response = await fetch(`${API_BASE_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.success) {
      // Backend returns { student, enrollment } from transaction
      console.log("Student created:", result.data.student);
      console.log("Enrollment created:", result.data.enrollment);
      // Refresh list and show success
    }
  }
};
```

### API Endpoints Used
- `GET /api/classes` → All classes for school (filtered by school_id)
- `GET /api/academic-sessions` → All sessions for school
- `POST /api/students` → Create student + enrollment (transaction)
  - **Body**: `{ first_name, last_name, email, registration_number, gender, classId, sessionId }`
  - **Response**: `{ success, data: { student, enrollment } }`
- `PUT /api/students/:id` → Update student info only
- `GET /api/students` → Fetch all students
- `DELETE /api/students/:id` → Delete student

### Button Text Updated
- Before: "REGISTER STUDENT"
- **After: "REGISTER & ENROLL"** (emphasizes automatic enrollment)

---

## 3. Score Entry Screen (`score-entry.tsx`)

### Purpose
- Enter scores for students in a class, subject, and term
- **Use enrollment_id as the primary key for score mapping**
- Display database-calculated `total_score`
- Only send changed score fields (COALESCE support)

### Key Changes

#### State Management
```tsx
const [classes, setClasses] = useState([]);
const [subjects, setSubjects] = useState([]);
const [sessions, setSessions] = useState<any[]>([]); // NEW

const [selectedClass, setSelectedClass] = useState<number | null>(null);
const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
const [selectedTerm, setSelectedTerm] = useState<number>(1); // 1, 2, or 3 (numeric)
const [selectedSession, setSelectedSession] = useState<number | null>(null); // NEW

const [students, setStudents] = useState([]);
```

#### Fetch All Filters on Mount
```tsx
const fetchFilters = async () => {
  const token = await getToken();
  const headers = { 'Authorization': `Bearer ${token}` };

  const [resClasses, resSubjects, resSessions] = await Promise.all([
    fetch(`${API_BASE_URL}/api/classes`, { headers }),
    fetch(`${API_BASE_URL}/api/classes/subjects`, { headers }),
    fetch(`${API_BASE_URL}/api/academic-sessions`, { headers })  // NEW
  ]);

  const dataClasses = await resClasses.json();
  const dataSubjects = await resSubjects.json();
  const dataSessions = await resSessions.json();              // NEW

  if (dataClasses.success) {
    setClasses(dataClasses.data);
    if (dataClasses.data.length > 0) setSelectedClass(dataClasses.data[0].id);
  }

  if (dataSubjects.success) {
    setSubjects(dataSubjects.data);
    if (dataSubjects.data.length > 0) setSelectedSubject(dataSubjects.data[0].id);
  }

  if (dataSessions.success) {                               // NEW
    setSessions(dataSessions.data);
    const activeSession = dataSessions.data.find((s: any) => s.is_active);
    if (activeSession) {
      setSelectedSession(activeSession.id);
    } else if (dataSessions.data.length > 0) {
      setSelectedSession(dataSessions.data[0].id);
    }
  }
};
```

#### Fetch Students Using New Endpoint
```tsx
const fetchClassSheet = async () => {
  setLoading(true);
  const token = await getToken();
  
  // NEW ENDPOINT: Students mapped by enrollment_id
  const url = `${API_BASE_URL}/api/students/search?classId=${selectedClass}&subjectId=${selectedSubject}&sessionId=${selectedSession}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const result = await response.json();
  if (result.success) {
    // Students array includes: id, enrollment_id, first_name, last_name, 
    // ca1_score, ca2_score, exam_score, total_score
    setStudents(result.data);
  }
  
  setLoading(false);
};
```

#### Update Scores Using enrollment_id
```tsx
const handleUpdateScore = (enrollmentId: number, field: string, value: string) => {
  setStudents(prev => prev.map(s => 
    s.enrollment_id === enrollmentId ? { ...s, [field]: value } : s
  ));
};

// Usage in TextInput:
<TextInput 
  keyboardType="numeric" 
  placeholder="0" 
  value={String(item.ca1_score || '')} 
  onChangeText={(val) => handleUpdateScore(item.enrollment_id, 'ca1_score', val)}
/>
```

#### UI: Multi-Filter Header

**Before**: Only class selector
```
[Class A] [Class B] ...
```

**After**: Class, Subject, Term, Session selectors
```
Class
[Class A] [Class B] ...

Subject
[Math] [English] ...

Term
[Term 1] [Term 2] [Term 3]

Session
[2025/2026] [2024/2025] ...
```

```tsx
<LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
  {/* Class Filter */}
  <Text style={styles.filterLabel}>Class</Text>
  <ScrollView horizontal>
    {classes.map(c => (
      <TouchableOpacity 
        key={c.id} 
        onPress={() => setSelectedClass(c.id)}
        style={[styles.chip, selectedClass === c.id && styles.activeChip]}
      >
        <Text style={[styles.chipText, ...]}>
          {c.class_name}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>

  {/* Subject Filter */}
  <Text style={styles.filterLabel}>Subject</Text>
  <ScrollView horizontal>
    {subjects.map(s => (
      <TouchableOpacity 
        key={s.id} 
        onPress={() => setSelectedSubject(s.id)}
        style={[styles.chip, selectedSubject === s.id && styles.activeChip]}
      >
        <Text style={[styles.chipText, ...]}>
          {s.subject_name}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>

  {/* Term Selector */}
  <Text style={styles.filterLabel}>Term</Text>
  <ScrollView horizontal>
    {[1, 2, 3].map(t => (
      <TouchableOpacity 
        key={t} 
        onPress={() => setSelectedTerm(t)}
        style={[styles.chip, selectedTerm === t && styles.activeChip]}
      >
        <Text style={[styles.chipText, ...]}>
          Term {t}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>

  {/* Session Filter */}
  <Text style={styles.filterLabel}>Session</Text>
  <ScrollView horizontal>
    {sessions.map(sess => (
      <TouchableOpacity 
        key={sess.id} 
        onPress={() => setSelectedSession(sess.id)}
        style={[styles.chip, selectedSession === sess.id && styles.activeChip]}
      >
        <Text style={[styles.chipText, ...]}>
          {sess.session_name}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</LinearGradient>
```

#### Save Scores: Only Changed Fields
```tsx
const saveAll = async () => {
  setSaving(true);
  const token = await getToken();
  
  // Only send fields with values (COALESCE support)
  const payload = students.map(s => {
    const scoreData: any = {
      enrollment_id: s.enrollment_id,        // KEY CHANGE: use enrollment_id
      subject_id: selectedSubject,
      term: selectedTerm                      // numeric: 1, 2, or 3
    };

    // Only include fields that have values
    if (s.ca1_score !== '' && s.ca1_score !== undefined) {
      scoreData.ca1_score = parseFloat(s.ca1_score);
    }
    if (s.ca2_score !== '' && s.ca2_score !== undefined) {
      scoreData.ca2_score = parseFloat(s.ca2_score);
    }
    if (s.exam_score !== '' && s.exam_score !== undefined) {
      scoreData.exam_score = parseFloat(s.exam_score);
    }

    return scoreData;
  });

  const res = await fetch(`${API_BASE_URL}/api/scores/upsert-bulk`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ scores: payload })
  });

  const data = await res.json();
  if (data.success) {
    // Response includes total_score from generated column
    if (data.data && data.data.length > 0) {
      // Update local with returned data (includes total_score)
      setStudents(data.data);
    }
    Alert.alert("Success", "Scores saved with automatic totals.");
  }
  
  setSaving(false);
};
```

#### Display Total Score
```tsx
{/* Score inputs */}
<View style={styles.inputBox}>
  <Text style={styles.label}>CA1</Text>
  <TextInput style={styles.input} {...} />
</View>
<View style={styles.inputBox}>
  <Text style={styles.label}>CA2</Text>
  <TextInput style={styles.input} {...} />
</View>
<View style={styles.inputBox}>
  <Text style={styles.label}>Exam</Text>
  <TextInput style={styles.input} {...} />
</View>

{/* Total Score from database generated column */}
{item.total_score !== undefined && (
  <View style={styles.totalBox}>
    <Text style={styles.label}>Total</Text>
    <Text style={styles.totalScore}>{item.total_score}</Text>
  </View>
)}
```

### API Endpoints Used
- `GET /api/classes` → All classes
- `GET /api/classes/subjects` → All subjects
- `GET /api/academic-sessions` → All sessions
- `GET /api/students/search?classId=X&subjectId=Y&sessionId=Z` → Students for class/subject/session
  - **Response**: `{ success, data: [{ id, enrollment_id, first_name, last_name, ca1_score, ca2_score, exam_score, total_score }, ...] }`
- `POST /api/scores/upsert-bulk` → Save scores
  - **Body**: `{ scores: [{ enrollment_id, subject_id, term, ca1_score?, ca2_score?, exam_score? }, ...] }`
  - **Response**: `{ success, data: [{ enrollment_id, ..., total_score }, ...] }`

---

## Data Flow Summary

### Student Registration Flow
```
Dashboard
  ↓ (on mount)
  └─→ Fetch active session ID
      └─→ Store in SecureStore/localStorage
      
Register Student
  ↓ (on mount)
  ├─→ Fetch classes
  ├─→ Fetch sessions
  └─→ User selects class + session
      ↓
      POST /api/students (classId + sessionId in body)
      └─→ Backend creates Student + Enrollment (transaction)
          └─→ Response: { student, enrollment }
```

### Score Entry Flow
```
Score Entry
  ↓ (on mount)
  ├─→ Fetch classes
  ├─→ Fetch subjects
  └─→ Fetch sessions (active by default)
  
  ↓ (user selects filters)
  └─→ GET /api/students/search (classId, subjectId, sessionId)
      └─→ Response: Students with enrollment_id
  
  ↓ (user enters scores)
  └─→ handleUpdateScore updates local state using enrollment_id
  
  ↓ (user taps save)
  └─→ POST /api/scores/upsert-bulk (enrollment_id as key)
      └─→ Backend calculates total_score (generated column)
          └─→ Response includes total_score
              └─→ Update UI display
```

---

## Key Implementation Details

### 1. Token Retrieval
All screens use this pattern:
```tsx
const getToken = async () => {
  return Platform.OS !== 'web' 
    ? await SecureStore.getItemAsync('userToken') 
    : localStorage.getItem('userToken');
};
```

### 2. Enrollment ID Mapping
- **Before**: Students identified by `student_id` in scores
- **After**: Students identified by `enrollment_id` in scores
- Each enrollment links student → class → session

### 3. Term as Numeric
- **Before**: Term as string ("First Term", "Second Term", "Third Term")
- **After**: Term as numeric (1, 2, 3)
- Cleaner API, easier filtering

### 4. COALESCE Support
- Only send score fields that have values
- Backend uses COALESCE to preserve existing scores
- Example:
  ```
  User enters only CA1: { enrollment_id: 5, subject_id: 2, term: 1, ca1_score: 18 }
  Backend: ca1_score = 18, ca2_score = COALESCE(NULL, existing), exam_score = COALESCE(NULL, existing)
  ```

### 5. Auto-Enrollment Transaction
- When creating a student with classId + sessionId:
  ```tsx
  POST /api/students {
    first_name: "John",
    last_name: "Doe",
    classId: 5,      // Required
    sessionId: 12    // Triggers enrollment creation
  }
  ```
  Backend creates:
  1. Student record
  2. Enrollment record linking student → class → session
  3. Response includes both as: `{ student: {...}, enrollment: {...} }`

### 6. Filter Dependencies
- `selectedTerm` is numeric (1, 2, 3) not string
- `selectedSession` is the session ID (integer FK)
- `fetchClassSheet()` only triggers when all filters selected (class + subject + session)

---

## Testing Checklist

### Dashboard
- [ ] Load dashboard
- [ ] Verify school data displays correctly
- [ ] Check that `activeSessionId` is stored in device storage
- [ ] Confirm no errors in console

### Register Student
- [ ] Load register student screen
- [ ] Verify class dropdown populates
- [ ] Verify session dropdown populates (active marked)
- [ ] Create new student with class + session selected
- [ ] Confirm response includes both `student` and `enrollment`
- [ ] Verify students list updates immediately
- [ ] Update existing student (no enrollment changes)
- [ ] Delete student

### Score Entry
- [ ] Load score entry screen
- [ ] Verify all four filter dropdowns populate (class, subject, term, session)
- [ ] Select class + subject + term + session
- [ ] Verify students list loads with `enrollment_id`
- [ ] Enter scores for CA1 only (test COALESCE)
- [ ] Save and verify response includes `total_score`
- [ ] Verify total_score displays on card
- [ ] Enter scores for CA2 and Exam
- [ ] Save again and confirm totals update

---

## Error Handling

### Network Errors
All fetch operations wrapped in try-catch:
```tsx
try {
  const response = await fetch(url, { headers });
  const result = await response.json();
  if (result.success) {
    // Handle success
  } else {
    Alert.alert("Error", result.message);
  }
} catch (error) {
  console.error("Fetch error:", error);
  Alert.alert("Error", "Network request failed");
}
```

### Validation Errors
- Student name required
- Class selection required
- Session selection required
- All displayed via `Alert.alert()`

### API Response Format
All endpoints return:
```json
{
  "success": true/false,
  "data": {...},
  "message": "error message if !success"
}
```

---

## Migration from Old API

### Before (Old API)
```
POST /api/students
  - No classId or sessionId
  - No auto-enrollment
  
POST /api/enrollments/create
  - academicSession: "2025/2026" (string)
  
POST /api/scores/bulk-upsert
  - student_id + class_id + academic_year (string)
  
GET /api/scores/class?...&academicYear=...&term="First Term"
  - Academic year as string
  - Term as string
```

### After (New API)
```
POST /api/students
  - classId + sessionId in body
  - Auto-creates enrollment transaction
  - Response: { student, enrollment }
  
POST /api/scores/upsert-bulk
  - enrollment_id as key
  - sessionId replaced academicSession string
  - term as numeric (1, 2, 3)
  
GET /api/students/search?classId=X&subjectId=Y&sessionId=Z
  - Direct student search with enrollment_id
  - No session string parameter
```

---

## Performance Considerations

1. **Parallel Fetches**: Use `Promise.all()` for independent API calls
2. **Filtered Queries**: All class/subject queries scoped by school_id at backend
3. **Session Caching**: Store active sessionId in device storage for quick access
4. **Selective Upserts**: Only send changed score fields to reduce payload

---

## Future Enhancements

1. **Cached Student List**: Store fetched students locally with React Query or similar
2. **Offline Mode**: Cache scores and sync when online
3. **Bulk Import**: CSV upload for registering multiple students
4. **Score Analytics**: Charts showing score distributions per term/subject
5. **Photo Upload**: Student profile photos with school branding

