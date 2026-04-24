import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text,
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
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const getToken = async () => {
  if (Platform.OS !== 'web') return await SecureStore.getItemAsync('userToken');
  return localStorage.getItem('userToken');
};



export default function ReportSearchScreen() {
  const [mode, setMode] = useState<'student' | 'class'>('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedStudentTerms, setSelectedStudentTerms] = useState<{ [key: number]: string }>({});

  // Class mode filters
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedSession, setSelectedSession] = useState('1');
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classReportData, setClassReportData] = useState<any[]>([]);
  const [showingReportData, setShowingReportData] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [androidDirectoryUri, setAndroidDirectoryUri] = useState<string | null>(null);
  
  // Track successful emails for visual feedback
  const [sentSuccessIds, setSentSuccessIds] = useState<Record<string, boolean>>({});

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

  // PDF Preview State
  const [pdfPreviewVisible, setPdfPreviewVisible] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [pendingEmailData, setPendingEmailData] = useState<{
    enrollmentId: number;
    studentName: string;
    term: number;
    sessionId: number;
  } | null>(null);

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
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

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

      // Determine endpoint based on mode
      const endpoint = mode === 'student'
        ? `/api/reports/search/students?name=${encodeURIComponent(query)}`
        : `/api/classes`;

      console.log('🔍 Current Mode:', mode);
      console.log('🔗 Calling Endpoint:', endpoint);
      console.log('📝 Query:', query);

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
        console.log('✅ Search Successful!');
        console.log('📋 Full API Response:', json);
        console.log('📊 API Response Data:', json.data);
        console.log('🎓 Student Count:', json.count);

        // Log details for each student including scores by term
        if (json.data && json.data.length > 0) {
          json.data.forEach((student: any, idx: number) => {
            console.log(`\n📌 Student ${idx + 1}:`, {
              name: `${student.first_name} ${student.last_name}`,
              enrollment_id: student.enrollment_id,
              class_name: student.class_name,
              session_id: student.session_id
            });
            if (student.scores_by_term) {
              console.log(`   📚 Scores by Term:`, student.scores_by_term);
              Object.keys(student.scores_by_term).forEach(term => {
                console.log(`      Term ${term}: ${student.scores_by_term[term].length} subject(s)`);
              });
            }
          });
        }

        console.log('Sample item:', json.data[0]);
        console.log('Mode is:', mode);
        // Normalize numeric fields in the response
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
      console.error('Fetch Error:', fetchError);
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Connection error. Check your network.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  // 2. Debounced search for students only — class mode requires explicit user action
  useEffect(() => {
    if (mode === 'student') {
      const delayDebounce = setTimeout(() => {
        if (searchQuery.length > 1) {
          handleFetch(searchQuery);
        } else {
          setResults([]);
          setError('');
        }
      }, 500);
      return () => clearTimeout(delayDebounce);
    }
    // class mode: do nothing on mount — wait for user to select filters and press Load
  }, [searchQuery, mode, handleFetch]);

  const handleModeSwitch = (newMode: 'student' | 'class') => {
    setMode(newMode);
    setSearchQuery('');
    setResults([]);
    setError('');
    setShowingReportData(false);
    setClassReportData([]);
    setSelectedClass(null);
    if (newMode === 'class') {
      fetchClasses();
      fetchSessions();
    }
  };

  // Fetch classes list
  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await response.json();
      if (json.success && json.data) {
        setClasses(json.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  // Fetch academic sessions
  const fetchSessions = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

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
  }, []);

  // Fetch class report data
  const fetchClassReportData = useCallback(async () => {
    if (!selectedClass) {
      setError('Please select a class');
      return;
    }

    setLoading(true);
    setError('');
    setShowingReportData(true);

    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const endpoint = `/api/reports/data/class/${selectedClass}?term=${selectedTerm}&sessionId=${selectedSession}`;
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      console.log('📊 Class Report Data Response:', json);
      
      const reportList = Array.isArray(json.data) ? json.data : (json.data?.students || []);
      
      if (json.success) {
        const normalizedReports = reportList.map((item: any) => ({
          ...item,
          total_score: item.total_score || item.student_total || item.total || 'N/A',
          enrollment_id: item.enrollment_id || item.id || item.enrollmentId,
          name: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown Student'
        }));
        
        setClassReportData(normalizedReports);
        if (normalizedReports.length === 0) {
          setError('No report data records found for this selected academic window.');
        }
      } else {
        setError(json.error || 'Failed to fetch class reports');
      }
    } catch (err) {
      console.error('Error fetching class reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedTerm, selectedSession]);

  // Fetch sessions on mount so they're ready when user switches to class mode
  useEffect(() => {
    fetchSessions();
    fetchClasses();
  }, []);

  // Email all class reports
  const emailAllClassReports = useCallback(async () => {
    if (classReportData.length === 0) {
      setError('No students to email');
      return;
    }

    // Prompt for email address once for all reports
            setCurrentEmailRequest({ enrollmentId: 0, studentName: 'Batch Delivery (All Students)', term: parseInt(selectedTerm), sessionId: parseInt(selectedSession) });
            setEmailInput('');
            // Reuse the email modal
  }, [classReportData, selectedTerm, selectedSession, selectedStudentTerms]);

  // 3. Preview and then Email Official Report
  const handleInitiateDispatch = useCallback(async (enrollmentId: number, studentName: string, term: number = 1, sessionId: number = 1) => {
    try {
      setLoadingPreview(true);
      const token = await getToken();

      // Fetch PDF preview first
      const previewUrl = `${API_BASE_URL}/api/reports/preview/official-report/${enrollmentId}?term=${term}&sessionId=${sessionId}`;
      const response = await fetch(previewUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success && result.pdfBase64) {
        setPdfBase64(result.pdfBase64);
        setPendingEmailData({ enrollmentId, studentName, term, sessionId });
        setPdfPreviewVisible(true);
      } else {
        throw new Error(result.error || 'Failed to generate preview');
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Preview Failed',
        message: error instanceof Error ? error.message : 'Failed to generate PDF preview'
      });
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  // Handle email after preview confirmation
  const handleProceedToEmail = useCallback(() => {
    if (pendingEmailData) {
      setCurrentEmailRequest(pendingEmailData);
      setEmailInput('');
      setPdfPreviewVisible(false);
      // We keep the base64 if we want to show it in the email modal too, 
      // but usually we can clear it or wait until close.
    }
  }, [pendingEmailData]);


  // Helper function to send email report
  const sendEmailReport = useCallback(async (enrollmentId: number, term: number, sessionId: number, email: string, token: string, studentName: string) => {
    try {
      const emailUrl = `${API_BASE_URL}/api/reports/email/official-report/${enrollmentId}`;
      const response = await fetch(emailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          term: term,
          sessionId: sessionId,
          email: email
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (enrollmentId !== 0) {
          setShowSuccessModal(true);
          setSentSuccessIds(prev => ({ ...prev, [enrollmentId]: true }));
          setTimeout(() => {
            setSentSuccessIds(prev => ({ ...prev, [enrollmentId]: false }));
          }, 5000);
        } else {
          setStatusAlert({
            visible: true,
            type: 'success',
            title: 'Batch Process Initiated',
            message: `Bulk dispatch complete. All ${classReportData.length} records have been queued for secure transmission.`
          });
        }
      } else {
        throw new Error(result.error || 'Failed to transmit report');
      }
    } catch (err) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Dispatch Error',
        message: err instanceof Error ? err.message : 'Transmission protocol failed'
      });
    }
  }, [classReportData.length]);

  // Admin: Regenerate AI remark in real-time
  const handleRegenerateRemark = useCallback((enrollmentId: number, studentName: string, term: number, sessionId: number) => {
    setStatusAlert({
      visible: true,
      type: 'warning',
      title: 'Regenerate Analysis',
      message: `Are you sure you want to refresh the AI analysis for ${studentName}? This will overwrite the existing remark.`,
      onConfirm: async () => {
        try {
          setStatusAlert({ visible: false, type: 'info', title: '', message: '' });
          setRegeneratingId(`${enrollmentId}`);
          const token = await getToken();
          if (!token) return;

          const response = await fetch(`${API_BASE_URL}/api/reports/regenerate-remark/${enrollmentId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ term, sessionId }),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            setStatusAlert({
              visible: true,
              type: 'success',
              title: 'AI Remark Synchronized',
              message: `The analysis for ${studentName} has been successfully updated.`
            });
          } else {
            throw new Error(result.error || 'Failed to refresh analysis');
          }
        } catch (err: any) {
          setStatusAlert({
            visible: true,
            type: 'error',
            title: 'Synchronization Failed',
            message: err.message || 'Unable to communicate with AI core.'
          });
        } finally {
          setRegeneratingId(null);
        }
      }
    });
  }, []);

  const executeBulkEmail = useCallback(async (email: string, token: string) => {
    setDownloadingAll(true);
    setDownloadProgress({ current: 0, total: classReportData.length });
    setError('');
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < classReportData.length; i++) {
        const student = classReportData[i];
        setDownloadProgress({ current: i + 1, total: classReportData.length });

        try {
            const studentTerm = selectedStudentTerms[student.enrollment_id] || selectedTerm;
            const emailUrl = `${API_BASE_URL}/api/reports/email/official-report/${student.enrollment_id}`;
            const response = await fetch(emailUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    term: parseInt(studentTerm),
                    sessionId: parseInt(selectedSession),
                    email: email.trim()
                }),
            });

            const result = await response.json();
            if (response.ok && result.success) successCount++;
            else failedCount++;
        } catch (error) {
            failedCount++;
        }
    }

    setDownloadingAll(false);
    setDownloadProgress({ current: 0, total: 0 });

    setStatusAlert({
        visible: true,
        type: failedCount === 0 ? 'success' : 'warning',
        title: 'Batch Process Complete',
        message: `Successfully dispatched ${successCount} reports. ${failedCount > 0 ? failedCount + ' deliveries failed.' : ''}`
    });
  }, [classReportData, selectedTerm, selectedSession, selectedStudentTerms]);

  // Handle email modal submission
  const handleEmailModalSubmit = useCallback(async () => {
    if (!currentEmailRequest || !emailInput.trim()) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Input Missing',
        message: 'Please enter a valid email address to proceed.'
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

    const token = await getToken();
    if (!token) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Authentication Error',
        message: 'Your session has expired. Please log in again.'
      });
      return;
    }

    setDownloadingId(`${currentEmailRequest.enrollmentId}`);

    try {
      if (currentEmailRequest.enrollmentId === 0) {
        await executeBulkEmail(emailInput.trim(), token);
      } else {
        await sendEmailReport(
          currentEmailRequest.enrollmentId,
          currentEmailRequest.term,
          currentEmailRequest.sessionId,
          emailInput.trim(),
          token,
          currentEmailRequest.studentName
        );
      }
    } finally {
      setDownloadingId(null);
      setCurrentEmailRequest(null);
    }
  }, [currentEmailRequest, emailInput, sendEmailReport, executeBulkEmail]);

  const renderStudentItem = ({ item }: { item: any }) => {
    const availableTerms = item.scores_by_term ? Object.keys(item.scores_by_term).sort() : [];
    const selectedTermForStudent = selectedStudentTerms[item.enrollment_id] || (availableTerms.length > 0 ? availableTerms[0] : '1');
    const initials = (item.first_name?.[0] || '') + (item.last_name?.[0] || '');

    return (
      <View style={styles.resultCard}>
        <View style={styles.avatarContainer}>
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        
        <View style={styles.studentInfo}>
          <ThemedText style={styles.resultTitle}>
            {item.first_name} {item.last_name}
          </ThemedText>
          <View style={styles.metaRow}>
            <Ionicons name="school-outline" size={12} color={Colors.accent.gold} />
            <ThemedText style={styles.resultSubtitle}>{item.class_name}</ThemedText>
          </View>

          {availableTerms.length > 0 && (
            <View style={styles.termSection}>
              {availableTerms.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={[
                    styles.miniChip,
                    selectedTermForStudent === term && styles.activeMiniChip
                  ]}
                  onPress={() => setSelectedStudentTerms(prev => ({ ...prev, [item.enrollment_id]: term }))}
                >
                  <ThemedText style={[styles.miniChipText, selectedTermForStudent === term && styles.activeMiniChipText]}>T{term}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.fullActionBtn}
              onPress={() => handleInitiateDispatch(
                item.enrollment_id,
                `${item.first_name} ${item.last_name}`,
                parseInt(selectedTermForStudent),
                item.session_id || parseInt(selectedSession)
              )}
              disabled={downloadingId === `${item.enrollment_id}`}
            >
              <Ionicons 
                name={sentSuccessIds[item.enrollment_id] ? "checkmark-circle" : "eye-outline"} 
                size={16} 
                color={sentSuccessIds[item.enrollment_id] ? "#10B981" : "#FFFFFF"} 
              />
              <ThemedText style={[styles.actionBtnText, sentSuccessIds[item.enrollment_id] && { color: '#10B981' }]}>
                {sentSuccessIds[item.enrollment_id] ? "Sent" : "View & Dispatch"}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fullActionBtn, { borderColor: Colors.accent.gold + '40' }]}
              onPress={() => handleRegenerateRemark(
                item.enrollment_id,
                `${item.first_name} ${item.last_name}`,
                parseInt(selectedTermForStudent),
                item.session_id || parseInt(selectedSession)
              )}
              disabled={regeneratingId === `${item.enrollment_id}`}
            >
              {regeneratingId === `${item.enrollment_id}` ? (
                <ActivityIndicator size="small" color={Colors.accent.gold} />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={16} color={Colors.accent.gold} />
                  <ThemedText style={[styles.actionBtnText, { color: Colors.accent.gold }]}>AI Regen</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderClassReportStudent = ({ item }: { item: any }) => {
    const studentName = item.name || `${item.first_name} ${item.last_name}`;

    return (
      <View style={styles.resultCard}>
        <View style={styles.rankBadge}>
          <ThemedText style={styles.rankText}>#{item.rank}</ThemedText>
        </View>
        
        <View style={styles.studentInfo}>
          <ThemedText style={styles.resultTitle}>{studentName}</ThemedText>
          <ThemedText style={styles.scoreMeta}>Aggregate Score: {item.total_score || 'N/A'}</ThemedText>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.fullActionBtn}
              onPress={() => handleInitiateDispatch(
                item.enrollment_id,
                studentName,
                item.term || 1,
                parseInt(selectedSession)
              )}
              disabled={downloadingId === `${item.enrollment_id}`}
            >
              <Ionicons 
                name={sentSuccessIds[item.enrollment_id] ? "checkmark-circle" : "eye-outline"} 
                size={16} 
                color={sentSuccessIds[item.enrollment_id] ? "#10B981" : "#FFFFFF"} 
              />
              <ThemedText style={[styles.actionBtnText, sentSuccessIds[item.enrollment_id] && { color: '#10B981' }]}>
                {sentSuccessIds[item.enrollment_id] ? "Sent" : "View & Dispatch"}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fullActionBtn, { borderColor: Colors.accent.gold + '40' }]}
              onPress={() => handleRegenerateRemark(
                item.enrollment_id,
                studentName,
                item.term || 1,
                parseInt(selectedSession)
              )}
              disabled={regeneratingId === `${item.enrollment_id}`}
            >
              {regeneratingId === `${item.enrollment_id}` ? (
                <ActivityIndicator size="small" color={Colors.accent.gold} />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={16} color={Colors.accent.gold} />
                  <ThemedText style={[styles.actionBtnText, { color: Colors.accent.gold }]}>AI Regen</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.mainWrapper}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070' }}
        style={styles.hero}
      >
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.4)', Colors.accent.navy]}
          style={styles.heroOverlay}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionIcon}>
                <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon}>
                <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <ThemedText style={styles.heroSubtitle}>ACADEMIC EXCELLENCE</ThemedText>
            <ThemedText style={styles.heroMainTitle}>Report Cards</ThemedText>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.tabSection}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, mode === 'student' && styles.activeTabBtn]}
            onPress={() => handleModeSwitch('student')}
          >
            <Ionicons name="person" size={18} color={mode === 'student' ? Colors.accent.navy : '#94A3B8'} />
            <ThemedText style={[styles.tabBtnText, mode === 'student' && styles.activeTabBtnText]}>Student View</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, mode === 'class' && styles.activeTabBtn]}
            onPress={() => handleModeSwitch('class')}
          >
            <Ionicons name="people" size={18} color={mode === 'class' ? Colors.accent.navy : '#94A3B8'} />
            <ThemedText style={[styles.tabBtnText, mode === 'class' && styles.activeTabBtnText]}>Class View</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {mode === 'student' && (
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Colors.accent.gold} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                editable={!loading}
              />
            </View>
          </View>
        )}

        {mode === 'class' && !showingReportData && (
          <View style={styles.filterSection}>
            <View style={styles.filterGroup}>
              <ThemedText style={styles.filterLabel}>ACADEMIC SESSION</ThemedText>
              <TouchableOpacity 
                style={styles.inputSelector} 
                onPress={() => setShowSessionSelector(!showSessionSelector)}
              >
                <ThemedText style={styles.selectorText}>
                  {sessions.find((s: any) => String(s.id) === selectedSession)?.session_name || 'Select Session'}
                </ThemedText>
                <Ionicons name={showSessionSelector ? "chevron-up" : "chevron-down"} size={20} color={Colors.accent.gold} />
              </TouchableOpacity>

              {showSessionSelector && (
                <View style={styles.selectorList}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {sessions.map((session: any) => (
                      <TouchableOpacity
                        key={session.id}
                        style={[styles.selectorItem, selectedSession === String(session.id) && styles.selectorItemActive]}
                        onPress={() => {
                          setSelectedSession(String(session.id));
                          setShowSessionSelector(false);
                        }}
                      >
                        <ThemedText style={[styles.selectorItemText, selectedSession === String(session.id) && styles.selectorItemTextActive]}>
                          {session.session_name}
                        </ThemedText>
                        {selectedSession === String(session.id) && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.filterGroup}>
              <ThemedText style={styles.filterLabel}>SELECT TERM</ThemedText>
              <TouchableOpacity 
                style={styles.inputSelector} 
                onPress={() => setShowTermSelector(!showTermSelector)}
              >
                <ThemedText style={styles.selectorText}>
                  Term {selectedTerm}
                </ThemedText>
                <Ionicons name={showTermSelector ? "chevron-up" : "chevron-down"} size={20} color={Colors.accent.gold} />
              </TouchableOpacity>

              {showTermSelector && (
                <View style={styles.selectorList}>
                  <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {['1', '2', '3'].map((term) => (
                      <TouchableOpacity
                        key={term}
                        style={[styles.selectorItem, selectedTerm === term && styles.selectorItemActive]}
                        onPress={() => {
                          setSelectedTerm(term);
                          setShowTermSelector(false);
                        }}
                      >
                        <ThemedText style={[styles.selectorItemText, selectedTerm === term && styles.selectorItemTextActive]}>
                          Term {term}
                        </ThemedText>
                        {selectedTerm === term && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.filterGroup}>
              <ThemedText style={styles.filterLabel}>SELECT CLASS</ThemedText>
              <TouchableOpacity 
                style={styles.inputSelector} 
                onPress={() => setShowClassSelector(!showClassSelector)}
              >
                <ThemedText style={styles.selectorText}>
                  {classes.find((c: any) => String(c.id) === selectedClass)?.display_name || 'Select Class'}
                </ThemedText>
                <Ionicons name={showClassSelector ? "chevron-up" : "chevron-down"} size={20} color={Colors.accent.gold} />
              </TouchableOpacity>

              {showClassSelector && (
                <View style={styles.selectorList}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {classes.map((cls: any) => (
                      <TouchableOpacity
                        key={cls.id}
                        style={[styles.selectorItem, selectedClass === String(cls.id) && styles.selectorItemActive]}
                        onPress={() => {
                          setSelectedClass(String(cls.id));
                          setShowClassSelector(false);
                        }}
                      >
                        <ThemedText style={[styles.selectorItemText, selectedClass === String(cls.id) && styles.selectorItemTextActive]}>
                          {cls.display_name}
                        </ThemedText>
                        {selectedClass === String(cls.id) && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {selectedClass && (
              <CustomButton
                title="Initialize Report Generation"
                onPress={fetchClassReportData}
                loading={loading}
                variant="primary"
              />
            )}
          </View>
        )}

        {mode === 'class' && showingReportData && (
          <View style={{ paddingHorizontal: 24, paddingTop: 24, flexDirection: 'row', gap: 12 }}>
             <TouchableOpacity 
              style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
              onPress={() => setShowingReportData(false)}
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <CustomButton
                title={downloadingAll ? `Sending (${downloadProgress.current}/${downloadProgress.total})` : "Email All Class Reports"}
                onPress={emailAllClassReports}
                loading={downloadingAll}
                variant="premium"
              />
            </View>
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
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                    <Ionicons name="document-text-outline" size={40} color="rgba(255,255,255,0.1)" />
                  </View>
                  <ThemedText style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 8 }}>
                    {showingReportData ? "No Records Found" : "Initiate Selection"}
                  </ThemedText>
                  <ThemedText style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontSize: 13, fontWeight: '500', paddingHorizontal: 40 }}>
                    {showingReportData 
                      ? "No academic reports have been generated for this class and term combination yet." 
                      : (searchQuery ? "No matching records found for this student search." : "Configure academic parameters above to decrypt and view records.")}
                  </ThemedText>
                </View>
              }
            />
          )}
        </View>
      </ScrollView>

      {/* Success/Status Alert */}
      {statusAlert.visible && (
        <CustomAlert
          type={statusAlert.type}
          title={statusAlert.title}
          message={statusAlert.message}
          onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
          onConfirm={statusAlert.onConfirm}
          style={{ margin: 24 }}
        />
      )}

      {/* PDF Preview Modal */}
      <Modal visible={pdfPreviewVisible} transparent animationType="slide">
        <View style={styles.previewOverlay}>
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewTitle}>Academic Record</Text>
                <Text style={styles.previewSubtitle}>{pendingEmailData?.studentName || 'Official PDF'}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => { setPdfPreviewVisible(false); setPdfBase64(null); }}
                style={styles.previewCloseBtn}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.pdfArea}>
              {loadingPreview ? (
                <View style={styles.previewLoader}>
                  <ActivityIndicator size="large" color={Colors.accent.gold} />
                  <Text style={styles.loaderText}>GENERATING OFFICIAL PDF...</Text>
                </View>
              ) : pdfBase64 ? (
                <WebView
                  source={{ uri: `data:application/pdf;base64,${pdfBase64}` }}
                  style={styles.webView}
                  scalesPageToFit
                />
              ) : null}
            </View>

            <View style={styles.previewFooter}>
              <View style={styles.footerInfo}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.accent.gold} />
                <Text style={styles.footerInfoText}>Verified Official Document</Text>
              </View>
              <View style={styles.previewActionRow}>
                <TouchableOpacity style={styles.previewCancel} onPress={() => { setPdfPreviewVisible(false); setPdfBase64(null); }}>
                  <Text style={styles.previewCancelText}>Discard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.previewSubmit} onPress={handleProceedToEmail}>
                  <Ionicons name="mail" size={18} color={Colors.accent.navy} />
                  <Text style={styles.previewSubmitText}>Proceed to Email</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Input Modal */}
      <Modal visible={currentEmailRequest !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Secure Dispatch</Text>
            <Text style={styles.modalSubtitle}>
              {currentEmailRequest?.enrollmentId === 0 
                ? "Authorize batch delivery for the entire class records" 
                : "Enter destination address for official academic credentials"}
            </Text>
            
            <View style={styles.inputWrapper}>
              <Ionicons name="at" size={20} color="rgba(255,255,255,0.3)" />
              <TextInput
                style={styles.modalInput}
                placeholder="recipient@institution.edu"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancel} 
                onPress={() => setCurrentEmailRequest(null)}
              >
                <Text style={styles.modalCancelText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSubmit}
                onPress={handleEmailModalSubmit}
              >
                <Text style={styles.modalSubmitText}>Transmit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>Transmission Success</Text>
            <Text style={styles.modalSubtitle}>Official records have been verified and transmitted to the requested destination address.</Text>
            <CustomButton title="ACKNOWLEDGE" onPress={() => setShowSuccessModal(false)} variant="premium" />
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: Colors.accent.navy },
  hero: { height: 180, width: '100%' },
  heroOverlay: { flex: 1, paddingHorizontal: 24, paddingTop: 44 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  heroContent: { marginTop: 'auto', marginBottom: 16 },
  heroSubtitle: { color: Colors.accent.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 2 },
  heroMainTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: -1 },

  tabSection: { paddingHorizontal: 24, marginTop: 16, zIndex: 10 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 20, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 16 },
  activeTabBtn: { backgroundColor: Colors.accent.gold },
  tabBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  activeTabBtnText: { color: Colors.accent.navy },

  searchSection: { paddingHorizontal: 24, marginTop: 24 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 20, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  searchInput: { flex: 1, marginLeft: 12, color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  filterSection: { paddingHorizontal: 24, marginTop: 24 },
  filterGroup: { marginBottom: 24 },
  filterLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' },
  
  inputSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectorText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  
  selectorList: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    marginTop: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  selectorItemActive: { backgroundColor: 'rgba(250, 204, 21, 0.1)' },
  selectorItemText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  selectorItemTextActive: { color: Colors.accent.gold, fontWeight: '800' },

  chipRow: { flexDirection: 'row', gap: 10 },

  listContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  resultCard: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  avatarContainer: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.accent.gold },
  avatarText: { color: Colors.accent.gold, fontSize: 16, fontWeight: '800' },
  rankBadge: { width: 50, height: 50, borderRadius: 16, backgroundColor: Colors.accent.gold, justifyContent: 'center', alignItems: 'center' },
  rankText: { color: Colors.accent.navy, fontSize: 18, fontWeight: '900' },
  studentInfo: { flex: 1, marginLeft: 16 },
  resultTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  resultSubtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  scoreMeta: { fontSize: 11, color: Colors.accent.gold, fontWeight: '700', marginBottom: 8 },
  termSection: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  miniChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  activeMiniChip: { backgroundColor: Colors.accent.gold },
  miniChipText: { fontSize: 10, color: '#94A3B8', fontWeight: '800' },
  activeMiniChipText: { color: Colors.accent.navy },
  cardActions: { flexDirection: 'column', gap: 8, marginTop: 4 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  fullActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  centerLoader: { padding: 40, alignItems: 'center' },
  loaderText: { color: Colors.accent.gold, marginTop: 12, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 16, marginTop: 20 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.9)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', backgroundColor: '#1E293B', borderRadius: 32, padding: 32, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center' },
  modalTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 20, paddingHorizontal: 16, height: 56, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', width: '100%' },
  modalInput: { flex: 1, marginLeft: 12, color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  modalCancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  modalSubmit: { flex: 2, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: Colors.accent.gold },
  modalSubmitText: { color: Colors.accent.navy, fontSize: 14, fontWeight: '900' },
  successIcon: { alignItems: 'center', marginBottom: 20 },

  // PDF Preview Styles
  previewOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.98)', justifyContent: 'center' },
  previewContainer: { flex: 1, width: '100%' },
  previewHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: 60, 
    paddingBottom: 20,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  previewTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  previewSubtitle: { color: Colors.accent.gold, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  previewCloseBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  
  pdfArea: { flex: 1, backgroundColor: '#000' },
  webView: { flex: 1, backgroundColor: '#000' },
  previewLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  
  previewFooter: { 
    paddingHorizontal: 24, 
    paddingTop: 20, 
    paddingBottom: 40, 
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)'
  },
  footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 20 },
  footerInfoText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  
  previewActionRow: { flexDirection: 'row', gap: 12 },
  previewCancel: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  previewCancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  previewSubmit: { flex: 2, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, backgroundColor: Colors.accent.gold },
  previewSubmitText: { color: Colors.accent.navy, fontSize: 15, fontWeight: '900' }
});