import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '@/utils/api-service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface Subject {
  id: number;
  name: string;
  category: string;
  education_level: string;
}

interface Class {
  id: number;
  country_id: number;
  display_name: string;
  capacity: number;
}

interface ScoreEntry {
  enrollment_id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  score_id: number | null;
  ca1_score: number | null;
  ca2_score: number | null;
  ca3_score: number | null;
  ca4_score: number | null;
  exam_score: number | null;
  ca1: number | string;
  ca2: number | string;
  ca3: number | string;
  ca4: number | string;
  exam: number | string;
  total_score?: number;
}

export default function ScoreEntryScreen() {
  // Authentication & Token
  const [token, setToken] = useState<string>('');
  const [countryId, setCountryId] = useState<number | null>(null);
  const [schoolId, setSchoolId] = useState<number | null>(null);

  // Data
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicSessions, setAcademicSessions] = useState<{ id: number; session_name: string }[]>([]);
  const [scoreEntries, setScoreEntries] = useState<ScoreEntry[]>([]);

  // Selection State
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<string>('First');
  const [selectedTermId, setSelectedTermId] = useState<number>(1);
  const [showTermDropdown, setShowTermDropdown] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [classSearchFilter, setClassSearchFilter] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [subjectSearchFilter, setSubjectSearchFilter] = useState('');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [searchingSubjects, setSearchingSubjects] = useState(false);

  // Loading & Errors
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [savingScores, setSavingScores] = useState(false);
  const [initialError, setInitialError] = useState('');
  const [sheetError, setSheetError] = useState('');
  const [scoreErrors, setScoreErrors] = useState<{ [key: string]: string }>({});
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const terms = ['First', 'Second', 'Third'];

  // Debounced subject search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (subjectSearchQuery.trim()) {
        searchSubjects(subjectSearchQuery);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [subjectSearchQuery]);

  // Map term name to ID
  useEffect(() => {
    const termIndex = terms.indexOf(selectedTerm);
    setSelectedTermId(termIndex + 1);
  }, [selectedTerm]);

  // Initialize - Load token, classes, subjects, sessions
  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      setLoadingInitial(true);
      setInitialError('');

      let tokenValue = '';
      let countryIdValue: number | null = null;
      let schoolIdValue: number | null = null;

      // Step 1: Retrieve userData from SecureStore/localStorage
      let userData: any = null;

      if (Platform.OS !== 'web') {
        try {
          // Mobile: Try SecureStore first
          const userDataString = await SecureStore.getItemAsync('userData');
          if (userDataString) {
            userData = JSON.parse(userDataString);
            console.log('✓ userData loaded from SecureStore:', userData);
          }
        } catch (secureStoreError) {
          console.warn('SecureStore access failed, falling back to localStorage:', secureStoreError);
          // Fallback to localStorage for web
          const userDataString = localStorage.getItem('userData');
          if (userDataString) {
            userData = JSON.parse(userDataString);
            console.log('✓ userData loaded from localStorage:', userData);
          }
        }
      } else {
        // Web: Use localStorage
        const userDataString = localStorage.getItem('userData');
        if (userDataString) {
          userData = JSON.parse(userDataString);
          console.log('✓ userData loaded from localStorage:', userData);
        }
      }

      // Step 2: Extract token and countryId from userData
      if (userData) {
        // Token might be stored separately or in userData
        if (Platform.OS !== 'web') {
          try {
            tokenValue = (await SecureStore.getItemAsync('userToken')) || '';
          } catch (e) {
            tokenValue = localStorage.getItem('userToken') || '';
          }
        } else {
          tokenValue = localStorage.getItem('userToken') || '';
        }

        // Extract countryId from user object (prefer from userData.countryId, fallback to userData.user.countryId)
        if (userData.countryId) {
          countryIdValue = parseInt(userData.countryId);
          console.log('✓ countryId extracted from userData.countryId:', countryIdValue);
        } else if (userData.user?.countryId) {
          countryIdValue = parseInt(userData.user.countryId);
          console.log('✓ countryId extracted from userData.user.countryId:', countryIdValue);
        }

        // Extract schoolId (prefer from userData.schoolId, fallback to userData.user.schoolId)
        if (userData.schoolId) {
          schoolIdValue = userData.schoolId;
        } else if (userData.user?.schoolId) {
          schoolIdValue = userData.user.schoolId;
        }

        console.log('Extracted values - Token:', tokenValue ? '✓' : '✗', 'CountryId:', countryIdValue, 'SchoolId:', schoolIdValue);
      }

      // Step 3: Validate that we have required data
      if (!tokenValue) {
        setInitialError('Authentication failed: No token found. Please login again.');
        return;
      }

      // if (!countryIdValue || countryIdValue === 0) {
      //   setInitialError('Country context missing. Please login again.');
      //   return;
      // }

      // Step 4: Store in component state
      setToken(tokenValue);
      setCountryId(countryIdValue);
      setSchoolId(schoolIdValue);

      console.log('✓ Initialization complete. Fetching data...');

      // Step 5: Fetch data - only if we have valid token
      if (tokenValue) {
        await Promise.all([
          fetchClasses(tokenValue),
          fetchSubjects(tokenValue),
          fetchAcademicSessions(tokenValue),
        ]);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setInitialError(errorMessage);
      console.error('Initialize error:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const fetchClasses = async (tokenValue: string) => {
    try {
      if (!tokenValue) {
        console.warn('⚠️ fetchClasses: Missing token');
        return;
      }

      console.log(`📥 Fetching classes`);
      const response = await fetch(
        `${API_BASE_URL}/api/classes`,
        {
          headers: {
            'Authorization': `Bearer ${tokenValue}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Classes fetch failed with status ${response.status}:`, response.statusText);
        const errorData = await response.json();
        console.error('Error details:', errorData);
        return;
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        console.log(`✓ Classes loaded: ${data.data.length} classes`);
        setClasses(data.data);
      } else {
        console.warn('⚠️ Unexpected response format for classes:', data);
      }
    } catch (err) {
      console.error('❌ Classes fetch error:', err);
    }
  };

  const fetchSubjects = async (tokenValue: string) => {
    try {
      if (!tokenValue) {
        console.warn('⚠️ fetchSubjects: Missing token');
        return;
      }

      console.log(`📥 Fetching subjects`);
      const response = await fetch(
        `${API_BASE_URL}/api/classes/subjects`,
        {
          headers: {
            'Authorization': `Bearer ${tokenValue}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Subjects fetch failed with status ${response.status}:`, response.statusText);
        const errorData = await response.json();
        console.error('Error details:', errorData);
        return;
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        console.log(`✓ Subjects loaded: ${data.data.length} subjects`);
        setSubjects(data.data);
      } else {
        console.warn('⚠️ Unexpected response format for subjects:', data);
      }
    } catch (err) {
      console.error('❌ Subjects fetch error:', err);
    }
  };

  // Debounced subject search function
  const searchSubjects = async (keyword: string) => {
    if (!keyword.trim()) {
      setSubjects([]);
      return;
    }

    try {
      setSearchingSubjects(true);
      console.log(`🔍 Searching subjects with keyword: ${keyword}`);

      const response = await fetch(
        `${API_BASE_URL}/api/subjects/search?keyword=${encodeURIComponent(keyword)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Subject search failed with status ${response.status}`);
        return;
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        console.log(`✓ Found ${data.data.length} subjects`);
        setSubjects(data.data);
      } else {
        console.warn('⚠️ Unexpected response format for subject search:', data);
      }
    } catch (err) {
      console.error('❌ Subject search error:', err);
    } finally {
      setSearchingSubjects(false);
    }
  };

  const fetchAcademicSessions = async (
    tokenValue: string
  ) => {
    try {
      if (!tokenValue) {
        console.warn('⚠️ fetchAcademicSessions: Missing token');
        return;
      }

      console.log(`📥 Fetching academic sessions`);
      const response = await fetch(
        `${API_BASE_URL}/api/academic-sessions`,
        {
          headers: {
            'Authorization': `Bearer ${tokenValue}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Academic sessions fetch failed with status ${response.status}:`, response.statusText);
        const errorData = await response.json();
        console.error('Error details:', errorData);
        return;
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        const sessions = data.data.map((s: any) => ({
          id: s.id,
          session_name: s.session_name || s.name
        }));
        console.log(`✓ Academic sessions loaded: ${sessions.length} sessions`);
        setAcademicSessions(sessions);
        if (sessions.length > 0) {
          setSelectedSession(sessions[0].session_name);
          setSelectedSessionId(sessions[0].id);
        }
      } else {
        console.warn('⚠️ Unexpected response format for academic sessions:', data);
      }
    } catch (err) {
      console.error('❌ Academic sessions fetch error:', err);
    }
  };

  const loadScoringSheet = async (classId: number) => {
    if (!token || !selectedSessionId || !selectedSubject || !selectedTermId) {
      setSheetError('Please select class, session, subject, and term first');
      return;
    }

    try {
      setSavingScores(false); // Reset saving state whenever we start loading a new sheet
    setLoadingSheet(true);
      setSheetError('');

      console.log(`📥 Loading scoring sheet with classId=${classId}, subjectId=${selectedSubject.id}, sessionId=${selectedSessionId}, termId=${selectedTermId}`);

      const response = await fetch(
        `${API_BASE_URL}/api/scores/sheet?classId=${classId}&subjectId=${selectedSubject.id}&sessionId=${selectedSessionId}&termId=${selectedTermId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      // Handle success response
      if (response.ok && data.success) {
        console.log(`✓ Scoring sheet loaded successfully: ${data.data.length} students`);

        // Pre-populate score entries with existing scores from server
        const entries: ScoreEntry[] = data.data.map((item: any, index: number) => {
          // Check if this student has existing scores
          const hasScores = item.ca1_score !== null || item.ca2_score !== null ||
            item.ca3_score !== null || item.ca4_score !== null ||
            item.exam_score !== null;

          console.log(`\n📋 STUDENT ${index + 1}: ${item.first_name} ${item.last_name}`);
          console.log(`   Raw score_id from backend: ${item.score_id} (type: ${typeof item.score_id})`);
          console.log(`   Has scores: ${hasScores}`);
          if (hasScores) {
            console.log(`   ✓ CA1=${item.ca1_score}, CA2=${item.ca2_score}, CA3=${item.ca3_score}, CA4=${item.ca4_score}, Exam=${item.exam_score}`);
          }

          const parsedScoreId = item.score_id && item.score_id > 0 ? parseInt(item.score_id) : null;
          console.log(`   Parsed score_id: ${parsedScoreId}`);

          return {
            enrollment_id: item.enrollment_id,
            student_id: item.student_id,
            first_name: item.first_name,
            last_name: item.last_name,
            score_id: parsedScoreId,
            ca1_score: item.ca1_score || null,
            ca2_score: item.ca2_score || null,
            ca3_score: item.ca3_score || null,
            ca4_score: item.ca4_score || null,
            exam_score: item.exam_score || null,
            // Display values - convert null to empty string for UI
            ca1: item.ca1_score !== null ? String(item.ca1_score) : '',
            ca2: item.ca2_score !== null ? String(item.ca2_score) : '',
            ca3: item.ca3_score !== null ? String(item.ca3_score) : '',
            ca4: item.ca4_score !== null ? String(item.ca4_score) : '',
            exam: item.exam_score !== null ? String(item.exam_score) : '',
          };
        });

        setScoreEntries(entries);
        console.log(`✓ All ${entries.length} student records loaded and ready for editing`);
      } else {
        // Handle error response
        const errorMessage = data.message || data.error || 'Failed to load scoring sheet';
        console.error(`❌ Error loading scoring sheet: ${errorMessage}`);
        setSheetError(errorMessage);
        setScoreEntries([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while loading the scoring sheet';
      setSheetError(errorMessage);
      console.error('Scoring sheet fetch error:', err);
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleScoreChange = (
    enrollmentId: number,
    field: string,
    value: string
  ) => {
    const numValue = value === '' ? '' : parseFloat(value);

    // Validation
    const errorKey = `${enrollmentId}-${field}`;
    let error = '';

    if (numValue !== '') {
      if (field === 'exam') {
        if ((numValue as number) > 60 || (numValue as number) < 0) {
          error = 'Exam max 60';
        }
      } else {
        if ((numValue as number) > 10 || (numValue as number) < 0) {
          error = `${field.toUpperCase()} max 10`;
        }
      }
    }

    // Update errors
    const newErrors = { ...scoreErrors };
    if (error) {
      newErrors[errorKey] = error;
    } else {
      delete newErrors[errorKey];
    }
    setScoreErrors(newErrors);

    // Update score entry
    const updatedEntries = scoreEntries.map(entry =>
      entry.enrollment_id === enrollmentId
        ? { ...entry, [field]: numValue }
        : entry
    );

    setScoreEntries(updatedEntries);
  };

  const calculateTotal = (score: ScoreEntry): number => {
    const ca1 = typeof score.ca1 === 'string' ? parseFloat(score.ca1) || 0 : score.ca1 || 0;
    const ca2 = typeof score.ca2 === 'string' ? parseFloat(score.ca2) || 0 : score.ca2 || 0;
    const ca3 = typeof score.ca3 === 'string' ? parseFloat(score.ca3) || 0 : score.ca3 || 0;
    const ca4 = typeof score.ca4 === 'string' ? parseFloat(score.ca4) || 0 : score.ca4 || 0;
    const exam = typeof score.exam === 'string' ? parseFloat(score.exam) || 0 : score.exam || 0;

    return ca1 + ca2 + ca3 + ca4 + exam;
  };

  const validateAllScores = (): boolean => {
    const errors: { [key: string]: string } = {};
    let isValid = true;

    scoreEntries.forEach((entry) => {
      ['ca1', 'ca2', 'ca3', 'ca4'].forEach((field) => {
        const val = entry[field as keyof ScoreEntry];
        const numVal = typeof val === 'string' ? parseFloat(val) : (val as number);
        if (!isNaN(numVal) && numVal !== null) {
          if (numVal > 10 || numVal < 0) {
            errors[`${entry.enrollment_id}-${field}`] = `${field.toUpperCase()} max 10`;
            isValid = false;
          }
        }
      });

      const examVal = entry.exam;
      const numExam = typeof examVal === 'string' ? parseFloat(examVal) : (examVal as number);
      if (!isNaN(numExam) && numExam !== null) {
        if (numExam > 60 || numExam < 0) {
          errors[`${entry.enrollment_id}-exam`] = 'Exam max 60';
          isValid = false;
        }
      }
    });

    setScoreErrors(errors);
    return isValid;
  };

  const handleSaveAllScores = async () => {
    // Clear previous messages
    setSaveSuccess('');
    setSaveError('');

    if (!validateAllScores()) {
      setSaveError('Please fix all score errors before saving');
      return;
    }

    if (scoreEntries.length === 0) {
      setSaveError('Please load scoring sheet first');
      return;
    }

    try {
      setSavingScores(true);

      // Prepare payload - send all entries to bulk record endpoint
      const scoresPayload = scoreEntries
        .map((entry) => ({
          enrollment_id: entry.enrollment_id,
          subject_id: selectedSubject?.id,
          term_id: selectedTermId,
          sessionId: selectedSessionId,
          ca1_score: entry.ca1 === '' ? null : parseFloat(String(entry.ca1)),
          ca2_score: entry.ca2 === '' ? null : parseFloat(String(entry.ca2)),
          ca3_score: entry.ca3 === '' ? null : parseFloat(String(entry.ca3)),
          ca4_score: entry.ca4 === '' ? null : parseFloat(String(entry.ca4)),
          exam_score: entry.exam === '' ? null : parseFloat(String(entry.exam)),
        }))
        .filter((s) => s.ca1_score !== null || s.ca2_score !== null || s.ca3_score !== null || s.ca4_score !== null || s.exam_score !== null);

      if (scoresPayload.length === 0) {
        setSaveError('Please enter at least one score');
        return;
      }

      console.log(`📤 Saving ${scoresPayload.length} scores...`);

      const response = await fetch(`${API_BASE_URL}/api/scores/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scores: scoresPayload,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const successMsg = `${data.count} score(s) saved successfully!`;
        setSaveSuccess(successMsg);
        setSaveError('');

        // Update local state with new score IDs from the response
        if (data.data && Array.isArray(data.data)) {
          console.log(`🔄 Updating local state with ${data.data.length} saved score IDs`);
          const savedScores = data.data;
          const updatedEntriesAfterSave = scoreEntries.map(entry => {
            const savedItem = savedScores.find((s: any) => 
              parseInt(s.enrollment_id) === parseInt(entry.enrollment_id as any)
            );
            if (savedItem) {
              console.log(`   ✓ Found ID ${savedItem.id} for enrollment ${entry.enrollment_id}`);
              return { ...entry, score_id: savedItem.id };
            }
            return entry;
          });
          setScoreEntries(updatedEntriesAfterSave);
        }

        // Auto-reload the scoring sheet after a brief delay to ensure everything is in sync
        setTimeout(() => {
          if (selectedClass) {
            loadScoringSheet(selectedClass.id);
          }
        }, 500);

        // Auto-dismiss success message after 4 seconds
        setTimeout(() => {
          setSaveSuccess('');
        }, 4000);
      } else {
        const errorMsg = data.message || data.error || 'Failed to save scores';
        console.error(`❌ Save failed: ${errorMsg}`);
        setSaveError(errorMsg);
        setSaveSuccess('');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while saving scores';
      console.error('Save scores error:', err);
      setSaveError(errorMessage);
      setSaveSuccess('');
    } finally {
      setSavingScores(false);
    }
  };

  const handleDeleteScore = async (scoreId: number | null, enrollmentId: number) => {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🗑️  DELETE SCORE HANDLER TRIGGERED`);
      console.log(`${'='.repeat(60)}`);
      console.log(`scoreId: ${scoreId}`);
      console.log(`enrollmentId: ${enrollmentId}`);
      console.log(`token: ${token ? '✓ Present' : '✗ Missing'}`);
      console.log(`savingScores: ${savingScores}`);
      console.log(`API_BASE_URL: ${API_BASE_URL}`);
      
      if (!token) {
        Alert.alert('Error', 'Authentication token missing. Please log in again.');
        return;
      }
      
      console.log(`${'='.repeat(60)}\n`);

      const executeDelete = async () => {
        console.log(`\n${'−'.repeat(60)}`);
        console.log(`🗑️  DELETE CONFIRMED - EXECUTING DELETE`);
        console.log(`${'−'.repeat(60)}`);

        try {
          setSavingScores(true);
          setSaveError('');
          setSaveSuccess('');

          // IMPORTANT: Check if scoreId exists and is > 0
          const hasValidScoreId = scoreId !== null && scoreId !== undefined && Number(scoreId) > 0;
          console.log(`📊 Checking: scoreId=${scoreId}, hasValidScoreId=${hasValidScoreId}`);

          if (hasValidScoreId) {
            const effectiveId = Number(scoreId);
            const deleteUrl = `${API_BASE_URL}/api/scores/${effectiveId}`;
            
            console.log(`📤 [DEBUG] DELETE URL: ${deleteUrl}`);
            console.log(`📤 SAVED SCORE - Making DELETE request to backend`);
            console.log(`📋 Headers: Authorization: Bearer ${token?.substring(0, 20)}...`);

            const response = await fetch(deleteUrl, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.status === 401) {
              throw new Error('Unauthorized: Session expired or invalid token');
            }

            console.log(`📥 RESPONSE STATUS: ${response.status} ${response.statusText}`);
            
            const data = await response.json();
            console.log(`📥 RESPONSE DATA:`, data);

            if (!response.ok || !data.success) {
              const errorMessage = data.message || data.error || 'Failed to delete score from server';
              console.error(`❌ Backend delete failed: ${errorMessage}`);
              setSaveError(errorMessage);
              setSavingScores(false);
              return;
            }

            console.log(`✅ Score successfully deleted from backend`);
          } else {
            console.log(`ℹ️ UNSAVED SCORE - Clearing local data only, NO backend call needed for scoreId=${scoreId}`);
          }

          // Update the score entry to clear all score values
          console.log(`🔄 Updating local state to clear scores for enrollment ${enrollmentId}`);
          const updatedEntries = scoreEntries.map(entry =>
            Number(entry.enrollment_id) === Number(enrollmentId)
              ? {
                  ...entry,
                  score_id: null,
                  ca1_score: null,
                  ca2_score: null,
                  ca3_score: null,
                  ca4_score: null,
                  exam_score: null,
                  ca1: '',
                  ca2: '',
                  ca3: '',
                  ca4: '',
                  exam: '',
                }
              : entry
          );

          setScoreEntries(updatedEntries);
          console.log(`✅ Local state updated`);
          
          if (Platform.OS === 'web') {
            alert(hasValidScoreId ? 'Score record deleted from server.' : 'Local scores cleared.');
          } else {
            Alert.alert('Success', hasValidScoreId ? 'Score record deleted from server.' : 'Local scores cleared.');
          }
          
          setSaveSuccess('Score cleared successfully!');
          console.log(`✅ Success message set`);

          setTimeout(() => {
            setSaveSuccess('');
          }, 3000);

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          setSaveError(errorMessage);
          console.error(`❌ Delete error: ${errorMessage}`, err);
          setSavingScores(false);
        } finally {
          setSavingScores(false);
          console.log(`${'−'.repeat(60)}\n`);
        }
      };

      // PLATFORM-SPECIFIC CONFIRMATION
      if (Platform.OS === 'web') {
        if (window.confirm(`Are you sure you want to clear score ID ${scoreId || 'unsaved'}? This cannot be undone.`)) {
          executeDelete();
        }
      } else {
        Alert.alert(
          'Clear Score',
          `Are you sure you want to clear score ID ${scoreId}? This cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => console.log('ℹ️ User cancelled') },
            { text: 'Delete', style: 'destructive', onPress: executeDelete },
          ]
        );
      }
    } catch (err) {
      console.error(`❌ Critical error in handleDeleteScore:`, err);
    }
  };


  if (loadingInitial) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <ThemedText style={{ marginTop: 16 }}>Loading score entry screen...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ThemedView style={{ flex: 1 }}>
        {/* Header */}
        <LinearGradient
          colors={['#2E7D32', '#1B5E20']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 20 }}
        >
          <ThemedText
            type="title"
            style={{ color: '#fff', marginBottom: 6 }}
          >
            Upload Results
          </ThemedText>
          <ThemedText style={{ color: '#e8f5e9', fontSize: 13 }}>
            Enter student scores for continuous assessment and exams
          </ThemedText>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1, padding: 16 }}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={true}
        >
          {initialError && (
            <View
              style={{
                backgroundColor: '#ffebee',
                borderLeftColor: '#d32f2f',
                borderLeftWidth: 5,
                padding: 14,
                borderRadius: 6,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#ffcdd2',
              }}
            >
              <ThemedText style={{ color: '#c62828', fontSize: 15, fontWeight: '600' }}>
                ❌ Error
              </ThemedText>
              <ThemedText style={{ color: '#b71c1c', fontSize: 14, marginTop: 4 }}>
                {initialError}
              </ThemedText>
            </View>
          )}

          {/* Session Selection */}
          <View style={{ marginBottom: 16 }}>
            <ThemedText style={{ marginBottom: 6, fontWeight: '600', fontSize: 14 }}>
              Academic Session *
            </ThemedText>
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 6,
                padding: 12,
                backgroundColor: '#fff',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onPress={() => setShowSessionDropdown(!showSessionDropdown)}
            >
              <ThemedText
                style={{
                  fontSize: 14,
                  color: selectedSession ? '#000' : '#999',
                }}
              >
                {selectedSession || 'Select session...'}
              </ThemedText>
              <ThemedText style={{ fontSize: 16 }}>
                {showSessionDropdown ? '▲' : '▼'}
              </ThemedText>
            </TouchableOpacity>

            {showSessionDropdown && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderTopWidth: 0,
                  borderBottomLeftRadius: 6,
                  borderBottomRightRadius: 6,
                  backgroundColor: '#fff',
                  maxHeight: 150,
                  marginTop: -1,
                }}
              >
                <FlatList
                  data={academicSessions}
                  keyExtractor={(item) => String(item.id)}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#eee',
                        backgroundColor:
                          selectedSession === item.session_name ? '#e8f5e9' : '#fff',
                      }}
                      onPress={() => {
                        setSelectedSession(item.session_name);
                        setSelectedSessionId(item.id);
                        setShowSessionDropdown(false);
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: 14,
                          color:
                            selectedSession === item.session_name ? '#2e7d32' : '#333',
                          fontWeight:
                            selectedSession === item.session_name ? '600' : '400',
                        }}
                      >
                        {item.session_name}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          {/* Term Selection */}
          <View style={{ marginBottom: 16 }}>
            <ThemedText style={{ marginBottom: 6, fontWeight: '600', fontSize: 14 }}>
              Term *
            </ThemedText>
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 6,
                padding: 12,
                backgroundColor: '#fff',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onPress={() => setShowTermDropdown(!showTermDropdown)}
            >
              <ThemedText style={{ fontSize: 14, color: '#000' }}>
                {selectedTerm}
              </ThemedText>
              <ThemedText style={{ fontSize: 16 }}>
                {showTermDropdown ? '▲' : '▼'}
              </ThemedText>
            </TouchableOpacity>

            {showTermDropdown && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderTopWidth: 0,
                  borderBottomLeftRadius: 6,
                  borderBottomRightRadius: 6,
                  backgroundColor: '#fff',
                  marginTop: -1,
                }}
              >
                {terms.map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={{
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#eee',
                      backgroundColor:
                        selectedTerm === term ? '#e8f5e9' : '#fff',
                    }}
                    onPress={() => {
                      setSelectedTerm(term);
                      setShowTermDropdown(false);
                    }}
                  >
                    <ThemedText
                      style={{
                        fontSize: 14,
                        color: selectedTerm === term ? '#2e7d32' : '#333',
                        fontWeight: selectedTerm === term ? '600' : '400',
                      }}
                    >
                      {term}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Class Selection */}
          <View style={{ marginBottom: 16 }}>
            <ThemedText style={{ marginBottom: 6, fontWeight: '600', fontSize: 14 }}>
              Class *
            </ThemedText>
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 6,
                padding: 12,
                backgroundColor: '#fff',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onPress={() => {
                setShowClassDropdown(!showClassDropdown);
                setClassSearchFilter('');
              }}
            >
              <ThemedText
                style={{
                  fontSize: 14,
                  color: selectedClass ? '#000' : '#999',
                }}
              >
                {selectedClass ? selectedClass.display_name : 'Select class...'}
              </ThemedText>
              <ThemedText style={{ fontSize: 16 }}>
                {showClassDropdown ? '▲' : '▼'}
              </ThemedText>
            </TouchableOpacity>

            {showClassDropdown && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderTopWidth: 0,
                  borderBottomLeftRadius: 6,
                  borderBottomRightRadius: 6,
                  backgroundColor: '#fff',
                  marginTop: -1,
                }}
              >
                {/* Search Input */}
                <TextInput
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: '#ddd',
                    padding: 10,
                    fontSize: 14,
                    backgroundColor: '#f9f9f9',
                  }}
                  placeholder="Search classes..."
                  value={classSearchFilter}
                  onChangeText={setClassSearchFilter}
                  placeholderTextColor="#999"
                />

                {/* Filtered Classes List */}
                <FlatList
                  data={classes.filter(cls =>
                    cls.display_name.toLowerCase().includes(classSearchFilter.toLowerCase())
                  )}
                  keyExtractor={(item) => String(item.id)}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#eee',
                        backgroundColor:
                          selectedClass?.id === item.id ? '#e8f5e9' : '#fff',
                      }}
                      onPress={() => {
                        setSelectedClass(item);
                        setShowClassDropdown(false);
                        setClassSearchFilter('');
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: 14,
                          color:
                            selectedClass?.id === item.id ? '#2e7d32' : '#333',
                          fontWeight:
                            selectedClass?.id === item.id ? '600' : '400',
                        }}
                      >
                        {item.display_name}
                      </ThemedText>
                      <ThemedText
                        style={{
                          fontSize: 11,
                          color: '#999',
                          marginTop: 2,
                        }}
                      >
                        Capacity: {item.capacity}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          {/* Subject Selection */}
          <View style={{ marginBottom: 16 }}>
            <ThemedText style={{ marginBottom: 6, fontWeight: '600', fontSize: 14 }}>
              Subject *
            </ThemedText>
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 6,
                padding: 12,
                backgroundColor: '#fff',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onPress={() => {
                setShowSubjectDropdown(!showSubjectDropdown);
                setSubjectSearchFilter('');
              }}
            >
              <ThemedText
                style={{
                  fontSize: 14,
                  color: selectedSubject ? '#000' : '#999',
                }}
              >
                {selectedSubject ? selectedSubject.name : 'Select subject...'}
              </ThemedText>
              <ThemedText style={{ fontSize: 16 }}>
                {showSubjectDropdown ? '▲' : '▼'}
              </ThemedText>
            </TouchableOpacity>

            {showSubjectDropdown && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderTopWidth: 0,
                  borderBottomLeftRadius: 6,
                  borderBottomRightRadius: 6,
                  backgroundColor: '#fff',
                  marginTop: -1,
                  maxHeight: 280,
                }}
              >
                {/* Search Input */}
                <TextInput
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: '#ddd',
                    padding: 10,
                    fontSize: 14,
                    backgroundColor: '#f9f9f9',
                  }}
                  placeholder="Search by name..."
                  value={subjectSearchQuery}
                  onChangeText={setSubjectSearchQuery}
                  placeholderTextColor="#999"
                />

                {searchingSubjects && (
                  <View style={{ padding: 12, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#2e7d32" />
                    <ThemedText style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                      Searching subjects...
                    </ThemedText>
                  </View>
                )}

                {/* Searched Subjects List */}
                <FlatList
                  data={subjects}
                  keyExtractor={(item) => String(item.id)}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#eee',
                        backgroundColor:
                          selectedSubject?.id === item.id ? '#e8f5e9' : '#fff',
                      }}
                      onPress={() => {
                        setSelectedSubject(item);
                        setShowSubjectDropdown(false);
                        setSubjectSearchQuery('');
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: 14,
                          color:
                            selectedSubject?.id === item.id
                              ? '#2e7d32'
                              : '#333',
                          fontWeight:
                            selectedSubject?.id === item.id ? '600' : '400',
                        }}
                      >
                        {item.name}
                      </ThemedText>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginTop: 4,
                        }}
                      >
                        <ThemedText
                          style={{
                            fontSize: 11,
                            color: '#666',
                            backgroundColor: '#f0f0f0',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 3,
                            marginRight: 6,
                          }}
                        >
                          {item.category}
                        </ThemedText>
                        <ThemedText
                          style={{
                            fontSize: 11,
                            color: '#666',
                            backgroundColor: '#e3f2fd',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 3,
                          }}
                        >
                          {item.education_level}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          {/* Debug Info - Remove after testing */}
          <View
            style={{
              backgroundColor: '#f5f5f5',
              padding: 10,
              borderRadius: 6,
              marginBottom: 10,
              borderLeftWidth: 3,
              borderLeftColor: '#666',
            }}
          >
            <ThemedText style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              DEBUG: Class: {selectedClass ? '✓' : '✗'} | Subject: {selectedSubject ? '✓' : '✗'} | Session: {selectedSessionId ? '✓' : '✗'} | Term: {selectedTermId ? '✓' : '✗'}
            </ThemedText>
            <ThemedText style={{ fontSize: 11, color: '#999' }}>
              Class: {selectedClass?.display_name || 'none'} | Subject: {selectedSubject?.name || 'none'} | SessionId: {selectedSessionId || 'null'} | TermId: {selectedTermId}
            </ThemedText>
          </View>

          {/* Success Message */}
          {saveSuccess && (
            <View
              style={{
                backgroundColor: '#e8f5e9',
                borderLeftColor: '#4CAF50',
                borderLeftWidth: 5,
                padding: 14,
                borderRadius: 6,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#c8e6c9',
              }}
            >
              <ThemedText style={{ color: '#2e7d32', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                ✅ Success
              </ThemedText>
              <ThemedText style={{ color: '#1b5e20', fontSize: 13, lineHeight: 20 }}>
                {saveSuccess}
              </ThemedText>
            </View>
          )}

          {/* Error Message */}
          {saveError && (
            <View
              style={{
                backgroundColor: '#ffebee',
                borderLeftColor: '#d32f2f',
                borderLeftWidth: 5,
                padding: 14,
                borderRadius: 6,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#ffcdd2',
              }}
            >
              <ThemedText style={{ color: '#c62828', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                ❌ Error
              </ThemedText>
              <ThemedText style={{ color: '#b71c1c', fontSize: 13, lineHeight: 20 }}>
                {saveError}
              </ThemedText>
            </View>
          )}

          {/* Load Students Button */}
          <TouchableOpacity
            style={{
              backgroundColor: selectedClass && selectedSubject ? '#2196F3' : '#ccc',
              padding: 14,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 20,
              opacity: selectedClass && selectedSubject && selectedSessionId && selectedTermId ? 1 : 0.6,
            }}
            onPress={() => selectedClass && loadScoringSheet(selectedClass.id)}
            disabled={!selectedClass || !selectedSubject || !selectedSessionId || !selectedTermId || loadingSheet}
          >
            {loadingSheet ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  Loading sheet...
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                Load Scoring Sheet
              </ThemedText>
            )}
          </TouchableOpacity>

          {sheetError && (
            <View
              style={{
                backgroundColor: '#ffebee',
                borderLeftColor: '#d32f2f',
                borderLeftWidth: 5,
                padding: 16,
                borderRadius: 6,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#ffcdd2',
              }}
            >
              <View style={{ marginBottom: 8 }}>
                <ThemedText style={{ color: '#c62828', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
                  ⚠️ No Students Available
                </ThemedText>
                <ThemedText style={{ color: '#b71c1c', fontSize: 13, lineHeight: 20 }}>
                  {sheetError}
                </ThemedText>
              </View>
              <View
                style={{
                  backgroundColor: '#fff9c4',
                  borderRadius: 4,
                  padding: 10,
                  marginTop: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: '#f57f17',
                }}
              >
                <ThemedText style={{ fontSize: 12, color: '#f57f17', fontWeight: '600', marginBottom: 4 }}>
                  💡 Troubleshooting Steps:
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: '#e65100', marginBottom: 3 }}>
                  • Verify that students are enrolled in the selected class
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: '#e65100', marginBottom: 3 }}>
                  • Check that the class enrollment matches the selected session
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: '#e65100' }}>
                  • Try selecting a different class, session, or term
                </ThemedText>
              </View>
            </View>
          )}

          {/* Score Entry Table */}
          {scoreEntries.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <ThemedText
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  marginBottom: 12,
                  color: '#333',
                }}
              >
                Student Scores - {selectedSubject?.name} ({selectedSubject?.category})
              </ThemedText>

              {/* Table Header */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#f5f5f5',
                  padding: 10,
                  borderRadius: 6,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: '#ddd',
                }}
              >
                <ThemedText
                  style={{
                    flex: 2,
                    fontWeight: '600',
                    fontSize: 12,
                    color: '#333',
                  }}
                >
                  Student
                </ThemedText>
                <ThemedText
                  style={{
                    flex: 0.8,
                    fontWeight: '600',
                    fontSize: 11,
                    color: '#333',
                    textAlign: 'center',
                  }}
                >
                  CA1
                </ThemedText>
                <ThemedText
                  style={{
                    flex: 0.8,
                    fontWeight: '600',
                    fontSize: 11,
                    color: '#333',
                    textAlign: 'center',
                  }}
                >
                  CA2
                </ThemedText>
                <ThemedText
                  style={{
                    flex: 0.8,
                    fontWeight: '600',
                    fontSize: 11,
                    color: '#333',
                    textAlign: 'center',
                  }}
                >
                  CA3
                </ThemedText>
                <ThemedText
                  style={{
                    flex: 0.8,
                    fontWeight: '600',
                    fontSize: 11,
                    color: '#333',
                    textAlign: 'center',
                  }}
                >
                  CA4
                </ThemedText>
                <ThemedText
                  style={{
                    flex: 0.8,
                    fontWeight: '600',
                    fontSize: 11,
                    color: '#333',
                    textAlign: 'center',
                  }}
                >
                  Exam
                </ThemedText>
                <ThemedText
                  style={{
                    flex: 0.8,
                    fontWeight: '600',
                    fontSize: 11,
                    color: '#333',
                    textAlign: 'center',
                  }}
                >
                  Total
                </ThemedText>
                <ThemedText
                  style={{
                    flex: 0.6,
                    fontWeight: '600',
                    fontSize: 11,
                    color: '#333',
                    textAlign: 'center',
                  }}
                >
                  Actions
                </ThemedText>
              </View>

              {/* Students Rows */}
              {scoreEntries.map((entry) => (
                <View key={entry.enrollment_id} style={{ marginBottom: 12 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      backgroundColor: '#fff',
                      padding: 10,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#ddd',
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Student Name */}
                    <View style={{ flex: 2, paddingRight: 8 }}>
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: '#333',
                        }}
                      >
                        {entry.first_name} {entry.last_name}
                      </ThemedText>
                    </View>

                    {/* CA1 Input */}
                    <View style={{ flex: 0.8, marginHorizontal: 2 }}>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor:
                            scoreErrors[`${entry.enrollment_id}-ca1`]
                              ? '#d32f2f'
                              : '#ddd',
                          borderRadius: 4,
                          padding: 6,
                          fontSize: 12,
                          backgroundColor:
                            scoreErrors[`${entry.enrollment_id}-ca1`]
                              ? '#ffebee'
                              : '#fff',
                          textAlign: 'center',
                        }}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={entry.ca1 === '' || entry.ca1 === 0 ? '' : String(entry.ca1)}
                        onChangeText={(text) =>
                          handleScoreChange(entry.enrollment_id, 'ca1', text)
                        }
                        maxLength={4}
                      />
                      {scoreErrors[`${entry.enrollment_id}-ca1`] && (
                        <ThemedText
                          style={{
                            fontSize: 9,
                            color: '#d32f2f',
                            marginTop: 2,
                            textAlign: 'center',
                          }}
                        >
                          {scoreErrors[`${entry.enrollment_id}-ca1`]}
                        </ThemedText>
                      )}
                    </View>

                    {/* CA2 Input */}
                    <View style={{ flex: 0.8, marginHorizontal: 2 }}>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor:
                            scoreErrors[`${entry.enrollment_id}-ca2`]
                              ? '#d32f2f'
                              : '#ddd',
                          borderRadius: 4,
                          padding: 6,
                          fontSize: 12,
                          backgroundColor:
                            scoreErrors[`${entry.enrollment_id}-ca2`]
                              ? '#ffebee'
                              : '#fff',
                          textAlign: 'center',
                        }}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={entry.ca2 === '' || entry.ca2 === 0 ? '' : String(entry.ca2)}
                        onChangeText={(text) =>
                          handleScoreChange(entry.enrollment_id, 'ca2', text)
                        }
                        maxLength={4}
                      />
                      {scoreErrors[`${entry.enrollment_id}-ca2`] && (
                        <ThemedText
                          style={{
                            fontSize: 9,
                            color: '#d32f2f',
                            marginTop: 2,
                            textAlign: 'center',
                          }}
                        >
                          {scoreErrors[`${entry.enrollment_id}-ca2`]}
                        </ThemedText>
                      )}
                    </View>

                    {/* CA3 Input */}
                    <View style={{ flex: 0.8, marginHorizontal: 2 }}>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor:
                            scoreErrors[`${entry.enrollment_id}-ca3`]
                              ? '#d32f2f'
                              : '#ddd',
                          borderRadius: 4,
                          padding: 6,
                          fontSize: 12,
                          backgroundColor:
                            scoreErrors[`${entry.enrollment_id}-ca3`]
                              ? '#ffebee'
                              : '#fff',
                          textAlign: 'center',
                        }}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={entry.ca3 === '' || entry.ca3 === 0 ? '' : String(entry.ca3)}
                        onChangeText={(text) =>
                          handleScoreChange(entry.enrollment_id, 'ca3', text)
                        }
                        maxLength={4}
                      />
                      {scoreErrors[`${entry.enrollment_id}-ca3`] && (
                        <ThemedText
                          style={{
                            fontSize: 9,
                            color: '#d32f2f',
                            marginTop: 2,
                            textAlign: 'center',
                          }}
                        >
                          {scoreErrors[`${entry.enrollment_id}-ca3`]}
                        </ThemedText>
                      )}
                    </View>

                    {/* CA4 Input */}
                    <View style={{ flex: 0.8, marginHorizontal: 2 }}>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor:
                            scoreErrors[`${entry.enrollment_id}-ca4`]
                              ? '#d32f2f'
                              : '#ddd',
                          borderRadius: 4,
                          padding: 6,
                          fontSize: 12,
                          backgroundColor:
                            scoreErrors[`${entry.enrollment_id}-ca4`]
                              ? '#ffebee'
                              : '#fff',
                          textAlign: 'center',
                        }}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={entry.ca4 === '' || entry.ca4 === 0 ? '' : String(entry.ca4)}
                        onChangeText={(text) =>
                          handleScoreChange(entry.enrollment_id, 'ca4', text)
                        }
                        maxLength={4}
                      />
                      {scoreErrors[`${entry.enrollment_id}-ca4`] && (
                        <ThemedText
                          style={{
                            fontSize: 9,
                            color: '#d32f2f',
                            marginTop: 2,
                            textAlign: 'center',
                          }}
                        >
                          {scoreErrors[`${entry.enrollment_id}-ca4`]}
                        </ThemedText>
                      )}
                    </View>

                    {/* Exam Input */}
                    <View style={{ flex: 0.8, marginHorizontal: 2 }}>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor:
                            scoreErrors[`${entry.enrollment_id}-exam`]
                              ? '#d32f2f'
                              : '#ddd',
                          borderRadius: 4,
                          padding: 6,
                          fontSize: 12,
                          backgroundColor:
                            scoreErrors[`${entry.enrollment_id}-exam`]
                              ? '#ffebee'
                              : '#fff',
                          textAlign: 'center',
                        }}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={entry.exam === '' || entry.exam === 0 ? '' : String(entry.exam)}
                        onChangeText={(text) =>
                          handleScoreChange(entry.enrollment_id, 'exam', text)
                        }
                        maxLength={4}
                      />
                      {scoreErrors[`${entry.enrollment_id}-exam`] && (
                        <ThemedText
                          style={{
                            fontSize: 9,
                            color: '#d32f2f',
                            marginTop: 2,
                            textAlign: 'center',
                          }}
                        >
                          {scoreErrors[`${entry.enrollment_id}-exam`]}
                        </ThemedText>
                      )}
                    </View>

                    {/* Total Score */}
                    <View style={{ flex: 0.8, marginHorizontal: 2 }}>
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: '#2e7d32',
                          textAlign: 'center',
                          paddingVertical: 6,
                        }}
                      >
                        {calculateTotal(entry).toFixed(1)}
                      </ThemedText>
                    </View>

                    {/* Actions */}
                    <View style={{ flex: 0.8, marginHorizontal: 2, alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#d32f2f',
                          borderRadius: 6,
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          minWidth: 60,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        onPress={() => {
                          console.log(`👆 DELETE BUTTON PRESSED - calling handleDeleteScore(${entry.score_id}, ${entry.enrollment_id})`);
                          handleDeleteScore(entry.score_id, entry.enrollment_id);
                        }}
                        disabled={savingScores}
                        activeOpacity={0.7}
                      >
                        <ThemedText
                          style={{
                            fontSize: 11,
                            color: '#fff',
                            fontWeight: '700',
                            textAlign: 'center',
                          }}
                        >
                          🗑️ Delete
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              {/* Scoring Legend */}
              <View
                style={{
                  backgroundColor: '#f9f9f9',
                  padding: 12,
                  borderRadius: 6,
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: '#eee',
                }}
              >
                <ThemedText style={{ fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                  📋 Scoring Guide:
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                  • CA1, CA2, CA3, CA4: Max 10 each
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                  • Exam: Max 60
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: '#666' }}>
                  • Use the Delete button to remove saved scores if needed
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: '#666' }}>
                  • Total: Max 100 (sum of all scores)
                </ThemedText>
              </View>
            </View>
          )}

          {/* Save All Button */}
          {scoreEntries.length > 0 && (
            <TouchableOpacity
              style={{
                backgroundColor: '#4CAF50',
                padding: 16,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 20,
                opacity: savingScores ? 0.6 : 1,
              }}
              onPress={handleSaveAllScores}
              disabled={savingScores}
            >
              {savingScores ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                    Saving Scores...
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  💾 Save All Scores
                </ThemedText>
              )}
            </TouchableOpacity>
          )}

          {/* Empty State */}
          {scoreEntries.length === 0 && !loadingInitial && !initialError && (
            <View
              style={{
                backgroundColor: '#e3f2fd',
                padding: 24,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 40,
              }}
            >
              <ThemedText
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1565c0',
                  marginBottom: 8,
                }}
              >
                📚 Ready to Enter Scores
              </ThemedText>
              <ThemedText
                style={{
                  fontSize: 13,
                  color: '#0d47a1',
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                Select a class, subject, session, term and click "Load Scoring Sheet" to begin entering scores.
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}