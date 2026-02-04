import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
  FlatList,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/utils/api-service';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  rank: number;
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

export default function ReportViewScreen() {
  const router = useRouter();
  const { id: initialId, mode: initialMode, name: initialName } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentData, setStudentData] = useState<ScoreData[]>([]);
  const [classData, setClassData] = useState<ClassStudent[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedSession, setSelectedSession] = useState('1');
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [mode, setMode] = useState<'student' | 'class'>(initialMode as 'student' | 'class' || 'student');
  const [reportId, setReportId] = useState<string | null>(initialId as string || null);
  const [reportName, setReportName] = useState<string>(initialName as string || '');

  // Fetch data based on mode
  useEffect(() => {
    if (reportId && mode === 'student') {
      fetchReportData();
    } else if (reportId && mode === 'class') {
      setSelectedClass({ id: Number(reportId), display_name: reportName });
      fetchReportData();
    } else if (mode === 'class' && !reportId) {
      // Mode is class but no ID provided, let user select
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

  const getPerformanceColor = (student: number, classAvg: number): string => {
    if (student >= classAvg * 1.1) return '#4CAF50'; // 10% above average - Green
    if (student >= classAvg) return '#2196F3'; // Above average - Blue
    if (student >= classAvg * 0.9) return '#FF9800'; // Within 10% below - Orange
    return '#F44336'; // Below average - Red
  };

  const getRankColor = (rank: number): string => {
    if (rank === 1) return '#FFD700'; // Gold for 1st
    if (rank === 2) return '#C0C0C0'; // Silver for 2nd
    if (rank === 3) return '#CD7F32'; // Bronze for 3rd
    return '#2196F3'; // Blue for others
  };

  const renderStudentReport = () => {
    if (studentData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>No scores available for this student</ThemedText>
        </View>
      );
    }

    return (
      <View>
        {studentData.map((subject, index) => (
          <View key={index} style={styles.subjectCard}>
            {/* Subject Header */}
            <View style={styles.subjectHeader}>
              <View>
                <ThemedText style={styles.subjectName}>{subject.subject_name}</ThemedText>
              </View>
              <View
                style={[
                  styles.totalScoreBadge,
                  {
                    backgroundColor: getPerformanceColor(
                      subject.student_total,
                      subject.class_average || 0
                    ),
                  },
                ]}
              >
                <ThemedText style={styles.totalScoreText}>
                  {subject.student_total}
                </ThemedText>
              </View>
            </View>

            {/* Individual Scores Grid */}
            <View style={styles.scoresGrid}>
              <View style={styles.scoreItem}>
                <ThemedText style={styles.scoreLabel}>CA1</ThemedText>
                <ThemedText style={styles.scoreValue}>{subject.ca1_score}</ThemedText>
              </View>
              <View style={styles.scoreItem}>
                <ThemedText style={styles.scoreLabel}>CA2</ThemedText>
                <ThemedText style={styles.scoreValue}>{subject.ca2_score}</ThemedText>
              </View>
              <View style={styles.scoreItem}>
                <ThemedText style={styles.scoreLabel}>CA3</ThemedText>
                <ThemedText style={styles.scoreValue}>{subject.ca3_score}</ThemedText>
              </View>
              <View style={styles.scoreItem}>
                <ThemedText style={styles.scoreLabel}>CA4</ThemedText>
                <ThemedText style={styles.scoreValue}>{subject.ca4_score}</ThemedText>
              </View>
              <View style={styles.scoreItem}>
                <ThemedText style={styles.scoreLabel}>Exam</ThemedText>
                <ThemedText style={styles.scoreValue}>{subject.exam_score}</ThemedText>
              </View>
            </View>

            {/* Class Average Comparison */}
            {subject.class_average !== undefined && subject.class_average !== null && (
              <View style={styles.comparisonContainer}>
                <View style={styles.comparisonRow}>
                  <ThemedText style={styles.comparisonLabel}>Your Score:</ThemedText>
                  <ThemedText style={styles.comparisonValue}>{Number(subject.student_total).toFixed(1)}</ThemedText>
                </View>
                <View style={styles.comparisonRow}>
                  <ThemedText style={styles.comparisonLabel}>Class Average:</ThemedText>
                  <ThemedText style={styles.comparisonValue}>{Number(subject.class_average).toFixed(1)}</ThemedText>
                </View>
                <View style={styles.comparisonRow}>
                  <ThemedText style={styles.comparisonLabel}>Difference:</ThemedText>
                  <ThemedText
                    style={[
                      styles.comparisonValue,
                      {
                        color:
                          Number(subject.student_total) >= Number(subject.class_average)
                            ? '#4CAF50'
                            : '#F44336',
                      },
                    ]}
                  >
                    {(Number(subject.student_total) - Number(subject.class_average)).toFixed(1)}
                  </ThemedText>
                </View>
              </View>
            )}
            {(!subject.class_average || subject.class_average === undefined) && (
              <View style={[styles.comparisonContainer, { backgroundColor: '#f0f0f0', borderLeftColor: '#999' }]}>
                <ThemedText style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>
                  No class comparison data available
                </ThemedText>
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
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>No student data available for this class</ThemedText>
        </View>
      );
    }

    return (
      <View>
        {classData.map((student, studentIndex) => (
          <View key={studentIndex} style={styles.studentCard}>
            {/* Student Header with Rank */}
            <View style={styles.studentHeader}>
              <View style={styles.studentNameContainer}>
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: getRankColor(student.rank) },
                  ]}
                >
                  <ThemedText style={styles.rankText}>{student.rank}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.studentName}>{student.name}</ThemedText>
                  <ThemedText style={styles.grandTotal}>
                    Total: {student.grand_total}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Subject Breakdown */}
            <View style={styles.subjectsContainer}>
              {student.subjects.map((subject, subjectIndex) => (
                <View key={subjectIndex} style={styles.subjectRow}>
                  <View style={styles.subjectInfo}>
                    <ThemedText style={styles.subjectNameSmall}>{subject.subject}</ThemedText>
                    <ThemedText style={styles.scoreBreakdown}>
                      {subject.ca1_score + subject.ca2_score + subject.ca3_score + subject.ca4_score} + {subject.exam_score}
                    </ThemedText>
                  </View>
                  <View style={styles.subjectScoreContainer}>
                    <View
                      style={[
                        styles.subjectScoreBadge,
                        {
                          backgroundColor: getPerformanceColor(
                            subject.subject_total,
                            Number(subject.subject_class_average) || 0
                          ),
                        },
                      ]}
                    >
                      <ThemedText style={styles.subjectScoreText}>
                        {subject.subject_total}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.subjectAverage}>
                      avg: {Number(subject.subject_class_average || 0).toFixed(0)}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#2196F3', '#1976D2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerTitle}>
              {mode === 'student' ? 'Student Report' : 'Class Report'}
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>{reportName || 'Select a class'}</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* Class Selector for Class Mode without ID */}
      {mode === 'class' && !reportId && (
        <View style={styles.classSelectorContainer}>
          <ThemedText style={styles.classSelectorLabel}>Select a Class: ({classes.length} available)</ThemedText>
          <TouchableOpacity
            style={styles.classSelectorButton}
            onPress={() => {
              console.log('🔽 Opening class dropdown, classes:', classes);
              setShowClassDropdown(true);
            }}
          >
            <ThemedText style={styles.classSelectorButtonText}>
              {selectedClass ? selectedClass.display_name : '📋 Choose a class...'}
            </ThemedText>
            <Ionicons name="chevron-down" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>
      )}

      {/* Class Dropdown Modal */}
      <Modal
        visible={showClassDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowClassDropdown(false)}
      >
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <ThemedText style={styles.dropdownTitle}>Select Class</ThemedText>
              <TouchableOpacity onPress={() => setShowClassDropdown(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={classes}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedClass?.id === item.id && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedClass(item);
                    // Don't close dropdown - user can search for another class
                    console.log('✓ Selected class:', item);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.dropdownItemText,
                      selectedClass?.id === item.id && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {item.display_name}
                  </ThemedText>
                  {selectedClass?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color="#2196F3" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Filter Controls */}
      <View style={styles.filterContainer}>
        <View style={styles.filterGroup}>
          <ThemedText style={styles.filterLabel}>Term:</ThemedText>
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

        {sessions.length > 0 && (
          <View style={styles.filterGroup}>
            <ThemedText style={styles.filterLabel}>Academic Year:</ThemedText>
            <TouchableOpacity
              style={styles.sessionDropdownButton}
              onPress={() => setShowSessionDropdown(true)}
            >
              <ThemedText style={styles.sessionDropdownButtonText}>
                {sessions.find((s: any) => String(s.id) === selectedSession)?.session_name || 'Select year...'}
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* New Report Button - When Results Displayed */}
      {reportId && !loading && !error && (
        <View style={styles.newReportButtonContainer}>
          <TouchableOpacity
            style={styles.newReportButton}
            onPress={() => {
              console.log('🔄 Starting new report request');
              setReportId(null);
              setSelectedClass(null);
              setStudentData([]);
              setClassData([]);
              setError('');
            }}
          >
            <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
            <ThemedText style={styles.newReportButtonText}>New Report</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Session Dropdown Modal */}
      <Modal
        visible={showSessionDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSessionDropdown(false)}
      >
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <ThemedText style={styles.dropdownTitle}>Select Academic Year</ThemedText>
              <TouchableOpacity onPress={() => setShowSessionDropdown(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={sessions}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedSession === String(item.id) && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedSession(String(item.id));
                    setShowSessionDropdown(false);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.dropdownItemText,
                      selectedSession === String(item.id) && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {item.session_name}
                  </ThemedText>
                  {selectedSession === String(item.id) && (
                    <Ionicons name="checkmark" size={20} color="#2196F3" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Load Results Button - Only for Class Mode when class is selected */}
      {mode === 'class' && !reportId && selectedClass && (
        <View style={styles.loadResultsContainer}>
          <TouchableOpacity
            style={styles.loadResultsButton}
            onPress={() => {
              console.log('📊 Loading report for class:', selectedClass);
              setReportId(String(selectedClass.id));
              setReportName(selectedClass.display_name);
              fetchReportData();
            }}
          >
            <ThemedText style={styles.loadResultsButtonText}>Load Results</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <ThemedText style={styles.loadingText}>Loading report data...</ThemedText>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={40} color="#F44336" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReportData}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Report Content */}
      {!loading && !error && (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
          {mode === 'student' ? renderStudentReport() : renderClassReport()}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    gap: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#E3F2FD', marginTop: 4 },
  filterContainer: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#f5f5f5' },
  filterGroup: { marginBottom: 12 },
  filterLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, color: '#333' },
  filterOptions: { flexDirection: 'row', gap: 8 },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilter: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  filterButtonText: { fontSize: 12, fontWeight: '600', color: '#666' },
  activeFilterText: { color: '#fff' },
  sessionPicker: { flexDirection: 'row', gap: 8 },
  sessionOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeSession: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  sessionText: { fontSize: 12, fontWeight: '600', color: '#666' },
  activeSessionText: { color: '#fff' },
  sessionDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sessionDropdownButtonText: { fontSize: 13, fontWeight: '600', color: '#333' },
  loadResultsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  loadResultsButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadResultsButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  newReportButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  newReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#FF9800',
  },
  newReportButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  content: { flex: 1, padding: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: { marginTop: 16, fontSize: 14, textAlign: 'center', color: '#F44336' },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },

  // Student Report Styles
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectName: { fontSize: 15, fontWeight: '700', color: '#333' },
  totalScoreBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  totalScoreText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  scoresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
  },
  scoreItem: { alignItems: 'center', flex: 1 },
  scoreLabel: { fontSize: 11, fontWeight: '600', color: '#666', marginBottom: 4 },
  scoreValue: { fontSize: 14, fontWeight: '700', color: '#2196F3' },
  comparisonContainer: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  comparisonLabel: { fontSize: 12, fontWeight: '600', color: '#555' },
  comparisonValue: { fontSize: 13, fontWeight: '700', color: '#2196F3' },

  // Class Report Styles
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  studentHeader: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  studentNameContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  studentName: { fontSize: 15, fontWeight: '700', color: '#333' },
  grandTotal: { fontSize: 12, color: '#666', marginTop: 2 },
  subjectsContainer: { gap: 8 },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
  },
  subjectInfo: { flex: 1 },
  subjectNameSmall: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 2 },
  scoreBreakdown: { fontSize: 11, color: '#666' },
  subjectScoreContainer: { alignItems: 'center', gap: 4 },
  subjectScoreBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  subjectScoreText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  subjectAverage: { fontSize: 10, color: '#666' },

  // Class Selector Styles
  classSelectorContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  classSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  classSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  classSelectorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    flex: 1,
  },
  loadReportButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadReportButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Dropdown Modal Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#2196F3',
    fontWeight: '700',
  },
});
