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
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useAppColors } from '@/hooks/use-app-colors';

// ── Responsive helpers ────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL = SCREEN_WIDTH < 380;   // e.g. SE, Moto G, Galaxy A series
// frozen student-name column
const FROZEN_COL_W  = IS_SMALL ? 110 : 150;
// each subject group (6 cells × cell width + padding)
const CELL_W        = IS_SMALL ? 40  : 46;
const SUBJECT_COL_W = CELL_W * 6 + 28;   // 6 cells + left-padding + gap
// ─────────────────────────────────────────────────────────────────────

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

interface SubjectScore {
  score_id: number | null;
  ca1: string | number;
  ca2: string | number;
  ca3: string | number;
  ca4: string | number;
  exam: string | number;
}

interface StudentMatrixRow {
  enrollment_id: number;
  student_id: string | number;
  first_name: string;
  last_name: string;
  scores: { [subjectId: number]: SubjectScore };
}

export default function ScoreEntryScreen() {
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);
  // Authentication & Token
  const [token, setToken] = useState<string>('');
  const [countryId, setCountryId] = useState<number | null>(null);
  const [schoolId, setSchoolId] = useState<number | null>(null);

  // Data
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicSessions, setAcademicSessions] = useState<{ id: number; session_name: string }[]>([]);
  const [matrixData, setMatrixData] = useState<StudentMatrixRow[]>([]);

  // Selection State
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<string>('First');
  const [selectedTermId, setSelectedTermId] = useState<number>(1);
  const [showTermDropdown, setShowTermDropdown] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [classSearchFilter, setClassSearchFilter] = useState('');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [searchingSubjects, setSearchingSubjects] = useState(false);
  const [activeModal, setActiveModal] = useState<'session' | 'term' | 'class' | 'subject' | 'subjects-sheet' | null>(null);
  const [selectedSheetSubjects, setSelectedSheetSubjects] = useState<Subject[]>([]);
  const [statusAlert, setStatusAlert] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmLabel?: string;
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

  // Load score sheet when class and subjects are selected
  useEffect(() => {
    if (selectedClass && selectedSessionId && selectedTermId && selectedSheetSubjects.length > 0) {
      loadScoringMatrix(selectedClass.id);
    } else if (!selectedSheetSubjects.length) {
      setMatrixData([]);
    }
  }, [selectedClass, selectedSessionId, selectedTermId, selectedSheetSubjects.length]);

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

  const loadScoringMatrix = async (classId: number) => {
    if (!token || !selectedSessionId || !selectedTermId || selectedSheetSubjects.length === 0) return;

    try {
      setSavingScores(false);
      setLoadingSheet(true);
      setSheetError('');
 
      console.log(`📥 Loading matrix for classId=${classId}, subjects=${selectedSheetSubjects.length}`);
 
      const promises = selectedSheetSubjects.map(sub => 
        fetch(
          `${API_BASE_URL}/api/scores/sheet?classId=${classId}&subjectId=${sub.id}&sessionId=${selectedSessionId}&termId=${selectedTermId}`,
          { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
        ).then(r => r.json())
      );

      const results = await Promise.all(promises);
      const matrixMap: Record<number, StudentMatrixRow> = {};
      
      results.forEach((data, index) => {
        const subjectId = selectedSheetSubjects[index].id;
        if (data.success && data.data) {
          data.data.forEach((item: any) => {
            if (!matrixMap[item.enrollment_id]) {
              matrixMap[item.enrollment_id] = {
                enrollment_id: item.enrollment_id,
                student_id: item.student_id,
                first_name: item.first_name,
                last_name: item.last_name,
                scores: {}
              };
            }
            const parsedScoreId = item.score_id && item.score_id > 0 ? parseInt(item.score_id) : null;
            matrixMap[item.enrollment_id].scores[subjectId] = {
              score_id: parsedScoreId,
              ca1: item.ca1_score !== null ? String(item.ca1_score) : '',
              ca2: item.ca2_score !== null ? String(item.ca2_score) : '',
              ca3: item.ca3_score !== null ? String(item.ca3_score) : '',
              ca4: item.ca4_score !== null ? String(item.ca4_score) : '',
              exam: item.exam_score !== null ? String(item.exam_score) : '',
            };
          });
        }
      });

      const allRows = Object.values(matrixMap);
      allRows.forEach(row => {
        selectedSheetSubjects.forEach(sub => {
          if (!row.scores[sub.id]) {
            row.scores[sub.id] = { score_id: null, ca1: '', ca2: '', ca3: '', ca4: '', exam: '' };
          }
        });
      });

      setMatrixData(allRows);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading matrix';
      setSheetError(errorMessage);
      console.error('Matrix load err:', err);
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleMatrixChange = (
    enrollmentId: number,
    subjectId: number,
    field: string,
    value: string
  ) => {
    const numValue = value === '' ? '' : parseFloat(value);
    const errorKey = `${enrollmentId}-${subjectId}-${field}`;
    let error = '';

    if (numValue !== '') {
      if (field === 'exam') {
        if ((numValue as number) > 60 || (numValue as number) < 0) {
          error = 'Max 60';
        }
      } else {
        if ((numValue as number) > 10 || (numValue as number) < 0) {
          error = 'Max 10';
        }
      }
    }

    const newErrors = { ...scoreErrors };
    if (error) {
      newErrors[errorKey] = error;
    } else {
      delete newErrors[errorKey];
    }
    setScoreErrors(newErrors);

    setMatrixData(prev => prev.map(row => {
      if (row.enrollment_id === enrollmentId) {
        return {
          ...row,
          scores: {
            ...row.scores,
            [subjectId]: {
              ...row.scores[subjectId],
              [field]: numValue
            }
          }
        };
      }
      return row;
    }));
  };

  const calculateTotal = (score: SubjectScore): number => {
    if (!score) return 0;
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

    matrixData.forEach(row => {
      selectedSheetSubjects.forEach(sub => {
        const score = row.scores[sub.id];
        if (!score) return;
        ['ca1', 'ca2', 'ca3', 'ca4'].forEach(field => {
          const val = score[field as keyof SubjectScore];
          const numVal = typeof val === 'string' ? parseFloat(val) : (val as number);
          if (!isNaN(numVal) && numVal !== null) {
             if (numVal > 10 || numVal < 0) {
                errors[`${row.enrollment_id}-${sub.id}-${field}`] = 'Max 10';
                isValid = false;
             }
          }
        });
        const examVal = score.exam;
        const numExam = typeof examVal === 'string' ? parseFloat(examVal) : (examVal as number);
        if (!isNaN(numExam) && numExam !== null) {
          if (numExam > 60 || numExam < 0) {
             errors[`${row.enrollment_id}-${sub.id}-exam`] = 'Max 60';
             isValid = false;
          }
        }
      });
    });

    setScoreErrors(errors);
    return isValid;
  };

  const handleSaveAllScores = async () => {
    setSaveSuccess('');
    setSaveError('');

    if (!validateAllScores()) {
      setSaveError('Please fix all score errors before saving');
      return;
    }

    if (matrixData.length === 0) {
      setSaveError('Please load scoring sheet first');
      return;
    }

    try {
      setSavingScores(true);

      const scoresPayload: any[] = [];
      matrixData.forEach(row => {
         selectedSheetSubjects.forEach(sub => {
            const score = row.scores[sub.id];
            if (score && (score.ca1 !== '' || score.ca2 !== '' || score.ca3 !== '' || score.ca4 !== '' || score.exam !== '')) {
               scoresPayload.push({
                 enrollment_id: row.enrollment_id,
                 subject_id: sub.id,
                 term_id: selectedTermId,
                 sessionId: selectedSessionId,
                 ca1_score: score.ca1 === '' ? null : parseFloat(String(score.ca1)),
                 ca2_score: score.ca2 === '' ? null : parseFloat(String(score.ca2)),
                 ca3_score: score.ca3 === '' ? null : parseFloat(String(score.ca3)),
                 ca4_score: score.ca4 === '' ? null : parseFloat(String(score.ca4)),
                 exam_score: score.exam === '' ? null : parseFloat(String(score.exam)),
               });
            }
         });
      });

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
        
        setTimeout(() => setStatusAlert(prev => ({ ...prev, visible: false })), 3000);

        setTimeout(() => {
          if (selectedClass) {
            loadScoringMatrix(selectedClass.id);
          }
        }, 500);

        setTimeout(() => setSaveSuccess(''), 4000);
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

  // Show loading screen while initializing
  if (loadingInitial) {
    return (
      <View style={[styles.mainWrapper, { backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent.gold} />
        <ThemedText style={{ marginTop: 24, fontSize: 10, fontWeight: '800', letterSpacing: 2, color: Colors.accent.gold }}>INITIALIZING PORTAL...</ThemedText>
      </View>
    );
  }

  const renderDropdownModal = () => {
    if (!activeModal) return null;

    // Content for the Score Sheet Subject Selector (Multi-Select)
    if (activeModal === 'subjects-sheet') {
      return (
        <Modal
          visible={activeModal === 'subjects-sheet'}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '85%', width: '90%', backgroundColor: C.modalBg, borderColor: C.cardBorder }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                  <ThemedText style={styles.modalTitle}>Load Score Sheet</ThemedText>
                  <ThemedText style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Select subjects to load scores for all students</ThemedText>
                </View>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>
              </View>

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
              
              <FlatList
                data={subjects}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => {
                  const isSelected = selectedSheetSubjects.some(s => s.id === item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.dropdownItem, isSelected && styles.selectedItem]}
                      onPress={() => {
                        setSelectedSheetSubjects(prev => 
                          prev.some(s => s.id === item.id)
                            ? prev.filter(s => s.id !== item.id)
                            : [...prev, item]
                        );
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                        <ThemedText style={[styles.dropdownItemText, isSelected && styles.selectedItemText]}>
                          {item.name}
                        </ThemedText>
                        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: isSelected ? Colors.accent.gold : 'rgba(255,255,255,0.1)', backgroundColor: isSelected ? Colors.accent.gold : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                          {isSelected && <Ionicons name="checkmark" size={16} color={Colors.accent.navy} />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 20 }}
              />

              <View style={{ paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
                <CustomButton 
                  title={`Load ${selectedSheetSubjects.length} Subject${selectedSheetSubjects.length !== 1 ? 's' : ''}`}
                  onPress={() => setActiveModal(null)}
                  disabled={selectedSheetSubjects.length === 0}
                  variant="premium"
                />
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    // Standard dropdown logic
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
        visible={!!activeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActiveModal(null)}
        >
          <View style={[styles.modalContent, { backgroundColor: C.modalBg, borderColor: C.cardBorder }]}>
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
      <View style={[styles.mainWrapper, { backgroundColor: C.background }]}>
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
          <View style={[styles.filterSection]}>
            <View style={[styles.glassCard, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterLabel}>Academic Session</ThemedText>
                <TouchableOpacity
                  style={[styles.pickerButton, { backgroundColor: C.pickerButton, borderColor: C.inputBorder }]}
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
                    style={[styles.pickerButton, { backgroundColor: C.pickerButton, borderColor: C.inputBorder }]}
                    onPress={() => setActiveModal('term')}
                  >
                    <ThemedText style={styles.pickerText}>{selectedTerm}</ThemedText>
                    <Ionicons name="chevron-down" size={20} color={Colors.accent.gold} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.filterGroup, { flex: 1.5 }]}>
                  <ThemedText style={styles.filterLabel}>Class</ThemedText>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: C.pickerButton, borderColor: C.inputBorder }]}
                    onPress={() => setActiveModal('class')}
                  >
                    <ThemedText style={selectedClass ? styles.pickerText : styles.placeholderText}>
                      {selectedClass?.display_name || 'Select Class'}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={20} color={Colors.accent.gold} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ marginBottom: 16, marginTop: 8 }}>
                <CustomButton
                  title={selectedSheetSubjects.length > 0 ? `Manage Subjects (${selectedSheetSubjects.length} loaded)` : "Load Score Sheet"}
                  onPress={() => setActiveModal('subjects-sheet')}
                  disabled={!selectedClass}
                  variant="outline"
                  icon={<Ionicons name="document-text-outline" size={20} color={Colors.accent.gold} style={{ marginRight: 12 }} />}
                />
                {!selectedClass && (
                  <ThemedText style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center', marginTop: 8 }}>
                    Please select a class first to load score sheet
                  </ThemedText>
                )}
                {selectedSheetSubjects.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {selectedSheetSubjects.map(sub => (
                      <TouchableOpacity 
                        key={sub.id}
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => setSelectedSheetSubjects(prev => prev.filter(s => s.id !== sub.id))}
                      >
                        <ThemedText style={{ color: Colors.accent.gold, fontSize: 12 }}>{sub.name}</ThemedText>
                        <Ionicons name="close" size={14} color={Colors.accent.gold} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    ))}
                    {/* Add Subject chip — always at the end of the row */}
                    <TouchableOpacity
                      style={{ backgroundColor: 'rgba(250, 204, 21, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.3)', borderStyle: 'dashed' }}
                      onPress={() => setActiveModal('subjects-sheet')}
                    >
                      <Ionicons name="add" size={14} color={Colors.accent.gold} />
                      <ThemedText style={{ color: Colors.accent.gold, fontSize: 12, marginLeft: 4, fontWeight: '700' }}>Add Subject</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Stacked Student Cards */}
          <View style={{ paddingHorizontal: IS_SMALL ? 12 : 20, paddingTop: 12, paddingBottom: 120 }}>

            {/* ── Sheet loading spinner ── */}
            {loadingSheet && (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 14 }}>
                <ActivityIndicator size="large" color={Colors.accent.gold} />
                <ThemedText style={{ color: Colors.accent.gold, fontSize: IS_SMALL ? 10 : 11, fontWeight: '800', letterSpacing: 2 }}>LOADING SCORE SHEET...</ThemedText>
              </View>
            )}

            {/* ── Sheet error banner ── */}
            {!loadingSheet && sheetError !== '' && (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <ThemedText style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1 }}>{sheetError}</ThemedText>
              </View>
            )}

            {/* ── Initial error banner ── */}
            {!loadingSheet && initialError !== '' && (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="warning" size={20} color="#EF4444" />
                <ThemedText style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1 }}>{initialError}</ThemedText>
              </View>
            )}

            {!loadingSheet && matrixData.length > 0 ? (
              matrixData.map(row => (
                <View key={row.enrollment_id} style={{
                  backgroundColor: C.card,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: C.cardBorder,
                  marginBottom: 14,
                  overflow: 'hidden',
                }}>
                  {/* ── Student Header ── */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: C.divider,
                    backgroundColor: C.isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                  }}>
                    <View style={[styles.avatar, { width: 38, height: 38, borderRadius: 12 }]}>
                      <ThemedText style={[styles.avatarText, { fontSize: 14 }]}>
                        {row.first_name[0]}{row.last_name[0]}
                      </ThemedText>
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <ThemedText style={[styles.studentName, { fontSize: 15 }]} numberOfLines={1} ellipsizeMode="tail">
                        {row.first_name} {row.last_name}
                      </ThemedText>
                      <ThemedText style={styles.studentId}>ID: {row.student_id}</ThemedText>
                    </View>
                  </View>

                  {/* ── Subject Rows ── */}
                  {selectedSheetSubjects.map((sub, subIdx) => {
                    const score = row.scores[sub.id] || { score_id: null, ca1: '', ca2: '', ca3: '', ca4: '', exam: '' };
                    const total = calculateTotal(score);
                    const hasError = ['ca1','ca2','ca3','ca4','exam'].some(
                      f => scoreErrors[`${row.enrollment_id}-${sub.id}-${f}`]
                    );
                    return (
                      <View key={sub.id} style={{
                        padding: 12,
                        borderBottomWidth: subIdx < selectedSheetSubjects.length - 1 ? 1 : 0,
                        borderBottomColor: 'rgba(255,255,255,0.05)',
                      }}>
                        {/* Subject name + total badge */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <ThemedText style={{ color: Colors.accent.gold, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, flexShrink: 1, marginRight: 8 }} numberOfLines={1}>
                            {sub.name}
                          </ThemedText>
                          <View style={{ backgroundColor: total > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: total > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)' }}>
                            <ThemedText style={{ fontSize: 13, fontWeight: '900', color: total > 0 ? '#22C55E' : 'rgba(255,255,255,0.3)' }}>
                              {total > 0 ? total.toFixed(0) : '—'} / 100
                            </ThemedText>
                          </View>
                        </View>

                        {/* Input grid: two rows of labels + inputs */}
                        <View style={{ gap: 8 }}>
                          {/* Row 1: CA1  CA2  CA3  CA4 */}
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            {(['ca1','ca2','ca3','ca4'] as const).map(f => (
                              <View key={f} style={{ flex: 1, alignItems: 'center' }}>
                                <ThemedText style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: '800', letterSpacing: 1, marginBottom: 4 }}>
                                  {f.toUpperCase()}
                                </ThemedText>
                                <TextInput
                                  style={[styles.stackInput, scoreErrors[`${row.enrollment_id}-${sub.id}-${f}`] && styles.errorInput]}
                                  keyboardType="decimal-pad"
                                  placeholder="—"
                                  placeholderTextColor="rgba(255,255,255,0.15)"
                                  value={String(score[f as keyof SubjectScore] ?? '')}
                                  onChangeText={val => handleMatrixChange(row.enrollment_id, sub.id, f, val)}
                                />
                                {scoreErrors[`${row.enrollment_id}-${sub.id}-${f}`] ? (
                                  <ThemedText style={{ fontSize: 8, color: '#EF4444', marginTop: 2 }}>Max 10</ThemedText>
                                ) : null}
                              </View>
                            ))}
                          </View>

                          {/* Row 2: EXAM (wider) */}
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 2, alignItems: 'center' }}>
                              <ThemedText style={{ fontSize: 9, color: 'rgba(34,197,94,0.7)', fontWeight: '800', letterSpacing: 1, marginBottom: 4 }}>
                                EXAM
                              </ThemedText>
                              <TextInput
                                style={[styles.stackInput, { borderColor: 'rgba(34,197,94,0.25)', width: '100%' }, scoreErrors[`${row.enrollment_id}-${sub.id}-exam`] && styles.errorInput]}
                                keyboardType="decimal-pad"
                                placeholder="—"
                                placeholderTextColor="rgba(255,255,255,0.15)"
                                value={String(score.exam ?? '')}
                                onChangeText={val => handleMatrixChange(row.enrollment_id, sub.id, 'exam', val)}
                              />
                              {scoreErrors[`${row.enrollment_id}-${sub.id}-exam`] ? (
                                <ThemedText style={{ fontSize: 8, color: '#EF4444', marginTop: 2 }}>Max 60</ThemedText>
                              ) : null}
                            </View>
                            {/* spacer to keep EXAM on the left half */}
                            <View style={{ flex: 2 }} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            ) : (
              !loadingSheet && sheetError === '' && initialError === '' && (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.1)" />
                  <ThemedText style={styles.emptyTitle}>No Records Loaded</ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    Select a class and subjects, then tap "Load Score Sheet" to begin entering scores
                  </ThemedText>
                </View>
              )
            )}
          </View>
        </ScrollView>

        {/* Floating Save Button */}
        {matrixData.length > 0 && (
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

        {/* Global Status Overlay */}
        {statusAlert.visible && (
          <CustomAlert 
            type={statusAlert.type} 
            title={statusAlert.title} 
            message={statusAlert.message} 
            onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
            onConfirm={statusAlert.onConfirm}
            confirmLabel={statusAlert.confirmLabel}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
  return StyleSheet.create({
    mainWrapper:     { flex: 1 },
    scrollContent:   { paddingBottom: 120 },

    // ── Hero ──────────────────────────────────────────────────────────
    hero:            { height: IS_SMALL ? 200 : 260, width: '100%' },
    heroOverlay:     { flex: 1, paddingHorizontal: IS_SMALL ? 16 : 24, paddingTop: IS_SMALL ? 44 : 60 },
    header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: IS_SMALL ? 12 : 20 },
    backButton:      { width: 40, height: 40, borderRadius: 12, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
    headerActions:   { flexDirection: 'row', gap: 8 },
    actionIcon:      { width: 40, height: 40, borderRadius: 12, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
    heroContent:     { marginTop: 'auto', marginBottom: IS_SMALL ? 14 : 20 },
    heroSubtitle:    { color: Colors.accent.gold, fontSize: IS_SMALL ? 9 : 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
    heroMainTitle:   { color: C.isDark ? '#FFFFFF' : '#0F172A', fontSize: IS_SMALL ? 26 : 32, fontWeight: '900', letterSpacing: -1 },

    // ── Filters ───────────────────────────────────────────────────────
    filterSection:   { paddingHorizontal: IS_SMALL ? 12 : 20, paddingTop: IS_SMALL ? 16 : 24, paddingBottom: 12 },
    glassCard:       { backgroundColor: C.card, borderRadius: 20, padding: IS_SMALL ? 14 : 20, borderWidth: 1, borderColor: C.cardBorder },
    filterGroup:     { marginBottom: IS_SMALL ? 14 : 20 },
    filterLabel:     { color: C.textLabel, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: IS_SMALL ? 8 : 12, textTransform: 'uppercase' },

    pickerButton:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.inputBg, borderRadius: 14, paddingHorizontal: 14, height: IS_SMALL ? 46 : 52, borderWidth: 1, borderColor: C.inputBorder },
    pickerText:      { color: C.text, fontSize: IS_SMALL ? 13 : 14, fontWeight: '600', flexShrink: 1, marginRight: 6 },
    placeholderText: { color: C.placeholder, fontSize: IS_SMALL ? 13 : 14, fontWeight: '600', flexShrink: 1, marginRight: 6 },

    // ── Matrix table ──────────────────────────────────────────────────
    listContent:          { paddingTop: 12, paddingBottom: 120 },
    table:                { backgroundColor: C.card, borderRadius: 20, padding: IS_SMALL ? 10 : 16, borderWidth: 1, borderColor: C.cardBorder, marginLeft: IS_SMALL ? 12 : 20 },
    tableRow:             { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.divider, paddingVertical: IS_SMALL ? 8 : 12 },

    frozenColHeader:      { width: FROZEN_COL_W, justifyContent: 'center' },
    frozenCol:            { width: FROZEN_COL_W, justifyContent: 'center' },
    tableHeaderText:      { color: C.textLabel, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },

    subjectColGroup:      { width: SUBJECT_COL_W, borderLeftWidth: 1, borderLeftColor: C.border, paddingLeft: 10 },
    tableHeaderSubject:   { fontSize: IS_SMALL ? 11 : 13, fontWeight: '800', color: Colors.accent.gold, marginBottom: 6, textAlign: 'center' },
    subHeaders:           { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 4 },
    subHeader:            { fontSize: 8, color: C.textLabel, fontWeight: '800', width: CELL_W, textAlign: 'center' },

    subjectColGroupData:  { width: SUBJECT_COL_W, borderLeftWidth: 1, borderLeftColor: C.border, paddingLeft: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 4 },
    tableInput:           { width: CELL_W, height: IS_SMALL ? 36 : 40, backgroundColor: C.inputBg, borderRadius: 8, color: C.inputText, textAlign: 'center', fontSize: IS_SMALL ? 11 : 13, fontWeight: '700', borderWidth: 1, borderColor: C.inputBorder },
    errorInput:           { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)' },
    stackInput:           { width: '100%', height: IS_SMALL ? 40 : 44, backgroundColor: C.inputBg, borderRadius: 10, color: C.inputText, textAlign: 'center', fontSize: IS_SMALL ? 14 : 15, fontWeight: '700', borderWidth: 1, borderColor: C.inputBorder },
    tableTotal:           { width: CELL_W, height: IS_SMALL ? 36 : 40, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
    tableTotalText:       { fontSize: IS_SMALL ? 11 : 13, color: '#22C55E', fontWeight: '900' },

    avatar:               { backgroundColor: C.isDark ? 'rgba(255,255,255,0.05)' : '#E8EEF4', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.accent.gold },
    avatarText:           { color: Colors.accent.gold, fontWeight: '800' },
    studentName:          { fontSize: IS_SMALL ? 11 : 13, fontWeight: '800', color: C.text, marginBottom: 2 },
    studentId:            { fontSize: IS_SMALL ? 9 : 10, color: C.textSecondary, fontWeight: '600' },

    // ── Floating / Alerts ─────────────────────────────────────────────
    floatingActions:      { position: 'absolute', bottom: 24, left: IS_SMALL ? 12 : 20, right: IS_SMALL ? 12 : 20, gap: 10 },
    alertOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: IS_SMALL ? 16 : 24 },

    // ── Modals ────────────────────────────────────────────────────────
    modalOverlay:    { flex: 1, backgroundColor: C.modalOverlay, justifyContent: 'center', padding: IS_SMALL ? 12 : 20 },
    modalContent:    { backgroundColor: C.modalBg, borderRadius: IS_SMALL ? 24 : 32, padding: IS_SMALL ? 16 : 24, maxHeight: '85%', borderWidth: 1, borderColor: C.cardBorder },
    modalTitle:      { color: C.text, fontSize: IS_SMALL ? 17 : 20, fontWeight: '900', marginBottom: IS_SMALL ? 14 : 20, textAlign: 'center' },
    dropdownItem:    { paddingVertical: IS_SMALL ? 12 : 16, borderBottomWidth: 1, borderBottomColor: C.divider, paddingHorizontal: 4 },
    dropdownItemText:{ color: C.text, fontSize: IS_SMALL ? 14 : 15, fontWeight: '600' },
    selectedItem:    { backgroundColor: 'rgba(250,204,21,0.1)', borderRadius: 10 },
    selectedItemText:{ color: Colors.accent.gold },

    // ── Empty state ───────────────────────────────────────────────────
    emptyState:      { padding: IS_SMALL ? 28 : 40, alignItems: 'center', marginTop: IS_SMALL ? 24 : 40 },
    emptyTitle:      { color: C.text, fontSize: IS_SMALL ? 16 : 18, fontWeight: '800', marginTop: 16, marginBottom: 8 },
    emptySubtitle:   { color: C.textSecondary, fontSize: IS_SMALL ? 12 : 13, textAlign: 'center', lineHeight: 20 },
  });
}