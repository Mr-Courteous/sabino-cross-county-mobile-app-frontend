import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Alert, Share, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/utils/api-service';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const getToken = async () => {
  if (Platform.OS !== 'web') return await SecureStore.getItemAsync('userToken');
  return localStorage.getItem('userToken');
};

export default function ReportSearchScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'student' | 'class'>('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
  };

  // 3. Download Official Report PDF
  const handleDownloadReport = useCallback(async (enrollmentId: number, studentName: string, term: number = 1, sessionId: number = 1) => {
    try {
      setDownloadingId(`${enrollmentId}`);
      const token = await getToken();

      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      // Build the download URL
      const downloadUrl = `${API_BASE_URL}/api/reports/download/official-report/${enrollmentId}?term=${term}&sessionId=${sessionId}`;
      const fileName = `report_${studentName.replace(/\s+/g, '_')}.pdf`;

      if (Platform.OS === 'web') {
        // For web, fetch the PDF and download as blob
        try {
          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const blob = await response.blob();
          
          // Create blob URL and trigger download
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
          }, 100);

          Alert.alert('Success', `Report downloaded: ${fileName}`);
        } catch (fetchError) {
          console.error('Fetch error:', fetchError);
          throw fetchError;
        }
      } else if (Platform.OS === 'android') {
        // Android: Save to system Downloads folder and open with system viewer
        try {
          const filename = fileName;
          console.log('🤖 Android: Fetching PDF from:', downloadUrl);

          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Download failed with status: ${response.status}`);
          }

          // Convert blob to base64
          const blob = await response.blob();
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.includes(',') ? result.split(',')[1] : result;
              resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
          });

          // Write to app's cache directory first
          const cacheDir = FileSystem.cacheDirectory;
          if (!cacheDir) {
            throw new Error('Cannot access cache directory');
          }

          const fileUri = `${cacheDir}${filename}`;
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          console.log('✅ PDF written to cache:', fileUri);

          // Open with system PDF viewer using Linking
          try {
            const canOpen = await Linking.canOpenURL(`file://${fileUri}`);
            if (canOpen) {
              await Linking.openURL(`file://${fileUri}`);
              console.log('✅ Opened PDF with system viewer');
            } else {
              throw new Error('Cannot open PDF on this device');
            }
          } catch (openError) {
            console.warn('Could not open PDF directly, using share instead:', openError);
            // Fallback to sharing if direct open fails
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri, {
                mimeType: 'application/pdf',
                dialogTitle: 'View Report Card',
              });
            }
          }

          Alert.alert('Success', 'Report downloaded and opened');
        } catch (androidError) {
          console.error('❌ Android download error:', androidError);
          Alert.alert('Download Failed', androidError instanceof Error ? androidError.message : 'Failed to download report');
        }
      } else if (Platform.OS === 'ios') {
        // iOS: Save to app Documents and present system "Open in / Save to Files" dialog
        try {
          const filename = fileName;
          console.log('🍎 iOS: Fetching PDF from:', downloadUrl);

          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Download failed with status: ${response.status}`);
          }

          // Convert blob to base64
          const blob = await response.blob();
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.includes(',') ? result.split(',')[1] : result;
              resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
          });

          // Get document directory
          const docDir = FileSystem.documentDirectory;
          if (!docDir) {
            throw new Error('Cannot access documents directory');
          }

          // Create PDFs subdirectory
          const pdfDir = `${docDir}PDFs/`;
          await FileSystem.makeDirectoryAsync(pdfDir, { intermediates: true });

          const fileUri = `${pdfDir}${filename}`;
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          console.log('✅ PDF saved to documents:', fileUri);

          // Present system "Open in / Save to Files" dialog
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/pdf',
              UTI: 'com.adobe.pdf',
              dialogTitle: 'Save Report Card',
            });
            console.log('✅ Presented system share dialog');
          } else {
            throw new Error('Sharing not available on this device');
          }

          Alert.alert('Success', 'Report ready to save or open');
        } catch (iosError) {
          console.error('❌ iOS download error:', iosError);
          Alert.alert('Download Failed', iosError instanceof Error ? iosError.message : 'Failed to download report');
        }
      }
    } catch (error) {
      console.error('Download Error:', error);
      Alert.alert('Download Failed', error instanceof Error ? error.message : 'Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const renderStudentItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.resultCard}
      activeOpacity={0.7}
    >
      <View style={styles.resultContent}>
        <TouchableOpacity 
          style={{ flex: 1 }}
          onPress={() => router.push({
            pathname: "/report-view",
            params: { 
              id: item.enrollment_id, 
              mode: 'student',
              name: `${item.first_name} ${item.last_name}`
            }
          })}
        >
          <View style={styles.resultTextContainer}>
            <ThemedText style={styles.resultTitle}>
              {item.first_name} {item.last_name}
            </ThemedText>
            <ThemedText style={styles.resultSubtitle}>
              <Ionicons name="school" size={12} color="#999" /> {item.class_name}
            </ThemedText>
          </View>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => handleDownloadReport(
              item.enrollment_id, 
              `${item.first_name} ${item.last_name}`
            )}
            disabled={downloadingId === `${item.enrollment_id}`}
          >
            {downloadingId === `${item.enrollment_id}` ? (
              <ActivityIndicator size="small" color="#2196F3" />
            ) : (
              <Ionicons name="download" size={18} color="#2196F3" />
            )}
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={20} color="#2196F3" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderClassItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.resultCard}
      onPress={() => router.push({
        pathname: "/report-view",
        params: { 
          id: item.id, 
          mode: 'class',
          name: item.display_name
        }
      })}
      activeOpacity={0.7}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultTextContainer}>
          <ThemedText style={styles.resultTitle}>
            {item.display_name}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#2196F3" />
      </View>
    </TouchableOpacity>
  );

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

      {/* Results List */}
      {!loading && !error && (
        <FlatList
          data={results}
          keyExtractor={(item, index) => 
            mode === 'student' 
              ? `student-${item.enrollment_id}` 
              : `class-${item.id}`
          }
          renderItem={mode === 'student' ? renderStudentItem : renderClassItem}
          contentContainerStyle={styles.listContent}
          scrollIndicatorInsets={{ right: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={mode === 'student' ? "search" : "folder-open"} 
                size={48} 
                color="#ccc" 
              />
              <ThemedText style={styles.emptyText}>
                {mode === 'student' 
                  ? 'Search for a student to view their report' 
                  : 'Click to view class reports'
                }
              </ThemedText>
              {mode === 'class' && results.length === 0 && !loading && (
                <TouchableOpacity 
                  style={styles.emptyActionButton}
                  onPress={() => handleFetch()}
                >
                  <ThemedText style={styles.emptyActionText}>Load Classes</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
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
  }
});