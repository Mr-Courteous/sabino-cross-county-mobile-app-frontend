import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  Platform, 
  Alert, 
  Modal, 
  ImageBackground, 
  ScrollView,
  Dimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/utils/api-service';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/design-system';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { useRouter } from 'expo-router';
import { useAppColors } from '@/hooks/use-app-colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TINY = SCREEN_WIDTH < 320;
const IS_MICRO = SCREEN_WIDTH < 280;
const IS_ULTRA = SCREEN_WIDTH < 260;

const getToken = async () => {
  if (Platform.OS !== 'web') return await SecureStore.getItemAsync('userToken');
  return localStorage.getItem('userToken');
};



export default function ReportSearchScreen() {
  const router = useRouter();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);
  const [mode, setMode] = useState<'student' | 'class'>('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStudentTerms, setSelectedStudentTerms] = useState<{ [key: number]: string }>({});

  // Class mode filters
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedSession, setSelectedSession] = useState('1');
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classReportData, setClassReportData] = useState<any[]>([]);
  const [showingReportData, setShowingReportData] = useState(false);
  
  // Track successful emails for visual feedback
  const [sentSuccessIds, setSentSuccessIds] = useState<Record<string, boolean>>({});

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

  // Native Score Preview State
  const [selectedPreviewStudent, setSelectedPreviewStudent] = useState<any>(null);
  const [regeneratingRemark, setRegeneratingRemark] = useState(false);

  // Dropdown States
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [showTermSelector, setShowTermSelector] = useState(false);

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [currentEmailRequest, setCurrentEmailRequest] = useState<{
    enrollmentId: number;
    studentName: string;
    term: number;
    sessionId: number;
  } | null>(null);

  const [emailInput, setEmailInput] = useState('');

  // 1. Fetch Class List or Search Students
  const handleFetch = useCallback(async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();

      if (!token) {
        setError('Authentication required. Please login again.');
        return;
      }

      const endpoint = mode === 'student'
        ? `/api/reports/search/students?name=${encodeURIComponent(query)}`
        : `/api/classes`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();

      if (json.success) {
        const normalizedData = json.data.map((item: any) => {
          if (item.class_average !== undefined) {
            item.class_average = item.class_average ? Number(item.class_average) : null;
          }
          if (item.subject_class_average !== undefined) {
            item.subject_class_average = item.subject_class_average ? Number(item.subject_class_average) : null;
          }
          if (item.ca1_score !== undefined) item.ca1_score = Number(item.ca1_score) || 0;
          if (item.ca2_score !== undefined) item.ca2_score = Number(item.ca2_score) || 0;
          if (item.ca3_score !== undefined) item.ca3_score = Number(item.ca3_score) || 0;
          if (item.ca4_score !== undefined) item.ca4_score = Number(item.ca4_score) || 0;
          if (item.exam_score !== undefined) item.exam_score = Number(item.exam_score) || 0;
          if (item.student_total !== undefined) item.student_total = Number(item.student_total) || 0;
          if (item.subject_total !== undefined) item.subject_total = Number(item.subject_total) || 0;
          return item;
        });

        setResults(normalizedData);
        if (normalizedData.length === 0 && query) {
          setError(`No ${mode === 'student' ? 'students' : 'classes'} found matching your search.`);
        }
      } else {
        setError(json.error || 'Failed to fetch data');
      }
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Connection error. Check your network.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'student') {
      if (searchQuery.length >= 3) {
        handleFetch(searchQuery);
      } else if (searchQuery.length === 0) {
        setResults([]);
      }
    } else {
      handleFetch();
      fetchSessions();
    }
  }, [mode, searchQuery, handleFetch]);

  const fetchSessions = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/academic-sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (json.success && json.data) {
        setSessions(json.data);
        if (json.data.length > 0) {
          setSelectedSession(String(json.data[0].id));
        }
      }
    } catch (err) {
    }
  };

  const fetchClassReportData = async () => {
    if (!selectedClass) return;
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const endpoint = `/api/reports/data/class/${selectedClass}?term=${selectedTerm}&sessionId=${selectedSession}`;
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (json.success) {
        setClassReportData(json.data);
        setShowingReportData(true);
      } else {
        setError(json.error || 'Failed to load class report data');
      }
    } catch (err) {
      setError('Connection error occurred while fetching reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailModalSubmit = async () => {
    if (!currentEmailRequest || !emailInput.trim()) return;
    if (!emailInput.includes('@')) {
      setStatusAlert({ visible: true, type: 'error', title: 'Invalid Email', message: 'Enter a valid address.' });
      return;
    }
    
    const request = currentEmailRequest;
    setCurrentEmailRequest(null);
    setLoading(true);

    try {
      const token = await getToken();
      const emailUrl = `${API_BASE_URL}/api/reports/email/official-report/${request.enrollmentId}`;
      const response = await fetch(emailUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ term: request.term, sessionId: request.sessionId, email: emailInput.trim() }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setShowSuccessModal(true);
        setSentSuccessIds(prev => ({ ...prev, [`${request.enrollmentId}-${request.term}`]: true }));
      } else {
        throw new Error(result.error || 'Dispatch failure');
      }
    } catch (err: any) {
      setStatusAlert({ visible: true, type: 'error', title: 'Dispatch Error', message: err.message || 'Failed to transmit report.' });
    } finally {
      setLoading(false);
      setEmailInput('');
    }
  };

  const handleProceedToEmail = () => {
    if (!selectedPreviewStudent) return;
    const student = selectedPreviewStudent;
    const term = Number(student.displayTerm || '1');
    const sessionId = Number(student.session_id || selectedSession);
    setSelectedPreviewStudent(null);
    setCurrentEmailRequest({
      enrollmentId: student.enrollment_id,
      studentName: student.name || `${student.first_name} ${student.last_name}`,
      term,
      sessionId
    });
  };

  const handleRegenerateRemark = async () => {
    if (!selectedPreviewStudent) return;
    const enrollmentId = selectedPreviewStudent.enrollment_id;
    const term = selectedPreviewStudent.displayTerm || '1';
    const sessionId = selectedPreviewStudent.session_id || selectedSession;

    setRegeneratingRemark(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/reports/regenerate-remark/${enrollmentId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ term: parseInt(term), sessionId: parseInt(sessionId) }),
        }
      );
      const result = await response.json();
      if (response.ok && result.success) {
        setStatusAlert({
          visible: true,
          type: 'success',
          title: 'Remark Regenerated',
          message: result.message || 'AI remark has been regenerated successfully.',
        });
      } else {
        throw new Error(result.error || 'Failed to regenerate remark');
      }
    } catch (err: any) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Regeneration Failed',
        message: err.message || 'Could not regenerate AI remark. Please try again.',
      });
    } finally {
      setRegeneratingRemark(false);
    }
  };

  const handleNativePreview = (student: any, term: string) => {
    student.displayTerm = term;
    setSelectedPreviewStudent(student);
  };

  const renderStudentItem = ({ item }: { item: any }) => {
    const term = selectedStudentTerms[item.enrollment_id] || '1';
    const isSent = sentSuccessIds[`${item.enrollment_id}-${term}`];

    return (
      <View style={[styles.resultCard, IS_TINY && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={[styles.avatarContainer, IS_TINY && { marginBottom: 12 }]}>
          <ThemedText style={styles.avatarText}>{(item.first_name?.[0] || '') + (item.last_name?.[0] || '')}</ThemedText>
        </View>
        <View style={[styles.studentInfo, IS_TINY && { marginLeft: 0, width: '100%' }]}>
          <ThemedText style={styles.resultTitle}>{item.first_name} {item.last_name}</ThemedText>
          <View style={styles.metaRow}>
            <Ionicons name="school-outline" size={12} color={C.textSecondary} />
            <ThemedText style={styles.resultSubtitle}>{item.class_name}</ThemedText>
          </View>
          
          <View style={[styles.termSection, IS_TINY && { flexWrap: 'wrap' }]}>
            {['1', '2', '3'].map((t) => (
              <TouchableOpacity 
                key={t}
                style={[styles.miniChip, term === t && styles.activeMiniChip]}
                onPress={() => setSelectedStudentTerms(prev => ({ ...prev, [item.enrollment_id]: t }))}
              >
                <ThemedText style={[styles.miniChipText, term === t && styles.activeMiniChipText]}>TERM {t}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.fullActionBtn}
              onPress={() => handleNativePreview(item, term)}
            >
              <Ionicons name="eye-outline" size={IS_TINY ? 14 : 16} color={C.text} />
              <ThemedText style={styles.actionBtnText}>Preview</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.fullActionBtn, isSent && { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.05)' }]}
              onPress={() => setCurrentEmailRequest({
                enrollmentId: item.enrollment_id,
                studentName: `${item.first_name} ${item.last_name}`,
                term: Number(term),
                sessionId: item.session_id
              })}
            >
              <Ionicons name={isSent ? "checkmark-circle" : "mail-outline"} size={IS_TINY ? 14 : 16} color={isSent ? "#10B981" : C.text} />
              <ThemedText style={[styles.actionBtnText, isSent && { color: '#10B981' }]}>
                {isSent ? "Sent" : "Email"}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderClassReportStudent = ({ item }: { item: any }) => {
    const isSent = sentSuccessIds[`${item.enrollment_id}-${selectedTerm}`];
    return (
      <View style={[styles.resultCard, IS_TINY && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={[styles.rankBadge, IS_TINY && { marginBottom: 12 }]}>
          <ThemedText style={styles.rankText}>{classReportData.indexOf(item) + 1}</ThemedText>
        </View>
        <View style={[styles.studentInfo, IS_TINY && { marginLeft: 0, width: '100%' }]}>
          <ThemedText style={styles.resultTitle}>{item.name}</ThemedText>
          <ThemedText style={styles.scoreMeta}>CUMULATIVE: {Math.round(item.grand_total)} POINTS</ThemedText>
          
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.fullActionBtn}
              onPress={() => handleNativePreview(item, selectedTerm)}
            >
              <Ionicons name="eye-outline" size={IS_TINY ? 14 : 16} color={C.text} />
              <ThemedText style={styles.actionBtnText}>Preview</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.fullActionBtn, isSent && { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.05)' }]}
              onPress={() => setCurrentEmailRequest({
                enrollmentId: item.enrollment_id,
                studentName: item.name,
                term: Number(selectedTerm),
                sessionId: Number(selectedSession)
              })}
            >
              <Ionicons name={isSent ? "checkmark-circle" : "mail-outline"} size={IS_TINY ? 14 : 16} color={isSent ? "#10B981" : C.text} />
              <ThemedText style={[styles.actionBtnText, isSent && { color: '#10B981' }]}>
                {isSent ? "Sent" : "Email Official"}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.mainWrapper}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070' }}
        style={styles.hero}
      >
        <LinearGradient
          colors={['transparent', C.isDark ? Colors.accent.navy : C.background]}
          style={styles.heroOverlay}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={C.isDark ? "#FFFFFF" : Colors.accent.navy} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Report Center</ThemedText>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.heroContent}>
            <ThemedText style={styles.heroSubtitle}>ACADEMIC LOGISTICS</ThemedText>
            <ThemedText style={styles.heroTitle}>Student Records</ThemedText>
          </View>
        </LinearGradient>
      </ImageBackground>

      <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          <View style={styles.glassCard}>
            <View style={styles.modeToggle}>
              <TouchableOpacity 
                style={[styles.modeBtn, mode === 'student' && styles.activeModeBtn]}
                onPress={() => { setMode('student'); setShowingReportData(false); setResults([]); }}
              >
                <ThemedText style={[styles.modeBtnText, mode === 'student' && styles.activeModeBtnText]}>Direct Search</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeBtn, mode === 'class' && styles.activeModeBtn]}
                onPress={() => { setMode('class'); setResults([]); }}
              >
                <ThemedText style={[styles.modeBtnText, mode === 'class' && styles.activeModeBtnText]}>Class Batching</ThemedText>
              </TouchableOpacity>
            </View>

            {mode === 'student' ? (
              <View style={styles.searchWrapper}>
                <Ionicons name="search" size={20} color={C.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter student name to search..."
                  placeholderTextColor={C.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            ) : !showingReportData && (
              <View style={styles.filtersArea}>
                <View style={styles.filterRow}>
                  <View style={styles.filterGroup}>
                    <ThemedText style={styles.filterLabel}>ACADEMIC YEAR</ThemedText>
                    <TouchableOpacity style={styles.inputSelector} onPress={() => setShowSessionSelector(!showSessionSelector)}>
                      <ThemedText style={styles.selectorText}>
                        {sessions.find((s: any) => String(s.id) === selectedSession)?.session_name || 'Select Session'}
                      </ThemedText>
                      <Ionicons name={showSessionSelector ? "chevron-up" : "chevron-down"} size={20} color={Colors.accent.gold} />
                    </TouchableOpacity>
                    {showSessionSelector && (
                      <View style={styles.selectorList}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                          {sessions.map((sess: any) => (
                            <TouchableOpacity key={sess.id} style={[styles.selectorItem, selectedSession === String(sess.id) && styles.selectorItemActive]} onPress={() => { setSelectedSession(String(sess.id)); setShowSessionSelector(false); }}>
                              <ThemedText style={[styles.selectorItemText, selectedSession === String(sess.id) && styles.selectorItemTextActive]}>{sess.session_name}</ThemedText>
                              {selectedSession === String(sess.id) && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <View style={styles.filterGroup}>
                    <ThemedText style={styles.filterLabel}>PERIOD</ThemedText>
                    <TouchableOpacity style={styles.inputSelector} onPress={() => setShowTermSelector(!showTermSelector)}>
                      <ThemedText style={styles.selectorText}>Term {selectedTerm}</ThemedText>
                      <Ionicons name={showTermSelector ? "chevron-up" : "chevron-down"} size={20} color={Colors.accent.gold} />
                    </TouchableOpacity>
                    {showTermSelector && (
                      <View style={styles.selectorList}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                          {['1', '2', '3'].map((term) => (
                            <TouchableOpacity key={term} style={[styles.selectorItem, selectedTerm === term && styles.selectorItemActive]} onPress={() => { setSelectedTerm(term); setShowTermSelector(false); }}>
                              <ThemedText style={[styles.selectorItemText, selectedTerm === term && styles.selectorItemTextActive]}>Term {term}</ThemedText>
                              {selectedTerm === term && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.filterGroup}>
                  <ThemedText style={styles.filterLabel}>SELECT CLASS</ThemedText>
                  <TouchableOpacity style={styles.inputSelector} onPress={() => setShowClassSelector(!showClassSelector)}>
                    <ThemedText style={styles.selectorText}>
                      {classes.find((c: any) => String(c.id) === selectedClass)?.display_name || 'Select Class'}
                    </ThemedText>
                    <Ionicons name={showClassSelector ? "chevron-up" : "chevron-down"} size={20} color={Colors.accent.gold} />
                  </TouchableOpacity>
                  {showClassSelector && (
                    <View style={styles.selectorList}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {classes.map((cls: any) => (
                          <TouchableOpacity key={cls.id} style={[styles.selectorItem, selectedClass === String(cls.id) && styles.selectorItemActive]} onPress={() => { setSelectedClass(String(cls.id)); setShowClassSelector(false); }}>
                            <ThemedText style={[styles.selectorItemText, selectedClass === String(cls.id) && styles.selectorItemTextActive]}>{cls.display_name}</ThemedText>
                            {selectedClass === String(cls.id) && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {selectedClass && (
                  <CustomButton title="Initialize Report Generation" onPress={fetchClassReportData} loading={loading} variant="premium" />
                )}
              </View>
            )}
          </View>
        </View>

        {mode === 'class' && showingReportData && (
          <View style={{ paddingHorizontal: 24, paddingTop: 10, flexDirection: 'row', gap: 12 }}>
             <TouchableOpacity style={styles.backLink} onPress={() => setShowingReportData(false)}>
              <Ionicons name="chevron-back" size={20} color={Colors.accent.gold} />
              <ThemedText style={{ color: Colors.accent.gold, fontWeight: '800' }}>Change Filters</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.listContent}>
          {loading ? (
             <View style={styles.centerLoader}>
                <ActivityIndicator color={Colors.accent.gold} />
                <ThemedText style={styles.loaderText}>SYNCHRONIZING RECORDS</ThemedText>
             </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : (
            <FlatList
              data={showingReportData ? classReportData : results}
              keyExtractor={(item) => `report-${item.enrollment_id}`}
              renderItem={showingReportData ? renderClassReportStudent : renderStudentItem}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', padding: 60 }}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="document-text-outline" size={40} color={C.textMuted} />
                  </View>
                  <ThemedText style={styles.emptyTitle}>
                    {showingReportData ? "No Records Found" : "Initiate Selection"}
                  </ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    {showingReportData 
                      ? "No academic reports found for this class and term." 
                      : (searchQuery ? "No matching student records found." : "Configure parameters above to view records.")}
                  </ThemedText>
                </View>
              }
            />
          )}
        </View>
      </ScrollView>

      {/* Preview Modal */}
      <Modal visible={selectedPreviewStudent !== null} transparent animationType="slide" onRequestClose={() => setSelectedPreviewStudent(null)}>
        <View style={styles.previewOverlay}>
          <View style={[styles.previewContainer, { backgroundColor: C.modalBg }]}>
            <View style={styles.previewHeader}>
              <View>
                <ThemedText style={styles.previewTitle}>Performance Preview</ThemedText>
                <ThemedText style={styles.previewSubtitle}>
                  {selectedPreviewStudent?.name || `${selectedPreviewStudent?.first_name || ''} ${selectedPreviewStudent?.last_name || ''}`.trim()} - Term {selectedPreviewStudent?.displayTerm}
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setSelectedPreviewStudent(null)} style={styles.previewCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.accent.gold} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              {(() => {
                const termToDisplay = selectedPreviewStudent?.displayTerm || '1';
                const subjectList = selectedPreviewStudent?.scores_by_term ? selectedPreviewStudent.scores_by_term[termToDisplay] : selectedPreviewStudent?.subjects;
                if (subjectList?.length > 0) {
                  return subjectList.map((subject: any, idx: number) => {
                    const total = Number(subject.student_total ?? subject.subject_total ?? subject.total_score) || (Number(subject.ca1_score || 0) + Number(subject.ca2_score || 0) + Number(subject.ca3_score || 0) + Number(subject.ca4_score || 0) + Number(subject.exam_score || 0));
                    return (
                      <View key={idx} style={styles.previewSubjectCard}>
                        <ThemedText style={styles.previewSubjectTitle}>{subject.subject_name || subject.subject || 'Subject'}</ThemedText>
                        <View style={styles.previewScoreRow}>
                          <ThemedText style={styles.previewScoreLabel}>Continuous Assessment:</ThemedText>
                          <ThemedText style={styles.previewScoreValue}>{Number(subject.ca1_score || 0) + Number(subject.ca2_score || 0) + Number(subject.ca3_score || 0) + Number(subject.ca4_score || 0)} / 40</ThemedText>
                        </View>
                        <View style={styles.previewScoreRow}>
                          <ThemedText style={styles.previewScoreLabel}>Terminal Examination:</ThemedText>
                          <ThemedText style={styles.previewScoreValue}>{subject.exam_score || 0} / 60</ThemedText>
                        </View>
                        <View style={styles.previewTotalRow}>
                          <ThemedText style={styles.previewTotalLabel}>CUMULATIVE SCORE:</ThemedText>
                          <ThemedText style={styles.previewTotalValue}>{total}%</ThemedText>
                        </View>
                      </View>
                    );
                  });
                }
                return (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Ionicons name="document-text-outline" size={48} color={C.textMuted} />
                    <ThemedText style={{ color: C.textSecondary, marginTop: 16, textAlign: 'center' }}>No detailed scores recorded for this term yet.</ThemedText>
                  </View>
                );
              })()}
            </ScrollView>

            <View style={styles.previewFooter}>
              <View style={styles.footerInfo}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.accent.gold} />
                <ThemedText style={styles.footerInfoText}>Local Data Preview</ThemedText>
              </View>
              <View style={styles.previewActionRow}>
                <TouchableOpacity style={styles.previewCancel} onPress={() => setSelectedPreviewStudent(null)}>
                  <ThemedText style={styles.previewCancelText}>Discard</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.previewRegenerate, regeneratingRemark && styles.previewRegenerateDisabled]} 
                  onPress={() => {
                    Alert.alert(
                      'Regenerate AI Remark',
                      'This will generate a new AI remark for this student. Continue?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Regenerate', onPress: handleRegenerateRemark },
                      ]
                    );
                  }}
                  disabled={regeneratingRemark}
                >
                  {regeneratingRemark ? (
                    <ActivityIndicator size="small" color={Colors.accent.navy} />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={16} color={Colors.accent.navy} />
                      <ThemedText style={styles.previewRegenerateText}>Regenerate AI</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.previewSubmit} onPress={handleProceedToEmail}>
                  <Ionicons name="mail" size={18} color={Colors.accent.navy} />
                  <ThemedText style={styles.previewSubmitText}>Proceed to Email</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Modal */}
      <Modal visible={currentEmailRequest !== null} transparent animationType="fade" onRequestClose={() => setCurrentEmailRequest(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Secure Dispatch</ThemedText>
            <ThemedText style={styles.modalSubtitle}>Enter destination address for official academic credentials</ThemedText>
            <View style={styles.inputWrapper}>
              <Ionicons name="at" size={20} color={C.textMuted} />
              <TextInput style={styles.modalInput} placeholder="recipient@institution.edu" placeholderTextColor={C.textMuted} value={emailInput} onChangeText={setEmailInput} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCurrentEmailRequest(null)}>
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleEmailModalSubmit}>
                <Ionicons name="send" size={18} color={Colors.accent.navy} />
                <ThemedText style={styles.modalSubmitText}>Send to Email</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}><Ionicons name="checkmark-circle" size={64} color="#10B981" /></View>
            <ThemedText style={styles.modalTitle}>Transmission Success</ThemedText>
            <ThemedText style={styles.modalSubtitle}>Official records have been verified and transmitted successfully.</ThemedText>
            <CustomButton title="ACKNOWLEDGE" onPress={() => setShowSuccessModal(false)} variant="premium" />
          </View>
        </View>
      </Modal>

      {statusAlert.visible && (
        <CustomAlert type={statusAlert.type} title={statusAlert.title} message={statusAlert.message} onClose={() => setStatusAlert({ ...statusAlert, visible: false })} onConfirm={statusAlert.onConfirm} style={{ margin: 24 }} />
      )}
    </ThemedView>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
  return StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: C.background },
    hero: { height: IS_TINY ? 200 : 260, width: '100%' },
    heroOverlay: { flex: 1, paddingHorizontal: IS_TINY ? 16 : 24, paddingTop: IS_TINY ? 40 : 60 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: IS_TINY ? 12 : 20 },
    backButton: { width: IS_TINY ? 36 : 44, height: IS_TINY ? 36 : 44, borderRadius: IS_TINY ? 10 : 14, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: C.text, fontSize: IS_TINY ? 14 : 16, fontWeight: '800', letterSpacing: 0.5 },
    heroContent: { marginTop: 'auto', marginBottom: IS_TINY ? 12 : 20 },
    heroSubtitle: { color: Colors.accent.gold, fontSize: IS_TINY ? 9 : 11, fontWeight: '800', letterSpacing: 2, marginBottom: IS_TINY ? 2 : 6 },
    heroTitle: { color: C.text, fontSize: IS_TINY ? 24 : 32, fontWeight: '900', letterSpacing: -1 },

    contentWrapper: { paddingHorizontal: IS_TINY ? 16 : 24, marginTop: IS_TINY ? -20 : -30 },
    glassCard: { backgroundColor: C.card, borderRadius: IS_TINY ? 24 : 32, padding: IS_TINY ? 16 : 24, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 12 },
    modeToggle: { flexDirection: 'row', backgroundColor: C.inputBg, borderRadius: 16, padding: 4, marginBottom: IS_TINY ? 16 : 24 },
    modeBtn: { flex: 1, paddingVertical: IS_TINY ? 8 : 10, alignItems: 'center', borderRadius: 12 },
    activeModeBtn: { backgroundColor: Colors.accent.gold },
    modeBtnText: { color: C.textSecondary, fontSize: IS_TINY ? 11 : 13, fontWeight: '700' },
    activeModeBtnText: { color: Colors.accent.navy, fontWeight: '800' },

    searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 16, paddingHorizontal: 16, height: IS_TINY ? 48 : 52, borderWidth: 1, borderColor: C.inputBorder },
    searchInput: { flex: 1, marginLeft: 12, color: C.inputText, fontSize: IS_TINY ? 12 : 14, fontWeight: '600' },
    
    filtersArea: { gap: IS_TINY ? 12 : 16 },
    filterRow: { flexDirection: IS_TINY ? 'column' : 'row', gap: IS_TINY ? 12 : 16 },
    filterGroup: { flex: 1 },
    filterLabel: { color: C.textLabel, fontSize: IS_TINY ? 8 : 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: IS_TINY ? 6 : 10 },
    inputSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.inputBg, borderRadius: 16, paddingHorizontal: 16, height: IS_TINY ? 48 : 52, borderWidth: 1, borderColor: C.inputBorder },
    selectorText: { color: C.inputText, fontSize: IS_TINY ? 12 : 14, fontWeight: '700' },
    selectorList: { backgroundColor: C.modalBg, borderRadius: 16, marginTop: 8, padding: 8, borderWidth: 1, borderColor: C.cardBorder },
    selectorItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10 },
    selectorItemActive: { backgroundColor: 'rgba(250, 204, 21, 0.1)' },
    selectorItemText: { color: C.textSecondary, fontSize: IS_TINY ? 12 : 13, fontWeight: '600' },
    selectorItemTextActive: { color: Colors.accent.gold, fontWeight: '800' },

    backLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    listContent: { paddingHorizontal: IS_TINY ? 16 : 24, paddingTop: 10, paddingBottom: 100 },
    resultCard: { backgroundColor: C.card, borderRadius: 24, padding: IS_TINY ? 12 : 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: C.cardBorder },
    avatarContainer: { width: IS_TINY ? 44 : 52, height: IS_TINY ? 44 : 52, borderRadius: 16, backgroundColor: C.actionItemBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.accent.gold },
    avatarText: { color: Colors.accent.gold, fontSize: IS_TINY ? 14 : 16, fontWeight: '800' },
    rankBadge: { width: IS_TINY ? 44 : 52, height: IS_TINY ? 44 : 52, borderRadius: 16, backgroundColor: Colors.accent.gold, justifyContent: 'center', alignItems: 'center' },
    rankText: { color: Colors.accent.navy, fontSize: IS_TINY ? 16 : 18, fontWeight: '900' },
    studentInfo: { flex: 1, marginLeft: IS_TINY ? 12 : 16 },
    resultTitle: { fontSize: IS_TINY ? 14 : 16, fontWeight: '800', color: C.text, marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: IS_TINY ? 8 : 12 },
    resultSubtitle: { fontSize: IS_TINY ? 11 : 12, color: C.textSecondary, fontWeight: '600' },
    scoreMeta: { fontSize: IS_TINY ? 10 : 11, color: Colors.accent.gold, fontWeight: '800', marginBottom: 12 },
    termSection: { flexDirection: 'row', gap: 6, marginBottom: 16 },
    miniChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: C.actionItemBg },
    activeMiniChip: { backgroundColor: Colors.accent.gold },
    miniChipText: { fontSize: 9, color: C.textSecondary, fontWeight: '800' },
    activeMiniChipText: { color: Colors.accent.navy },
    cardActions: { gap: IS_TINY ? 8 : 10, flexDirection: IS_TINY ? 'row' : 'column' },
    fullActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: IS_TINY ? 10 : 12, borderRadius: 12, backgroundColor: C.actionItemBg, borderWidth: 1, borderColor: C.cardBorder },
    actionBtnText: { fontSize: IS_TINY ? 10 : 12, fontWeight: '700', color: C.text },

    centerLoader: { padding: 60, alignItems: 'center' },
    loaderText: { color: Colors.accent.gold, marginTop: 12, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
    errorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 16 },
    errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1 },

    emptyIconCircle: { width: IS_TINY ? 60 : 80, height: IS_TINY ? 60 : 80, borderRadius: 40, backgroundColor: C.actionItemBg, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { color: C.text, fontSize: IS_TINY ? 16 : 18, fontWeight: '800', marginBottom: 8 },
    emptySubtitle: { color: C.textSecondary, fontSize: IS_TINY ? 12 : 13, textAlign: 'center', lineHeight: 18 },

    modalOverlay: { flex: 1, backgroundColor: C.modalOverlay, justifyContent: 'center', padding: IS_TINY ? 16 : 24 },
    modalContent: { backgroundColor: C.modalBg, borderRadius: IS_TINY ? 24 : 32, padding: IS_TINY ? 20 : 32, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center' },
    modalTitle: { color: C.text, fontSize: IS_TINY ? 20 : 24, fontWeight: '900', marginBottom: 8 },
    modalSubtitle: { color: C.textSecondary, fontSize: IS_TINY ? 12 : 14, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 16, paddingHorizontal: 16, height: IS_TINY ? 48 : 56, marginBottom: 24, borderWidth: 1, borderColor: C.inputBorder, width: '100%' },
    modalInput: { flex: 1, marginLeft: 12, color: C.inputText, fontSize: IS_TINY ? 14 : 16, fontWeight: '600' },
    modalActions: { flexDirection: IS_TINY ? 'column-reverse' : 'row', gap: 12, width: '100%' },
    modalCancel: { height: IS_TINY ? 48 : 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: C.actionItemBg, flex: IS_TINY ? 0 : 1 },
    modalCancelText: { color: C.text, fontSize: 14, fontWeight: '700' },
    modalSubmit: { height: IS_TINY ? 48 : 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: Colors.accent.gold, flex: IS_TINY ? 0 : 2 },
    modalSubmitText: { color: Colors.accent.navy, fontSize: 14, fontWeight: '900' },
    successIcon: { marginBottom: 20 },

    previewOverlay: { flex: 1, backgroundColor: C.modalOverlay, justifyContent: 'flex-end' },
    previewContainer: { height: '90%', width: '100%', borderTopLeftRadius: IS_TINY ? 24 : 32, borderTopRightRadius: IS_TINY ? 24 : 32, overflow: 'hidden' },
    previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: IS_TINY ? 16 : 24, borderBottomWidth: 1, borderBottomColor: C.divider },
    previewTitle: { color: C.text, fontSize: IS_TINY ? 18 : 20, fontWeight: '900' },
    previewSubtitle: { color: Colors.accent.gold, fontSize: IS_TINY ? 11 : 12, fontWeight: '700', marginTop: 4 },
    previewCloseBtn: { width: IS_TINY ? 36 : 44, height: IS_TINY ? 36 : 44, borderRadius: IS_TINY ? 10 : 14, backgroundColor: C.actionItemBg, justifyContent: 'center', alignItems: 'center' },
    previewSubjectCard: { marginBottom: 12, padding: IS_TINY ? 12 : 16, backgroundColor: C.actionItemBg, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder },
    previewSubjectTitle: { color: Colors.accent.gold, fontWeight: '800', marginBottom: 12, fontSize: IS_TINY ? 14 : 16 },
    previewScoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    previewScoreLabel: { color: C.textSecondary, fontSize: IS_TINY ? 11 : 13 },
    previewScoreValue: { color: C.text, fontWeight: '700', fontSize: IS_TINY ? 11 : 13 },
    previewTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: C.divider },
    previewTotalLabel: { color: C.text, fontWeight: '900', fontSize: IS_TINY ? 12 : 13 },
    previewTotalValue: { color: Colors.accent.gold, fontWeight: '900', fontSize: IS_TINY ? 16 : 18 },
    previewFooter: { padding: IS_TINY ? 16 : 24, borderTopWidth: 1, borderTopColor: C.divider },
    footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: IS_TINY ? 12 : 20 },
    footerInfoText: { color: C.textLabel, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    previewActionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
    previewCancel: { paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: C.divider },
    previewCancelText: { color: C.text, fontSize: 12, fontWeight: '700' },
    previewRegenerate: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: Colors.accent.gold, borderWidth: 1, borderColor: Colors.accent.gold },
    previewRegenerateDisabled: { opacity: 0.6 },
    previewRegenerateText: { color: Colors.accent.navy, fontSize: 12, fontWeight: '800' },
    previewSubmit: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: Colors.accent.gold },
    previewSubmitText: { color: Colors.accent.navy, fontSize: 12, fontWeight: '900' },
  });
}