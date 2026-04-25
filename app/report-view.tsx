import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  FlatList,
  Modal,
  TextInput,
  ImageBackground,
  Dimensions,
  StyleSheet,
} from 'react-native';

const { width } = Dimensions.get('window');
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { Colors } from '@/constants/design-system';
import { API_BASE_URL } from '@/utils/api-service';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppColors } from '@/hooks/use-app-colors';

const getToken = async () => {
  if (Platform.OS !== 'web') return await SecureStore.getItemAsync('userToken');
  return localStorage.getItem('userToken');
};

interface ScoreData {
  subject_name: string;
  ca1_score: number;
  ca2_score: number;
  ca3_score: number;
  ca4_score: number;
  exam_score: number;
  student_total: number;
  class_average?: number;
}

interface ClassStudent {
  enrollment_id: number;
  name: string;
  subjects: Array<{
    subject: string;
    ca1_score: number;
    ca2_score: number;
    ca3_score: number;
    ca4_score: number;
    exam_score: number;
    subject_total: number;
    subject_class_average: number;
  }>;
  grand_total: number;
}

interface ClassOption {
  id: number;
  display_name: string;
}

interface AcademicSession {
  id: number;
  session_name: string;
}

export default function ReportViewScreen() {
  const router = useRouter();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);
  const { id: initialId, mode: initialMode, name: initialName, term: initialTerm, session: initialSession } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [studentData, setStudentData] = useState<ScoreData[]>([]);
  const [classData, setClassData] = useState<ClassStudent[]>([]);
  const [selectedTerm, setSelectedTerm] = useState((initialTerm as string) || '1');
  const [selectedSession, setSelectedSession] = useState((initialSession as string) || '1');
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [mode, setMode] = useState<'student' | 'class'>(initialMode as 'student' | 'class' || 'student');
  const [reportId, setReportId] = useState<string | null>(initialId as string || null);
  const [reportName, setReportName] = useState<string>(initialName as string || '');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [downloadError, setDownloadError] = useState('');
  const [downloadingStudentId, setDownloadingStudentId] = useState<number | null>(null);
  const [studentDownloadError, setStudentDownloadError] = useState<{ [key: number]: string }>({});

  // Email modal state
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [currentEmailRequest, setCurrentEmailRequest] = useState<{
    enrollmentId: number;
    studentName: string;
  } | null>(null);

  // Premium design system state
  const [activePortalModal, setActivePortalModal] = useState<'class' | 'session' | 'email' | null>(null);
  const [statusAlert, setStatusAlert] = useState<{ visible: boolean; type: 'success' | 'error'; title: string; message: string }>({
    visible: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Fetch data based on mode
  useEffect(() => {
    if (reportId && mode === 'student') {
      fetchReportData();
    } else if (mode === 'class') {
      // Always require manual class selection, don't auto-select
      setLoading(false);
    }
  }, [reportId, mode, selectedTerm, selectedSession]);

  // Fetch academic sessions and classes on mount
  useEffect(() => {
    fetchSessions();
    fetchClasses(); // Always fetch classes regardless of mode
  }, []);

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
      console.error('Error fetching sessions:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = await getToken();
      console.log('📥 Fetching classes from /api/reports/list/classes');
      const response = await fetch(`${API_BASE_URL}/api/reports/list/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Classes API failed with status ${response.status}:`, errorText);
        setError(`Failed to load classes: ${response.status}`);
        return;
      }
      
      const json = await response.json();
      console.log('📊 Classes API Response:', json);
      if (json.success && json.data) {
        console.log(`✓ Loaded ${json.data.length} classes:`, json.data);
        setClasses(json.data);
      } else {
        console.warn('⚠️ Unexpected response format:', json);
        setError(json.error || 'Failed to load classes');
      }
    } catch (err) {
      console.error('❌ Error fetching classes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch classes');
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      
      const currentId = mode === 'class' ? selectedClass?.id : reportId;
      
      if (!currentId) {
        if (mode === 'class') {
          setError('Please select a class');
        } else {
          setError('Missing report ID');
        }
        setLoading(false);
        return;
      }

      const endpoint = mode === 'student'
        ? `/api/reports/data/student/${currentId}?term=${selectedTerm}&sessionId=${selectedSession}`
        : `/api/reports/data/class/${currentId}?term=${selectedTerm}&sessionId=${selectedSession}`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();

      if (json.success) {
        if (mode === 'student') {
          setStudentData(json.data);
        } else {
          setClassData(json.data);
        }
      } else {
        setError(json.error || 'Failed to load report data');
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const emailStudentPDF = async (enrollmentId: number, studentName: string) => {
    setDownloadingStudentId(enrollmentId);
    setStudentDownloadError(prev => ({ ...prev, [enrollmentId]: '' }));

    try {
      const token = await getToken();

      // Android/Web/iOS: Use premium portal modal
      setCurrentEmailRequest({ enrollmentId, studentName });
      setEmailInput('');
      setActivePortalModal('email');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Email setup failed';
      console.error(`Error setting up email for ${studentName}:`, err);
      setStudentDownloadError(prev => ({ ...prev, [enrollmentId]: errorMsg }));
    } finally {
      setDownloadingStudentId(null);
    }
  };

  // Helper function to send email report
  const sendEmailReport = async (enrollmentId: number, term: string, sessionId: string, email: string, token: string) => {
    const emailUrl = `${API_BASE_URL}/api/reports/email/official-report/${enrollmentId}`;
    const response = await fetch(emailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        term: parseInt(term),
        sessionId: parseInt(sessionId),
        email: email
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
  };

  // Handle email modal submission
  const handleEmailModalSubmit = async () => {
    if (!currentEmailRequest || !emailInput.trim()) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Input Missing',
        message: 'Please provide a destination email address.'
      });
      return;
    }

    if (!emailInput.includes('@')) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a valid school email address.'
      });
      return;
    }

    setActivePortalModal(null);

    const token = await getToken();
    if (!token) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Session Expired',
        message: 'Please login again to verify your credentials.'
      });
      return;
    }

    setDownloadingStudentId(currentEmailRequest.enrollmentId);

    try {
      if (currentEmailRequest.enrollmentId === 0) {
        await sendBulkEmailReports(emailInput.trim());
      } else {
        await sendEmailReport(
          currentEmailRequest.enrollmentId,
          selectedTerm,
          selectedSession,
          emailInput.trim(),
          token
        );
        setStatusAlert({
          visible: true,
          type: 'success',
          title: 'Report Emailed',
          message: `The report card for ${currentEmailRequest.studentName} has been sent successfully.`
        });
        setStudentDownloadError(prev => ({ ...prev, [currentEmailRequest.enrollmentId]: '✓ Emailed' }));
      }
    } catch (emailError) {
      console.error('Email error:', emailError);
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Delivery Failed',
        message: 'Unable to send the email at this time. Please check the address and try again.'
      });
      setStudentDownloadError(prev => ({ ...prev, [currentEmailRequest.enrollmentId]: 'Email failed' }));
    } finally {
      setDownloadingStudentId(null);
      setCurrentEmailRequest(null);
    }
  };

  const emailAllPDFs = async () => {
    if (classData.length === 0) {
      setDownloadError('No students in this class');
      return;
    }

    setCurrentEmailRequest({ enrollmentId: 0, studentName: `All Students (${classData.length})` });
    setEmailInput('');
    setActivePortalModal('email');
  };

  const sendBulkEmailReports = async (email: string) => {
    setDownloadingAll(true);
    setDownloadError('');
    setDownloadProgress({ current: 0, total: classData.length });

    try {
      const token = await getToken();
      if (!token) throw new Error('Authorization required');
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < classData.length; i++) {
        const student = classData[i];
        try {
          await sendEmailReport(student.enrollment_id, selectedTerm, selectedSession, email, token);
          successCount++;
        } catch (err) {
          console.error(`Error emailing PDF for ${student.name}:`, err);
          failedCount++;
        }
        setDownloadProgress({ current: i + 1, total: classData.length });
      }

      if (failedCount === 0) {
        setStatusAlert({
          visible: true,
          type: 'success',
          title: 'Bulk Email Complete',
          message: `All ${successCount} report cards have been successfully dispatched.`
        });
      } else {
        setStatusAlert({
          visible: true,
          type: 'error',
          title: 'Partial Success',
          message: `Dispatched ${successCount} reports, but ${failedCount} deliveries failed.`
        });
      }
    } catch (err) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Bulk Process Failed',
        message: err instanceof Error ? err.message : 'An error occurred during bulk processing.'
      });
    } finally {
      setDownloadingAll(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  const getPerformanceColor = (student: number, classAvg: number): string => {
    if (student >= classAvg * 1.1) return '#4CAF50'; // 10% above average - Green
    if (student >= classAvg) return '#2196F3'; // Above average - Blue
    if (student >= classAvg * 0.9) return '#FF9800'; // Within 10% below - Orange
    return '#F44336'; // Below average - Red
  };


  const renderStudentReport = () => {
    if (studentData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.1)" />
          <ThemedText style={styles.emptyTitle}>No Records Found</ThemedText>
          <ThemedText style={styles.emptySubtitle}>No academic performance data is available for this student in the selected term.</ThemedText>
        </View>
      );
    }

    return (
      <View>
        {studentData.map((subject, index) => (
          <View key={index} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <ThemedText style={styles.subjectTitle}>{subject.subject_name}</ThemedText>
              <View style={styles.scoreBadge}>
                <ThemedText style={styles.scoreBadgeText}>{subject.student_total}</ThemedText>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>CA1</ThemedText>
                <ThemedText style={styles.statValue}>{subject.ca1_score || 0}</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>CA2</ThemedText>
                <ThemedText style={styles.statValue}>{subject.ca2_score || 0}</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>CA3</ThemedText>
                <ThemedText style={styles.statValue}>{subject.ca3_score || 0}</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>CA4</ThemedText>
                <ThemedText style={styles.statValue}>{subject.ca4_score || 0}</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>EXAM</ThemedText>
                <ThemedText style={styles.statValue}>{subject.exam_score || 0}</ThemedText>
              </View>
            </View>

            {subject.class_average !== undefined && (
              <View style={styles.comparisonContainer}>
                <View style={styles.comparisonRow}>
                  <ThemedText style={styles.comparisonLabel}>Student Total Score</ThemedText>
                  <ThemedText style={styles.comparisonValue}>{Math.round(Number(subject.student_total))}</ThemedText>
                </View>
                <View style={styles.comparisonRow}>
                  <ThemedText style={styles.comparisonLabel}>Class Average</ThemedText>
                  <ThemedText style={styles.comparisonValue}>{Math.round(Number(subject.class_average))}</ThemedText>
                </View>
                <View style={styles.comparisonRow}>
                  <ThemedText style={styles.comparisonLabel}>Performance Margin</ThemedText>
                  <ThemedText style={[styles.comparisonValue, { color: Number(subject.student_total) >= Number(subject.class_average) ? '#22C55E' : '#EF4444' }]}>
                    {Math.round(Number(subject.student_total) - Number(subject.class_average))}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderClassReport = () => {
    if (classData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="rgba(255,255,255,0.1)" />
          <ThemedText style={styles.emptyTitle}>Class List Empty</ThemedText>
          <ThemedText style={styles.emptySubtitle}>No records found for the selected class and session.</ThemedText>
        </View>
      );
    }

    return (
      <View>
        {classData.map((student, studentIndex) => (
          <View key={studentIndex} style={styles.studentCard}>
            <View style={styles.studentHeader}>
              <View style={[styles.rankBadge, { backgroundColor: Colors.accent.gold, borderColor: 'rgba(255,255,255,0.1)' }]}>
                <Ionicons name="person" size={14} color="#1E293B" />
              </View>
              <View style={styles.nameStack}>
                <ThemedText style={styles.studentName}>{student.name}</ThemedText>
                <ThemedText style={styles.totalPoints}>TOTAL: {student.grand_total} POINTS</ThemedText>
              </View>
            </View>

            <View style={styles.subjectsContainer}>
              {student.subjects.map((subject, subjectIndex) => (
                <View key={subjectIndex} style={styles.subjectRow}>
                  <View style={styles.subjectInfo}>
                    <ThemedText style={styles.subjectNameSmall}>{subject.subject}</ThemedText>
                    <ThemedText style={styles.scoreBreakdown}>CA: {subject.ca1_score + subject.ca2_score + subject.ca3_score + subject.ca4_score} • EXAM: {subject.exam_score}</ThemedText>
                  </View>
                  <View style={styles.subjectScoreContainer}>
                    <View style={[styles.subjectScoreBadge, { backgroundColor: getPerformanceColor(subject.subject_total, Number(subject.subject_class_average) || 0) + '20' }]}>
                      <ThemedText style={[styles.subjectScoreText, { color: getPerformanceColor(subject.subject_total, Number(subject.subject_class_average) || 0) }]}>
                        {Math.round(subject.subject_total)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.subjectAverage}>AVG: {Math.round(Number(subject.subject_class_average || 0))}</ThemedText>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.individualDownloadButton}
              onPress={() => emailStudentPDF(student.enrollment_id, student.name)}
              disabled={downloadingStudentId === student.enrollment_id}
            >
              {downloadingStudentId === student.enrollment_id ? (
                <ActivityIndicator size="small" color={Colors.accent.gold} />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.individualDownloadButtonText}>Email Report</ThemedText>
                </>
              )}
            </TouchableOpacity>

            {studentDownloadError[student.enrollment_id] && (
              <ThemedText style={[styles.studentDownloadStatus, { color: studentDownloadError[student.enrollment_id].includes('✓') ? '#22C55E' : '#EF4444' }]}>
                {studentDownloadError[student.enrollment_id]}
              </ThemedText>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderPortalModal = () => {
    let data: any[] = [];
    let title = '';
    let currentId: any = null;
    let onSelect = (item: any) => {};

    if (activePortalModal === 'class') {
      data = classes;
      title = 'Select Class';
      currentId = selectedClass?.id;
      onSelect = (item) => setSelectedClass(item);
    } else if (activePortalModal === 'session') {
      data = sessions.map(s => ({ id: s.id, name: s.session_name }));
      title = 'Academic Year';
      currentId = Number(selectedSession);
      onSelect = (item) => setSelectedSession(String(item.id));
    }

    if (activePortalModal === 'email') {
      return (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Email Report Card</ThemedText>
              <ThemedText style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24, textAlign: 'center' }}>
                Enter the recipient email address for {currentEmailRequest?.studentName}'s official report.
              </ThemedText>
              
              <TextInput
                style={styles.emailInput}
                placeholder="recipient@example.com"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <CustomButton 
                  title="Cancel" 
                  onPress={() => setActivePortalModal(null)} 
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} 
                />
                <CustomButton 
                  title="Send Now" 
                  variant="premium"
                  onPress={handleEmailModalSubmit} 
                  style={{ flex: 1 }} 
                />
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    return (
      <Modal
        visible={activePortalModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActivePortalModal(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActivePortalModal(null)}
        >
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>{title}</ThemedText>
            <FlatList
              data={data}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, currentId === item.id && styles.dropdownItemSelected]}
                  onPress={() => {
                    onSelect(item);
                    setActivePortalModal(null);
                  }}
                >
                  <ThemedText style={[styles.dropdownItemText, currentId === item.id && styles.dropdownItemTextSelected]}>
                    {item.display_name || item.name}
                  </ThemedText>
                  {currentId === item.id && <Ionicons name="checkmark-circle" size={20} color={Colors.accent.gold} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <ThemedView style={styles.mainWrapper}>
      <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
        {/* Premium Hero Header */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070' }}
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
                <TouchableOpacity 
                  style={styles.actionIcon}
                  onPress={() => {
                    setReportId(null);
                    setSelectedClass(null);
                    setStudentData([]);
                    setClassData([]);
                    setError('');
                  }}
                >
                  <Ionicons name="refresh" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroContent}>
              <ThemedText style={styles.heroSubtitle}>ACADEMIC INSIGHTS</ThemedText>
              <ThemedText style={styles.heroTitle}>
                {mode === 'student' ? 'Progress Report' : 'Class Analytics'}
              </ThemedText>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Dynamic Filters Section */}
        <View style={styles.contentWrapper}>
          <View style={styles.glassCard}>
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <ThemedText style={styles.label}>Academic Term</ThemedText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['1', '2'].map((term) => (
                    <TouchableOpacity
                      key={term}
                      style={[styles.termOption, selectedTerm === term && styles.termOptionSelected]}
                      onPress={() => setSelectedTerm(term)}
                    >
                      <ThemedText style={[styles.termText, selectedTerm === term && styles.termTextSelected]}>
                        T{term}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.filterItem}>
                <ThemedText style={styles.label}>Academic Year</ThemedText>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setActivePortalModal('session')}
                >
                  <ThemedText style={styles.pickerText}>
                    {sessions.find((s: any) => String(s.id) === selectedSession)?.session_name || 'Select'}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={16} color={Colors.accent.gold} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <ThemedText style={styles.label}>Target Class</ThemedText>
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setActivePortalModal('class')}
              >
                <ThemedText style={selectedClass ? styles.pickerText : styles.placeholderText}>
                  {selectedClass ? selectedClass.display_name : 'Choose a class...'}
                </ThemedText>
                <Ionicons name="chevron-down" size={20} color={Colors.accent.gold} />
              </TouchableOpacity>
            </View>

            {!reportId && (
              <CustomButton
                title={loading ? "Analyzing Data..." : "Generate Insights"}
                onPress={fetchReportData}
                loading={loading}
                disabled={!selectedClass}
                variant="premium"
                icon={<Ionicons name="analytics-outline" size={20} color={Colors.accent.navy} style={{ marginRight: 8 }} />}
              />
            )}
          </View>

          {/* Bulk Actions */}
          {mode === 'class' && reportId && !loading && classData.length > 0 && (
            <CustomButton
              title={downloadingAll ? `Emailing (${downloadProgress.current}/${downloadProgress.total})` : `Email All Reports (${classData.length})`}
              onPress={emailAllPDFs}
              loading={downloadingAll}
              variant="premium"
              style={styles.downloadAllButton}
              icon={<Ionicons name="mail-unread-outline" size={24} color={Colors.accent.navy} style={{ marginRight: 12 }} />}
            />
          )}

          {/* Main Content Area */}
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={Colors.accent.gold} />
              <ThemedText style={{ marginTop: 24, color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>PREPARING REPORT DATA...</ThemedText>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <ThemedText style={styles.emptyTitle}>Analysis Interrupted</ThemedText>
              <ThemedText style={styles.emptySubtitle}>{error}</ThemedText>
              <CustomButton title="Retry Analysis" onPress={fetchReportData} style={{ marginTop: 20 }} />
            </View>
          ) : (
            <View>
              {mode === 'student' ? renderStudentReport() : renderClassReport()}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Auxiliary Components */}
      {renderPortalModal()}
      
      {statusAlert.visible && (
        <CustomAlert
          type={statusAlert.type}
          title={statusAlert.title}
          message={statusAlert.message}
          onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
          style={styles.alert}
        />
      )}
    </ThemedView>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
  return StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: C.background },
    hero: { height: 280, width: '100%' },
    heroOverlay: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
    headerActions: { flexDirection: 'row', gap: 12 },
    actionIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
    heroContent: { marginTop: 'auto', marginBottom: 20 },
    heroSubtitle: { color: Colors.accent.gold, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
    heroTitle: { color: C.isDark ? '#FFFFFF' : '#0F172A', fontSize: 32, fontWeight: '900', letterSpacing: -1 },

    contentWrapper: { paddingHorizontal: 24, marginTop: -30 },
    glassCard: { backgroundColor: C.card, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 24 },
    label: { color: C.textLabel, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
    
    filterRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    filterItem: { flex: 1 },
    termOption: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder, flex: 1, alignItems: 'center' },
    termOptionSelected: { backgroundColor: Colors.accent.gold, borderColor: Colors.accent.gold },
    termText: { color: C.inputText, fontSize: 12, fontWeight: '700' },
    termTextSelected: { color: Colors.accent.navy },

    pickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.inputBg, borderRadius: 16, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: C.inputBorder },
    pickerText: { color: C.inputText, fontSize: 14, fontWeight: '700' },
    placeholderText: { color: C.textMuted, fontSize: 14, fontWeight: '600' },
    
    downloadAllButton: { marginBottom: 24, paddingVertical: 16 },
    loaderContainer: { padding: 60, alignItems: 'center' },
    
    // Student View Styles
    subjectCard: { backgroundColor: C.card, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.cardBorder },
    subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    subjectTitle: { fontSize: 18, fontWeight: '800', color: C.text },
    scoreBadge: { backgroundColor: C.isDark ? 'rgba(255, 255, 255, 0.1)' : '#FEF9C3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: Colors.accent.gold },
    scoreBadgeText: { color: Colors.accent.gold, fontWeight: '900', fontSize: 16 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    statItem: { width: (width - 108) / 5, alignItems: 'center', backgroundColor: C.isDark ? 'rgba(255,255,255,0.02)' : '#F1F5F9', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder },
    statLabel: { fontSize: 9, fontWeight: '800', color: C.textSecondary, marginBottom: 4 },
    statValue: { fontSize: 13, fontWeight: '800', color: C.text },
    comparisonContainer: { paddingTop: 16, borderTopWidth: 1, borderTopColor: C.divider, gap: 8 },
    comparisonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    comparisonLabel: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
    comparisonValue: { fontSize: 12, fontWeight: '800', color: Colors.accent.gold },

    // Class View Styles
    studentCard: { backgroundColor: C.card, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.cardBorder },
    studentHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    rankBadge: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    rankText: { fontSize: 18, fontWeight: '900' },
    nameStack: { flex: 1, gap: 2 },
    studentName: { fontSize: 16, fontWeight: '800', color: C.text },
    totalPoints: { fontSize: 11, color: Colors.accent.gold, fontWeight: '900', letterSpacing: 0.5 },
    subjectsContainer: { gap: 10, marginBottom: 20 },
    subjectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', padding: 12, borderRadius: 16 },
    subjectInfo: { flex: 1, gap: 2 },
    subjectNameSmall: { fontSize: 14, fontWeight: '700', color: C.text },
    scoreBreakdown: { fontSize: 11, color: C.textSecondary, fontWeight: '600' },
    subjectScoreContainer: { alignItems: 'flex-end', gap: 4 },
    subjectScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    subjectScoreText: { fontSize: 14, fontWeight: '900' },
    subjectAverage: { fontSize: 10, color: C.textSecondary, fontWeight: '800' },
    individualDownloadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, backgroundColor: C.actionItemBg, borderWidth: 1, borderColor: C.cardBorder },
    individualDownloadButtonText: { color: C.text, fontSize: 13, fontWeight: '700' },
    studentDownloadStatus: { fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 8 },

    emptyState: { padding: 60, alignItems: 'center' },
    emptyTitle: { color: C.text, fontSize: 20, fontWeight: '900', marginTop: 24, marginBottom: 8 },
    emptySubtitle: { color: C.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: C.modalOverlay, justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: C.modalBg, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: C.cardBorder },
    modalTitle: { color: C.text, fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
    dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.divider },
    dropdownItemSelected: { backgroundColor: 'rgba(250, 204, 21, 0.05)' },
    dropdownItemText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
    dropdownItemTextSelected: { color: Colors.accent.gold, fontWeight: '800' },
    emailInput: { backgroundColor: C.inputBg, borderRadius: 16, padding: 16, color: C.inputText, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: C.inputBorder },
    
    alert: { marginTop: 20 },
  });
}

