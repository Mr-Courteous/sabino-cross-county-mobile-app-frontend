import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, Alert, SafeAreaView // <--- ADDED THIS IMPORTFlatList
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';

const { width } = Dimensions.get('window');
// Adjusted scaling: Base font is now more stable
const rf = (size: number) => Math.round((size * width) / 410);

export default function RegisterStudent() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New enrollment-based fields
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    registrationNumber: '',
    gender: 'Male'
  });

  useEffect(() => {
    fetchClassesAndSessions();
    fetchStudents();
  }, []);

  const getToken = async () => {
    return Platform.OS !== 'web' 
      ? await SecureStore.getItemAsync('userToken') 
      : localStorage.getItem('userToken');
  };

  // Fetch classes and sessions for dropdowns
  const fetchClassesAndSessions = async () => {
    setLoadingFilters(true);
    try {
      const token = await getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [classRes, sessionRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/classes`, { headers }),
        fetch(`${API_BASE_URL}/api/academic-sessions`, { headers })
      ]);

      const classData = await classRes.json();
      const sessionData = await sessionRes.json();

      if (classData.success) {
        setClasses(classData.data);
        if (classData.data.length > 0) {
          setSelectedClass(classData.data[0].id);
        }
      }

      if (sessionData.success) {
        setSessions(sessionData.data);
        // Try to set active session, otherwise first one
        const activeSession = sessionData.data.find((s: any) => s.is_active);
        if (activeSession) {
          setSelectedSession(activeSession.id);
        } else if (sessionData.data.length > 0) {
          setSelectedSession(sessionData.data[0].id);
        }
      }
    } catch (e) {
      console.error("Error fetching filters:", e);
    } finally {
      setLoadingFilters(false);
    }
  };

  // READ - Fetch all students
  const fetchStudents = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setStudents(result.data);
    } catch (e) {
      console.error("Fetch error", e);
    }
  };

  // CREATE / UPDATE with enrollment transaction
  const handleSave = async () => {
    if (!form.firstName || !form.lastName) {
      Alert.alert("Error", "Names are required");
      return;
    }

    if (!selectedClass) {
      Alert.alert("Error", "Please select a class");
      return;
    }

    if (!selectedSession) {
      Alert.alert("Error", "Please select a session");
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();

      if (editingId) {
        // Update existing student (no enrollment changes in edit)
        const url = `${API_BASE_URL}/api/students/${editingId}`;
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(form)
        });

        const result = await response.json();
        if (result.success) {
          setForm({ firstName: '', lastName: '', email: '', registrationNumber: '', gender: 'Male' });
          setEditingId(null);
          fetchStudents();
          Alert.alert("Success", "Student updated successfully");
        } else {
          Alert.alert("Error", result.message || "Update failed");
        }
      } else {
        // Create new student WITH enrollment transaction
        const payload = {
          students: [
            {
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email || null,
              registrationNumber: form.registrationNumber || null,
              gender: form.gender || null,
              classId: selectedClass, // Required for auto-enrollment
              sessionId: selectedSession // Required, uses active session by default
            }
          ]
        };

        const response = await fetch(`${API_BASE_URL}/api/students/bulk`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
          // Backend returns { students, enrollments } from transaction
          console.log("Student created:", result.data.students);
          console.log("Enrollment created:", result.data.enrollments);
          
          setForm({ firstName: '', lastName: '', email: '', registrationNumber: '', gender: 'Male' });
          setEditingId(null);
          fetchStudents();
          Alert.alert("Success", "Student registered and enrolled successfully");
        } else {
          Alert.alert("Error", result.message || "Registration failed");
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Server update failed");
    } finally {
      setLoading(false);
    }
  };

  // DELETE
  const handleDelete = async (id: string) => {
    Alert.alert("Delete", "Remove this student?", [
      { text: "Cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
        const token = await getToken();
        await fetch(`${API_BASE_URL}/api/students/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchStudents(); // RELOAD
      }}
    ]);
  };

  const startEdit = (student: any) => {
    setEditingId(student.id);
    setForm({
      firstName: student.first_name,
      lastName: student.last_name,
      email: student.email || '',
      registrationNumber: student.registration_number || '',
      gender: student.gender || 'Male'
    });
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#F8FAFC'}}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={rf(20)} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.title}>{editingId ? 'Update Student' : 'Student Management'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* FILTERS SECTION */}
        {loadingFilters ? (
          <View style={styles.card}>
            <ActivityIndicator size="large" color="#FACC15" />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Select Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
              {classes.map((cls: any) => (
                <TouchableOpacity
                  key={cls.id}
                  style={[styles.filterChip, selectedClass === cls.id && styles.filterChipActive]}
                  onPress={() => setSelectedClass(cls.id)}
                >
                  <Text style={[styles.filterChipText, selectedClass === cls.id && styles.filterChipTextActive]}>
                    {cls.class_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Select Session</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
              {sessions.map((session: any) => (
                <TouchableOpacity
                  key={session.id}
                  style={[styles.filterChip, selectedSession === session.id && styles.filterChipActive]}
                  onPress={() => setSelectedSession(session.id)}
                >
                  <Text style={[styles.filterChipText, selectedSession === session.id && styles.filterChipTextActive]}>
                    {session.session_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* FORM SECTION */}
        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputRow}>
            <TextInput 
              style={[styles.input, {flex: 1, marginRight: 10}]} 
              placeholder="First" 
              value={form.firstName} 
              onChangeText={(t) => setForm({...form, firstName: t})} 
            />
            <TextInput 
              style={[styles.input, {flex: 1}]} 
              placeholder="Last" 
              value={form.lastName} 
              onChangeText={(t) => setForm({...form, lastName: t})} 
            />
          </View>

          <Text style={styles.label}>Registration Number</Text>
          <TextInput 
            style={styles.input} 
            placeholder="STU-001" 
            value={form.registrationNumber} 
            onChangeText={(t) => setForm({...form, registrationNumber: t})} 
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={loading || loadingFilters}>
            {loading ? <ActivityIndicator color="#0F172A" /> : (
              <Text style={styles.primaryBtnText}>{editingId ? 'UPDATE RECORD' : 'REGISTER & ENROLL'}</Text>
            )}
          </TouchableOpacity>
          
          {editingId && (
            <TouchableOpacity onPress={() => {setEditingId(null); setForm({firstName:'', lastName:'', email:'', registrationNumber:'', gender:'Male'})}}>
              <Text style={styles.cancelLink}>Cancel Editing</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* READ SECTION (The List) */}
        <Text style={styles.sectionTitle}>Recent Registrations</Text>
        {students.map((item: any) => (
          <View key={item.id} style={styles.studentItem}>
            <View>
              <Text style={styles.studentName}>{item.first_name} {item.last_name}</Text>
              <Text style={styles.studentSub}>{item.registration_number}</Text>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => startEdit(item)} style={styles.editBtn}>
                <Ionicons name="pencil" size={16} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.delBtn}>
                <Ionicons name="trash" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  backBtn: { padding: 10, backgroundColor: '#fff', borderRadius: 12, elevation: 2 },
  title: { fontSize: rf(18), fontWeight: '900', color: '#0F172A' },
  
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 25, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  label: { fontSize: rf(12), fontWeight: '700', color: '#64748B', marginBottom: 8, marginLeft: 5 },
  inputRow: { flexDirection: 'row' },
  input: { backgroundColor: '#F8FAFC', borderRadius: 15, padding: 15, fontSize: rf(14), color: '#0F172A', marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  
  primaryBtn: { backgroundColor: '#FACC15', borderRadius: 15, padding: 18, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { fontWeight: '900', color: '#0F172A', letterSpacing: 1, fontSize: rf(13) },
  cancelLink: { textAlign: 'center', marginTop: 15, color: '#EF4444', fontWeight: '700' },

  sectionTitle: { fontSize: rf(14), fontWeight: '900', color: '#1E293B', marginTop: 30, marginBottom: 15 },
  studentItem: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    backgroundColor: '#fff', padding: 15, borderRadius: 18, marginBottom: 10,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  studentName: { fontSize: rf(14), fontWeight: '700', color: '#0F172A' },
  studentSub: { fontSize: rf(11), color: '#64748B' },
  actionRow: { flexDirection: 'row', gap: 10 },
  editBtn: { padding: 8, backgroundColor: '#EFF6FF', borderRadius: 10 },
  delBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 10 },
  filterChip: { 
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#F1F5F9', marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0'
  },
  filterChipActive: { backgroundColor: '#FACC15', borderColor: '#FACC15' },
  filterChipText: { fontSize: rf(12), fontWeight: '700', color: '#64748B' },
  filterChipTextActive: { color: '#0F172A' }
});