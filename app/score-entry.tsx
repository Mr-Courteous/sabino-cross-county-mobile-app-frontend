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
  ImageBackground,
  Dimensions,
  Modal,
  StyleSheet,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/utils/api-service';
import { Colors } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { router } from 'expo-router';
import { getStorageItem as getToken } from '@/utils/storage';

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
  const [activeModal, setActiveModal] = useState<'session' | 'term' | 'class' | 'subject' | null>(null);
  const [statusAlert, setStatusAlert] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

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
        setStatusAlert({
          visible: true,
          type: 'error',
          title: 'Missing Data',
          message: 'Please enter at least one score before saving.'
        });
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
        setStatusAlert({
          visible: true,
          type: 'success',
          title: 'System Updated',
          message: `${data.count} score(s) record(s) have been successfully uploaded.`
        });

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
        setStatusAlert({
          visible: true,
          type: 'error',
          title: 'Update Failed',
          message: data.message || data.error || 'The system was unable to save the score records.'
        });
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
        setStatusAlert({
          visible: true,
          type: 'error',
          title: 'Session Expired',
          message: 'Your authentication token is missing. Please log in again to continue.'
        });
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
              setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Deletion Failed',
                message: errorMessage
              });
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
          
          setStatusAlert({
            visible: true,
            type: 'success',
            title: 'Record Cleared',
            message: hasValidScoreId ? 'The score record has been permanently removed from the server.' : 'Local score fields have been cleared.'
          });

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
        setStatusAlert({
          visible: true,
          type: 'warning',
          title: 'Clear Score',
          message: `Are you sure you want to clear score record? This cannot be undone.`,
          onConfirm: executeDelete
        });
      }
    } catch (err) {
      console.error(`❌ Critical error in handleDeleteScore:`, err);
    }
  };


  if (loadingInitial) {
    return (
      <ThemedView style={[styles.mainWrapper, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent.gold} />
        <ThemedText style={{ marginTop: 24, fontSize: 10, fontWeight: '800', letterSpacing: 2, color: Colors.accent.gold }}>INITIALIZING PORTAL...</ThemedText>
      </ThemedView>
    );
  }

  const renderDropdownModal = () => {
    let data: any[] = [];
    let title = '';
    let currentSelection: any = null;
    let onSelect = (item: any) => {};

    switch (activeModal) {
      case 'session':
        data = academicSessions;
        title = 'Select Session';
        currentSelection = selectedSessionId;
        onSelect = (item) => {
          setSelectedSession(item.session_name);
          setSelectedSessionId(item.id);
        };
        break;
      case 'term':
        data = terms.map(t => ({ id: t, name: t }));
        title = 'Select Term';
        currentSelection = selectedTerm;
        onSelect = (item) => setSelectedTerm(item.name);
        break;
      case 'class':
        data = classes;
        title = 'Select Class';
        currentSelection = selectedClass?.id;
        onSelect = (item) => setSelectedClass(item);
        break;
      case 'subject':
        data = subjects;
        title = 'Select Subject';
        currentSelection = selectedSubject?.id;
        onSelect = (item) => setSelectedSubject(item);
        break;
    }

    return (
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>{title}</ThemedText>
            
            {activeModal === 'subject' && (
              <View style={[styles.pickerButton, { marginBottom: 16 }]}>
                <Ionicons name="search" size={20} color="rgba(255,255,255,0.4)" />
                <TextInput
                  style={[styles.pickerText, { flex: 1, marginLeft: 12 }]}
                  placeholder="Search subjects..."
                  value={subjectSearchQuery}
                  onChangeText={setSubjectSearchQuery}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>
            )}

            <FlatList
              data={data}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const isSelected = activeModal === 'term' ? currentSelection === item.name : currentSelection === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.dropdownItem, isSelected && styles.selectedItem]}
                    onPress={() => {
                      onSelect(item);
                      setActiveModal(null);
                    }}
                  >
                    <ThemedText style={[styles.dropdownItemText, isSelected && styles.selectedItemText]}>
                      {item.session_name || item.name || item.display_name}
                    </ThemedText>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ThemedView style={styles.mainWrapper}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Header */}
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070' }}
            style={styles.hero}
          >
            <LinearGradient
              colors={['transparent', Colors.accent.navy]}
              style={styles.heroOverlay}
            >
              <View style={styles.header}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.actionIcon}>
                    <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.heroContent}>
                <ThemedText style={styles.heroSubtitle}>ACADEMIC PERFORMANCE</ThemedText>
                <ThemedText style={styles.heroMainTitle}>Score Entry</ThemedText>
              </View>
            </LinearGradient>
          </ImageBackground>

          {/* Filter Section */}
          <View style={styles.filterSection}>
            <View style={styles.glassCard}>
              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterLabel}>Academic Session</ThemedText>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setActiveModal('session')}
                >
                  <ThemedText style={selectedSession ? styles.pickerText : styles.placeholderText}>
                    {selectedSession || 'Choose Session'}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={20} color={Colors.accent.gold} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={[styles.filterGroup, { flex: 1 }]}>
                  <ThemedText style={styles.filterLabel}>Term</ThemedText>
                  <TouchableOpacity 
                    style={styles.pickerButton}
                    onPress={() => setActiveModal('term')}
                  >
                    <ThemedText style={styles.pickerText}>{selectedTerm}</ThemedText>
                    <Ionicons name="chevron-down" size={20} color={Colors.accent.gold} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.filterGroup, { flex: 1.5 }]}>
                  <ThemedText style={styles.filterLabel}>Class</ThemedText>
                  <TouchableOpacity 
                    style={styles.pickerButton}
                    onPress={() => setActiveModal('class')}
                  >
                    <ThemedText style={selectedClass ? styles.pickerText : styles.placeholderText}>
                      {selectedClass?.display_name || 'Select Class'}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={20} color={Colors.accent.gold} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterLabel}>Subject</ThemedText>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setActiveModal('subject')}
                >
                  <ThemedText style={selectedSubject ? styles.pickerText : styles.placeholderText}>
                    {selectedSubject?.name || 'Select Subject'}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={20} color={Colors.accent.gold} />
                </TouchableOpacity>
              </View>

              <CustomButton
                title="Load Scoring Sheet"
                onPress={() => selectedClass && loadScoringSheet(selectedClass.id)}
                loading={loadingSheet}
                disabled={!selectedClass || !selectedSubject}
                variant="premium"
                style={{ marginTop: 8 }}
                icon={<Ionicons name="cloud-download-outline" size={20} color={Colors.accent.navy} style={{ marginRight: 8 }} />}
              />
            </View>
          </View>

          {/* Student List */}
          <View style={styles.listContent}>
            {scoreEntries.length > 0 ? (
              scoreEntries.map((entry) => (
                <View key={entry.enrollment_id} style={styles.studentCard}>
                  <View style={styles.studentHeader}>
                    <View style={styles.avatar}>
                      <ThemedText style={styles.avatarText}>
                        {entry.first_name[0]}{entry.last_name[0]}
                      </ThemedText>
                    </View>
                    <View style={styles.nameInfo}>
                      <ThemedText style={styles.studentName}>
                        {entry.first_name} {entry.last_name}
                      </ThemedText>
                      <ThemedText style={styles.classInfo}>
                        ID: {entry.student_id} • {selectedClass?.display_name}
                      </ThemedText>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteAction}
                      onPress={() => handleDeleteScore(entry.score_id, entry.enrollment_id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.scoreGrid}>
                    {['ca1', 'ca2', 'ca3', 'ca4'].map((field) => (
                      <View key={field} style={styles.scoreInputWrapper}>
                        <ThemedText style={styles.inputLabel}>{field.toUpperCase()}</ThemedText>
                        <TextInput
                          style={[
                            styles.scoreInput,
                            scoreErrors[`${entry.enrollment_id}-${field}`] && styles.errorInput
                          ]}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          value={String(entry[field as keyof ScoreEntry] ?? '')}
                          onChangeText={(text) => handleScoreChange(entry.enrollment_id, field, text)}
                        />
                      </View>
                    ))}

                    <View style={styles.scoreInputWrapper}>
                      <ThemedText style={styles.inputLabel}>EXAM</ThemedText>
                      <TextInput
                        style={[
                          styles.scoreInput,
                          scoreErrors[`${entry.enrollment_id}-exam`] && styles.errorInput
                        ]}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={String(entry.exam ?? '')}
                        onChangeText={(text) => handleScoreChange(entry.enrollment_id, 'exam', text)}
                      />
                    </View>

                    <View style={styles.totalContainer}>
                      <ThemedText style={styles.totalLabel}>TOTAL</ThemedText>
                      <ThemedText style={styles.totalValue}>
                        {calculateTotal(entry).toFixed(0)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              !loadingSheet && (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.1)" />
                  <ThemedText style={styles.emptyTitle}>No Records Loaded</ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    Select class and subject then load the sheet to start entering scores
                  </ThemedText>
                </View>
              )
            )}
          </View>
        </ScrollView>

        {/* Floating Save Button */}
        {scoreEntries.length > 0 && (
          <View style={styles.floatingActions}>
            <CustomButton
              title={savingScores ? "Saving..." : "Save All Scores"}
              onPress={handleSaveAllScores}
              loading={savingScores}
              variant="premium"
              style={{ height: 60, borderRadius: 20 }}
              icon={<Ionicons name="save-outline" size={24} color={Colors.accent.navy} style={{ marginRight: 10 }} />}
            />
          </View>
        )}

        {/* Modals */}
        {renderDropdownModal()}

        {statusAlert.visible && (
          <CustomAlert
            type={statusAlert.type}
            title={statusAlert.title}
            message={statusAlert.message}
            onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
            onConfirm={statusAlert.onConfirm}
            style={{ marginBottom: 20 }}
          />
        )}
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: Colors.accent.navy },
  scrollContent: { paddingBottom: 120 },
  hero: { height: 260, width: '100%' },
  heroOverlay: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  heroContent: { marginTop: 'auto', marginBottom: 20 },
  heroSubtitle: { color: Colors.accent.gold, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  heroMainTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: -1 },

  filterSection: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  glassCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  filterGroup: { marginBottom: 20 },
  filterLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' },
  
  pickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pickerText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  placeholderText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '600' },

  listContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 },
  studentCard: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  studentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.accent.gold },
  avatarText: { color: Colors.accent.gold, fontSize: 16, fontWeight: '800' },
  nameInfo: { flex: 1, marginLeft: 16 },
  studentName: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  classInfo: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },

  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  scoreInputWrapper: { width: '31%' },
  inputLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  scoreInput: { height: 48, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF', textAlign: 'center', fontSize: 14, fontWeight: '700' },
  errorInput: { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  
  totalContainer: { width: '31%', height: 48, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)', marginTop: 16 },
  totalLabel: { fontSize: 9, color: '#22C55E', fontWeight: '800', marginBottom: 2 },
  totalValue: { fontSize: 14, color: '#22C55E', fontWeight: '900' },

  deleteAction: { width: 44, height: 44, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },

  floatingActions: { position: 'absolute', bottom: 30, left: 24, right: 24, gap: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1E293B', borderRadius: 32, padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  dropdownItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  dropdownItemText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  selectedItem: { backgroundColor: 'rgba(250, 204, 21, 0.1)', borderRadius: 12 },
  selectedItemText: { color: Colors.accent.gold },

  emptyState: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 20 },

});