import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, SectionList, Alert,
  Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';

const AVAILABLE_CLASSES = [
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"
];

export default function StudentList() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initialLoad();
  }, []);

  const initialLoad = async () => {
    setLoading(true);
    setError(null);

    try {
      let token = localStorage.getItem('userToken');
      if (!token && Platform.OS !== 'web') {
        try {
          token = await SecureStore.getItemAsync('userToken');
        } catch (e) {}
      }

      const response = await fetch(`${API_BASE_URL}/students`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (response.ok && data.success && Array.isArray(data.data)) {
        setStudents(data.data);
      } else {
        setError(data.message || "Failed to fetch students");
        setStudents([]);
      }
    } catch (err: any) {
      setError(`Network error: ${err?.message || "Check server connection"}`);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const groupedData = useMemo(() => {
    const filtered = students.filter((s: any) => 
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admission_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply the class selection filter
    return AVAILABLE_CLASSES
      .filter(className => !selectedClass || className === selectedClass)
      .map(className => ({
        title: className,
        data: filtered.filter((s: any) => s.class_name_text === className)
      }))
      .filter(section => section.data.length > 0);
  }, [students, searchQuery, selectedClass]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FACC15" />
        <Text style={styles.loadingText}>Connecting to Server...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Students</Text>
          <TouchableOpacity onPress={() => initialLoad()} style={styles.backBtn}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={{ marginLeft: 15 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Class Selector Bar */}
        <View style={styles.classSelectorWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classSelectorContent}>
            <TouchableOpacity 
              style={[styles.classTab, !selectedClass && styles.classTabActive]} 
              onPress={() => setSelectedClass(null)}
            >
              <Text style={[styles.classTabText, !selectedClass && styles.classTabTextActive]}>All</Text>
            </TouchableOpacity>
            
            {AVAILABLE_CLASSES.map((cls) => (
              <TouchableOpacity 
                key={cls}
                style={[styles.classTab, selectedClass === cls && styles.classTabActive]} 
                onPress={() => setSelectedClass(cls)}
              >
                <Text style={[styles.classTabText, selectedClass === cls && styles.classTabTextActive]}>{cls}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={50} color="#F87171" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => initialLoad()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={groupedData}
          keyExtractor={(item) => item.id.toString()}
          stickySectionHeadersEnabled={true}
          renderItem={({ item }) => (
            <View style={styles.studentCard}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.first_name?.[0] || '?'}</Text></View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.first_name} {item.last_name}</Text>
                <Text style={styles.studentReg}>{item.admission_number || 'N/A'}</Text>
              </View>
            </View>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}><Text style={styles.sectionHeaderTitle}>{title}</Text></View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>No Students Found</Text>
              <Text style={styles.emptySubtext}>
                {selectedClass ? `No students found in ${selectedClass}` : 'Start by enrolling students'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerGradient: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, height: 50 },
  searchInput: { flex: 1, paddingHorizontal: 12, fontSize: 15, color: '#1E293B', fontWeight: '600' },
  
  // Class Selector Styles
  classSelectorWrapper: { marginTop: 15 },
  classSelectorContent: { paddingRight: 20 },
  classTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8 },
  classTabActive: { backgroundColor: '#FACC15' },
  classTabText: { color: '#CBD5E1', fontWeight: '700', fontSize: 13 },
  classTabTextActive: { color: '#0F172A' },

  sectionHeader: { backgroundColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 10 },
  sectionHeaderTitle: { fontSize: 13, fontWeight: '900', color: '#64748B', textTransform: 'uppercase' },
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 4, padding: 15, borderRadius: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FACC15', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold' },
  studentInfo: { marginLeft: 15 },
  studentName: { fontSize: 16, fontWeight: '700' },
  studentReg: { fontSize: 12, color: '#94A3B8' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#64748B', textAlign: 'center', marginVertical: 15, fontSize: 16, fontWeight: '600' },
  retryBtn: { backgroundColor: '#0F172A', padding: 12, borderRadius: 10, marginTop: 15 },
  retryText: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 20 },
  emptySubtext: { fontSize: 14, color: '#94A3B8', marginTop: 10, textAlign: 'center' },
  loadingText: { marginTop: 10, color: '#64748B' }
});