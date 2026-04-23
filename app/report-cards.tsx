import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Alert, Modal } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/utils/api-service';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// Unified filename builder
const buildFileName = (name: string, term: number) =>
  `Report_${name.replace(/\s+/g, '_')}_Term${term}.pdf`;


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

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [currentEmailRequest, setCurrentEmailRequest] = useState<{
    enrollmentId: number;
    studentName: string;
    term: number;
    sessionId: number;
  } | null>(null);

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
        : `/api/reports/list/classes`;

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

  // 2. Debounced search for students
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
    } else {
      handleFetch(); // Load class list immediately for class mode
    }
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

      const response = await fetch(`${API_BASE_URL}/api/reports/list/classes`, {
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

      const endpoint = `/api/reports/data/class/${selectedClass.id}?term=${selectedTerm}&sessionId=${selectedSession}`;
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      console.log('📊 Class Report Data Response:', json);
      if (json.success && json.data) {
        setClassReportData(json.data);
        if (json.data.length === 0) {
          setError('No report data available for this class');
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

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Email all class reports
  const emailAllClassReports = useCallback(async () => {
    if (classReportData.length === 0) {
      setError('No students to email');
      return;
    }

    // Prompt for email address once for all reports
    Alert.prompt(
      'Email All Report Cards',
      `Enter email address to send all ${classReportData.length} report cards:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send All',
          onPress: async (email) => {
            if (!email || !email.includes('@')) {
              Alert.alert('Invalid Email', 'Please enter a valid email address.');
              return;
            }

            setDownloadingAll(true);
            setDownloadProgress({ current: 0, total: classReportData.length });
            setError('');
            let successCount = 0;
            let failedCount = 0;

            for (let i = 0; i < classReportData.length; i++) {
              const student = classReportData[i];
              setDownloadProgress({ current: i + 1, total: classReportData.length });

              try {
                const token = await getToken();
                if (!token) {
                  failedCount++;
                  continue;
                }

                const studentTerm = selectedStudentTerms[student.enrollment_id] || selectedTerm;

                const emailUrl = `${API_BASE_URL}/api/reports/email/official-report/${student.enrollment_id}`;
                const response = await fetch(emailUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    term: studentTerm,
                    sessionId: selectedSession,
                    email: email.trim()
                  }),
                });

                const result = await response.json();

                if (response.ok && result.success) {
                  successCount++;
                } else {
                  failedCount++;
                  console.error('Email failed for student:', student.name, result.error);
                }

              } catch (error) {
                console.error('Email error for student:', student.name, error);
                failedCount++;
              }
            }

            setDownloadingAll(false);
            setDownloadProgress({ current: 0, total: 0 });

            setSuccessMessage(`Successfully emailed report cards for ${successCount} students.`);
            setShowSuccessModal(true);
          }
        }
      ],
      'plain-text',
      '', // default value
      'email-address' // keyboard type
    );
  }, [classReportData, selectedTerm, selectedSession, selectedStudentTerms]);

  // 3. Email Official Report PDF
  const handleEmailReport = useCallback(async (enrollmentId: number, studentName: string, term: number = 1, sessionId: number = 1) => {
    try {
      setDownloadingId(`${enrollmentId}`);
      const token = await getToken();

      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      if (Platform.OS === 'ios') {
        // iOS: Use Alert.prompt
        Alert.prompt(
          'Email Report Card',
          `Enter email address to send the report card for ${studentName}:`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send',
              onPress: async (email) => {
                if (!email || !email.includes('@')) {
                  Alert.alert('Invalid Email', 'Please enter a valid email address.');
                  return;
                }
                await sendEmailReport(enrollmentId, term, sessionId, email.trim(), token);
              }
            }
          ],
          'plain-text',
          '', // default value
          'email-address' // keyboard type
        );
      } else {
        // Android/Web: Use modal
        setCurrentEmailRequest({ enrollmentId, studentName, term, sessionId });
        setEmailInput('');
        setEmailModalVisible(true);
      }
    } catch (error) {
      console.error('Email setup error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to setup email sending');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  // Helper function to send email report
  const sendEmailReport = useCallback(async (enrollmentId: number, term: number, sessionId: number, email: string, token: string) => {
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
        setSuccessMessage(`Report card for ${enrollmentId} has been sent successfully.`); // Ideally we'd pass student name here
        setShowSuccessModal(true);
        
        // Show success state on button
        setSentSuccessIds(prev => ({ ...prev, [enrollmentId]: true }));
        setTimeout(() => {
          setSentSuccessIds(prev => ({ ...prev, [enrollmentId]: false }));
        }, 5000);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (emailError) {
      console.error('Email error:', emailError);
      Alert.alert('Email Failed', emailError instanceof Error ? emailError.message : 'Failed to send report via email');
    }
  }, []);

  // Admin: Regenerate AI remark in real-time
  const handleRegenerateRemark = useCallback(async (enrollmentId: number, studentName: string, term: number, sessionId: number) => {
    try {
      setRegeneratingId(`${enrollmentId}`);
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

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
        setSuccessMessage(`Report remark for ${studentName} has been successfully regenerated.`);
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to regenerate remark.');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to regenerate remark.');
    } finally {
      setRegeneratingId(null);
    }
  }, []);

  // Handle email modal submission
  const handleEmailModalSubmit = useCallback(async () => {
    if (!currentEmailRequest || !emailInput.trim()) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    if (!emailInput.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setEmailModalVisible(false);

    const token = await getToken();
    if (!token) {
      Alert.alert('Error', 'Authentication required. Please login again.');
      return;
    }

    setDownloadingId(`${currentEmailRequest.enrollmentId}`);

    try {
      await sendEmailReport(
        currentEmailRequest.enrollmentId,
        currentEmailRequest.term,
        currentEmailRequest.sessionId,
        emailInput.trim(),
        token
      );
    } finally {
      setDownloadingId(null);
      setCurrentEmailRequest(null);
    }
  }, [currentEmailRequest, emailInput, sendEmailReport]);

  const renderStudentItem = ({ item }: any) => {
    const availableTerms = item.scores_by_term ? Object.keys(item.scores_by_term).sort() : [];
    const selectedTermForStudent = selectedStudentTerms[item.enrollment_id] || (availableTerms.length > 0 ? availableTerms[0] : '1');

    return (
      <View style={styles.resultCard}>
        {/* Student Info */}
        <View style={styles.resultTextContainer}>
          <ThemedText style={styles.resultTitle}>
            {item.first_name} {item.last_name}
          </ThemedText>
          <ThemedText style={styles.resultSubtitle}>
            <Ionicons name="school" size={12} color="#999" /> {item.class_name}
          </ThemedText>

          {/* Term Selection for Student */}
          {availableTerms.length > 0 && (
            <View style={styles.studentTermContainer}>
              <ThemedText style={styles.termSelectorLabel}>Select Term:</ThemedText>
              <View style={styles.termOptionsRow}>
                {availableTerms.map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={[
                      styles.studentTermButton,
                      selectedTermForStudent === term && styles.activeStudentTermButton
                    ]}
                    onPress={() => setSelectedStudentTerms(prev => ({ ...prev, [item.enrollment_id]: term }))}
                  >
                    <ThemedText style={[
                      styles.studentTermButtonText,
                      selectedTermForStudent === term && styles.activeStudentTermButtonText
                    ]}>
                      T{term}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons — full width row below info */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.emailActionButton}
            onPress={() => handleEmailReport(
              item.enrollment_id,
              `${item.first_name} ${item.last_name}`,
              parseInt(selectedTermForStudent),
              item.session_id || parseInt(selectedSession)
            )}
            disabled={downloadingId === `${item.enrollment_id}`}
          >
            {downloadingId === `${item.enrollment_id}` ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : sentSuccessIds[item.enrollment_id] ? (
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
            ) : (
              <Ionicons name="mail" size={16} color="#fff" />
            )}
            <ThemedText style={styles.emailActionText}>
              {downloadingId === `${item.enrollment_id}` ? 'Sending...' : sentSuccessIds[item.enrollment_id] ? 'Sent!' : 'Email Report'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.regenerateButton]}
            onPress={() => handleRegenerateRemark(
              item.enrollment_id,
              `${item.first_name} ${item.last_name}`,
              parseInt(selectedTermForStudent),
              item.session_id || parseInt(selectedSession)
            )}
            disabled={regeneratingId === `${item.enrollment_id}`}
          >
            {regeneratingId === `${item.enrollment_id}` ? (
              <ActivityIndicator size="small" color="#FF9800" />
            ) : (
              <Ionicons name="refresh" size={14} color="#FF9800" />
            )}
            <ThemedText style={styles.regenerateButtonText}>
              {regeneratingId === `${item.enrollment_id}` ? 'Regenerating...' : 'Regenerate Remark'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderClassReportStudent = ({ item }: any) => {
    const studentName = item.name || `${item.first_name} ${item.last_name}`;

    return (
      <View style={styles.resultCard}>
        {/* Student Info */}
        <View style={styles.resultTextContainer}>
          <ThemedText style={styles.resultTitle}>{studentName}</ThemedText>
          <ThemedText style={styles.resultSubtitle}>Rank: #{item.rank}</ThemedText>
        </View>

        {/* Action Buttons — full width row below info */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.emailActionButton}
            onPress={() => handleEmailReport(
              item.enrollment_id,
              studentName,
              parseInt(selectedTerm),
              parseInt(selectedSession)
            )}
            disabled={downloadingId === `${item.enrollment_id}`}
          >
            {downloadingId === `${item.enrollment_id}` ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : sentSuccessIds[item.enrollment_id] ? (
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
            ) : (
              <Ionicons name="mail" size={16} color="#fff" />
            )}
            <ThemedText style={styles.emailActionText}>
              {downloadingId === `${item.enrollment_id}` ? 'Sending...' : sentSuccessIds[item.enrollment_id] ? 'Sent!' : 'Email Report'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={() => handleRegenerateRemark(
              item.enrollment_id,
              studentName,
              parseInt(selectedTerm),
              parseInt(selectedSession)
            )}
            disabled={regeneratingId === `${item.enrollment_id}`}
          >
            {regeneratingId === `${item.enrollment_id}` ? (
              <ActivityIndicator size="small" color="#FF9800" />
            ) : (
              <Ionicons name="refresh" size={14} color="#FF9800" />
            )}
            <ThemedText style={styles.regenerateButtonText}>
              {regeneratingId === `${item.enrollment_id}` ? 'Regenerating...' : 'Regenerate Remark'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2196F3', '#1976D2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Ionicons name="document-text" size={32} color="#fff" />
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerTitle}>Report Cards</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              View student and class performance data
            </ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, mode === 'student' && styles.activeTab]}
          onPress={() => handleModeSwitch('student')}
        >
          <Ionicons
            name="person"
            size={18}
            color={mode === 'student' ? '#2196F3' : '#999'}
            style={{ marginRight: 6 }}
          />
          <ThemedText style={[styles.tabText, mode === 'student' && styles.activeTabText]}>
            Student
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'class' && styles.activeTab]}
          onPress={() => handleModeSwitch('class')}
        >
          <Ionicons
            name="people"
            size={18}
            color={mode === 'class' ? '#2196F3' : '#999'}
            style={{ marginRight: 6 }}
          />
          <ThemedText style={[styles.tabText, mode === 'class' && styles.activeTabText]}>
            Class
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Search Input for Students */}
      {mode === 'student' && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#2196F3" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            placeholder="Search by student name..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            editable={!loading}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setResults([]); setError(''); }}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Class Mode Filters */}
      {mode === 'class' && !showingReportData && (
        <View style={styles.classFiltersContainer}>
          {/* Term Selector */}
          <View style={styles.filterGroup}>
            <ThemedText style={styles.filterLabel}>📝 Term:</ThemedText>
            <View style={styles.filterOptions}>
              {['1', '2', '3'].map((term) => (
                <TouchableOpacity
                  key={term}
                  style={[styles.filterButton, selectedTerm === term && styles.activeFilter]}
                  onPress={() => setSelectedTerm(term)}
                >
                  <ThemedText
                    style={[
                      styles.filterButtonText,
                      selectedTerm === term && styles.activeFilterText,
                    ]}
                  >
                    T{term}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Academic Year Selector */}
          {sessions.length > 0 && (
            <View style={styles.filterGroup}>
              <ThemedText style={styles.filterLabel}>📅 Academic Year:</ThemedText>
              <View style={styles.sessionButtonsRow}>
                {sessions.map((session: any) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      styles.sessionButton,
                      selectedSession === String(session.id) && styles.activeSession
                    ]}
                    onPress={() => setSelectedSession(String(session.id))}
                  >
                    <ThemedText
                      style={[
                        styles.sessionButtonText,
                        selectedSession === String(session.id) && styles.activeSessionText,
                      ]}
                    >
                      {session.session_name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Class Selector */}
          {classes.length > 0 && (
            <View style={styles.filterGroup}>
              <ThemedText style={styles.filterLabel}>🏫 Class:</ThemedText>
              <View style={styles.classButtonsRow}>
                {classes.map((classItem: any) => (
                  <TouchableOpacity
                    key={classItem.id}
                    style={[
                      styles.classSelectButton,
                      selectedClass?.id === classItem.id && styles.activeClassSelect
                    ]}
                    onPress={() => setSelectedClass(classItem)}
                  >
                    <ThemedText
                      style={[
                        styles.classSelectButtonText,
                        selectedClass?.id === classItem.id && styles.activeClassSelectText,
                      ]}
                    >
                      {classItem.display_name}
                    </ThemedText>
                    {selectedClass?.id === classItem.id && (
                      <Ionicons name="checkmark" size={14} color="#fff" style={{ marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Fetch Reports Button */}
          {selectedClass && (
            <TouchableOpacity
              style={styles.fetchReportsButton}
              onPress={fetchClassReportData}
              disabled={loading}
            >
              <Ionicons name="document" size={18} color="#fff" style={{ marginRight: 8 }} />
              <ThemedText style={styles.fetchReportsButtonText}>
                Load All Report Cards
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Back Button and Email All when showing report data */}
      {mode === 'class' && showingReportData && (
        <View style={styles.reportActionsContainer}>
          <TouchableOpacity
            style={styles.backToClassesButton}
            onPress={() => {
              setShowingReportData(false);
              setClassReportData([]);
            }}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
            <ThemedText style={styles.backToClassesText}>Back</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.downloadAllButton, downloadingAll && styles.downloadAllButtonDisabled]}
            onPress={emailAllClassReports}
            disabled={downloadingAll}
          >
            <Ionicons
              name={downloadingAll ? "hourglass" : "mail"}
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <ThemedText style={styles.downloadAllButtonText}>
              {downloadingAll
                ? `Emailing (${downloadProgress.current}/${downloadProgress.total})`
                : 'Email All'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <ThemedText style={styles.loadingText}>
            {mode === 'student' ? 'Searching students...' : 'Loading classes...'}
          </ThemedText>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color="#F44336" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          {error.includes('Connection') && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => handleFetch(searchQuery)}
            >
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Results List - Only show for students or class report data */}
      {!loading && !error && (mode === 'student' || showingReportData) && (
        <FlatList
          data={showingReportData ? classReportData : results}
          keyExtractor={(item, index) => {
            if (showingReportData) {
              return `report-${item.enrollment_id}-${item.subject_name}`;
            }
            return `student-${item.enrollment_id}`;
          }}
          renderItem={showingReportData ? renderClassReportStudent : renderStudentItem}
          contentContainerStyle={styles.listContent}
          scrollIndicatorInsets={{ right: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={showingReportData ? "document" : "search"}
                size={48}
                color="#ccc"
              />
              <ThemedText style={styles.emptyText}>
                {showingReportData
                  ? 'No report data available'
                  : 'Search for a student to view their report'
                }
              </ThemedText>
            </View>
          }
        />
      )}

      {/* Email Modal for Android/Web */}
      <Modal
        visible={emailModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Email Report Card</ThemedText>
            <ThemedText style={styles.modalSubtitle}>
              Enter email address to send the report card for {currentEmailRequest?.studentName}
            </ThemedText>

            <TextInput
              style={styles.emailInput}
              placeholder="Enter email address"
              value={emailInput}
              onChangeText={setEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEmailModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={handleEmailModalSubmit}
              >
                <ThemedText style={styles.sendButtonText}>Send</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            </View>
            <ThemedText style={styles.modalTitle}>Success!</ThemedText>
            <ThemedText style={styles.modalSubtitle}>
              {successMessage || "The report cards have been sent successfully."}
            </ThemedText>
            <TouchableOpacity 
              style={[styles.modalButton, styles.sendButton]} 
              onPress={() => setShowSuccessModal(false)}
            >
              <ThemedText style={styles.sendButtonText}>Done</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#E3F2FD',
    marginTop: 2
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 6,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  tabText: {
    color: '#999',
    fontWeight: '600',
    fontSize: 13
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '700'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingRight: 8
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
    color: '#F44336',
    fontWeight: '500'
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  resultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  emailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  emailActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500'
  },
  emptyActionButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  emptyActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  downloadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  regenerateButton: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    borderRadius: 8,
    alignItems: 'center',
  },
  regenerateButtonText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '600',
  },
  classFiltersContainer: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBE5FF',
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilter: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
  },
  sessionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sessionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeSession: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  sessionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeSessionText: {
    color: '#fff',
  },
  fetchReportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  fetchReportsButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  backToClassesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 10,
    backgroundColor: '#FF9800',
    borderRadius: 8,
  },
  backToClassesText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  resultCardSelected: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  classButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  classSelectButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeClassSelect: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  classSelectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeClassSelectText: {
    color: '#fff',
  },
  reportActionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  downloadAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  downloadAllButtonDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  downloadAllButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  studentTermContainer: {
    marginTop: 10,
  },
  termSelectorLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  termOptionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  studentTermButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#eee',
    minWidth: 35,
    alignItems: 'center',
  },
  activeStudentTermButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  studentTermButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  activeStudentTermButtonText: {
    color: '#fff',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  regenerateButton: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    borderRadius: 8,
    alignItems: 'center',
  },
  regenerateButtonText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '600',
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  sendButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});