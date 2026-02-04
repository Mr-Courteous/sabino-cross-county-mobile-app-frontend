# Frontend Refactor - Quick Reference

## ✅ What Changed

### Three Screens Refactored
1. **dashboard.tsx** - Fetches active session ID on mount
2. **register-student.tsx** - Class + session selectors, enrollment transaction
3. **score-entry.tsx** - Term selector, enrollment_id mapping, total_score display

---

## Key API Changes

### Before → After

| Aspect | Before | After |
|--------|--------|-------|
| **Student Creation** | No enrollment | Auto-creates enrollment (transaction) |
| **Student Key for Scores** | `student_id` | `enrollment_id` |
| **Academic Year Param** | String: "2025/2026" | `sessionId`: integer FK |
| **Term Param** | String: "First Term" | Numeric: 1, 2, 3 |
| **Score Endpoint** | `/api/scores/bulk-upsert` | `/api/scores/upsert-bulk` (same) |
| **Student Search** | None | NEW: `/api/students/search?classId=X&subjectId=Y&sessionId=Z` |
| **Filter Fetch** | Class + Subject | Class + Subject + Session |

---

## Code Patterns

### Token Access (All Screens)
```tsx
const getToken = async () => {
  return Platform.OS !== 'web' 
    ? await SecureStore.getItemAsync('userToken') 
    : localStorage.getItem('userToken');
};
```

### Enrollment ID Mapping (Score Entry)
```tsx
// OLD
s.student_id === studentId ? { ...s, [field]: value } : s

// NEW
s.enrollment_id === enrollmentId ? { ...s, [field]: value } : s
```

### Filters (Register Student & Score Entry)
```tsx
// Classes
{classes.map((cls: any) => (
  <TouchableOpacity
    key={cls.id}
    onPress={() => setSelectedClass(cls.id)}
    style={[styles.filterChip, selectedClass === cls.id && styles.filterChipActive]}
  >
    <Text>{cls.class_name}</Text>
  </TouchableOpacity>
))}
```

### Student Creation with Enrollment
```tsx
const payload = {
  first_name: form.firstName,
  last_name: form.lastName,
  email: form.email,
  registration_number: form.registrationNumber,
  gender: form.gender,
  classId: selectedClass,        // Required
  sessionId: selectedSession      // Required
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
// result.data = { student: {...}, enrollment: {...} }
```

### Score Save with COALESCE Support
```tsx
const payload = students.map(s => {
  const scoreData: any = {
    enrollment_id: s.enrollment_id,  // KEY CHANGE
    subject_id: selectedSubject,
    term: selectedTerm               // numeric
  };

  // Only include fields with values
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

// POST /api/scores/upsert-bulk
```

---

## State Variables

### Dashboard
```tsx
const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
```
→ Stored in SecureStore/localStorage for use by other screens

### Register Student
```tsx
const [classes, setClasses] = useState<any[]>([]);
const [sessions, setSessions] = useState<any[]>([]);
const [selectedClass, setSelectedClass] = useState<number | null>(null);
const [selectedSession, setSelectedSession] = useState<number | null>(null);
const [loadingFilters, setLoadingFilters] = useState(false);
```

### Score Entry
```tsx
const [classes, setClasses] = useState([]);
const [subjects, setSubjects] = useState([]);
const [sessions, setSessions] = useState<any[]>([]); // NEW
const [selectedClass, setSelectedClass] = useState<number | null>(null);
const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
const [selectedTerm, setSelectedTerm] = useState<number>(1); // 1, 2, or 3
const [selectedSession, setSelectedSession] = useState<number | null>(null); // NEW
```

---

## API Responses

### Student Creation
```json
{
  "success": true,
  "data": {
    "student": { "id": 45, "first_name": "John", "last_name": "Doe", ... },
    "enrollment": { "id": 123, "student_id": 45, "class_id": 5, "session_id": 12, "status": "active" }
  }
}
```

### Student Search
```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "enrollment_id": 123,
      "first_name": "John",
      "last_name": "Doe",
      "ca1_score": null,
      "ca2_score": null,
      "exam_score": null,
      "total_score": null
    }
  ]
}
```

### Score Upsert
```json
{
  "success": true,
  "data": [
    {
      "enrollment_id": 123,
      "subject_id": 2,
      "term": 1,
      "ca1_score": 18,
      "ca2_score": 16,
      "exam_score": 45,
      "total_score": 79
    }
  ]
}
```

---

## Testing Quick Commands

### Test Dashboard
```
1. Load app → Dashboard visible
2. Check device storage: SecureStore.getItemAsync('activeSessionId')
3. Expect: numeric session ID (e.g., 12)
```

### Test Register Student
```
1. Open register-student screen
2. Verify classes dropdown populates
3. Verify sessions dropdown populates (active marked)
4. Select class "S.S. 1" and session "2025/2026"
5. Enter: First="John", Last="Doe", Reg="STU-001"
6. Tap "REGISTER & ENROLL"
7. Expect: Student created with enrollment, list refreshes
```

### Test Score Entry
```
1. Open score-entry screen
2. Verify dropdowns for Class, Subject, Term, Session
3. Select Class="S.S. 1", Subject="Mathematics", Term=1, Session="2025/2026"
4. Verify students list loads with enrollment_id
5. Enter CA1=18 for first student
6. Tap save
7. Expect: Response includes total_score
8. Verify total_score displays on card (e.g., "79")
```

---

## File Locations

| File | Purpose |
|------|---------|
| `app/dashboard.tsx` | Fetch active session, store sessionId |
| `app/register-student.tsx` | Create student + enrollment (auto) |
| `app/score-entry.tsx` | Score entry with enrollment_id mapping |
| `FRONTEND_ENROLLMENT_SYNC.md` | Detailed docs (this folder) |
| `utils/api-service.ts` | API_BASE_URL constant |

---

## Imports Used

All three screens import:
```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ... } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE_URL } from '@/utils/api-service';
```

---

## Removed Code

- **Deleted**: `const TERMS = ["First Term", "Second Term", "Third Term"];` from score-entry.tsx
- **Deleted**: `const SESSIONS = ["2024/2025", "2025/2026"];` from score-entry.tsx
- **Changed**: Filter selectors now fetch from API (dynamic, not hardcoded)

---

## Styling Changes

### Register Student
Added new styles:
```tsx
filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', ... }
filterChipActive: { backgroundColor: '#FACC15', borderColor: '#FACC15' }
filterChipText: { fontSize: rf(12), fontWeight: '700', color: '#64748B' }
filterChipTextActive: { color: '#0F172A' }
```

### Score Entry
Updated styles:
```tsx
filterLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: '800', marginTop: 12, marginBottom: 6 }
totalBox: { width: '22%', alignItems: 'center' }
totalScore: { fontSize: 16, fontWeight: '900', color: '#16A34A', textAlign: 'center' }
```

---

## Success Criteria

- [x] Dashboard fetches active session
- [x] Register student with class + session selectors
- [x] Student creation triggers enrollment transaction
- [x] Score entry uses enrollment_id mapping
- [x] Total score displays from database generated column
- [x] Only changed score fields sent (COALESCE support)
- [x] All filters fetch from API (not hardcoded)
- [x] Term as numeric (1, 2, 3)
- [x] SessionId replaces academic year strings
- [x] No Context Provider used, direct fetch calls

---

## Next Steps

1. **Backend Testing**
   - Verify `/api/students/search` endpoint is implemented
   - Verify `/api/scores/upsert-bulk` returns scores with total_score
   - Verify student creation transaction response format

2. **Frontend Testing**
   - Test all three screens per testing checklist
   - Verify enrollment_id correctly maps to students
   - Verify total_score displays after save

3. **Integration Testing**
   - End-to-end: Register student → Enroll → Enter scores → View totals
   - Verify COALESCE: Enter CA1, save, enter CA2, save again (CA1 preserved)
   - Verify session filtering works correctly

4. **Performance**
   - Monitor network requests in DevTools
   - Confirm parallel fetches in dashboard/score-entry load efficiently
   - Test with slow network (throttle to 3G)

