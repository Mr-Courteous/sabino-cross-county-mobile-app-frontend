import React, { useEffect, useState } from 'react';
import { 
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
  Share
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/utils/api-service';
import { useRouter } from 'expo-router';
import { clearAllStorage } from '@/utils/storage';
import Footer from '../app/components/Footer';

import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');
const rf = (size: number) => Math.round((size * width) / 375);

type Student = {
  id: string | number;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  registration_number?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
};

type Class = {
  id: number;
  display_name: string;
  capacity: number;
};

export default function StudentsManager() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicSessions, setAcademicSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Fully Restored Form State
  const [form, setForm] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    registrationNumber: '',
    gender: 'Male',
    dateOfBirth: '',
    classId: null,
    studentNumber: ''
  });
  const [dobParts, setDobParts] = useState({ year: '', month: '', day: '' });
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [academicSession, setAcademicSession] = useState<string>('');
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [searchText, setSearchText] = useState<string>('');

  useEffect(() => {
    fetchStudents();
    fetchClasses();
    fetchAcademicSessions();
  }, []);

  const getToken = async () => {
    if (Platform.OS !== 'web') return await SecureStore.getItemAsync('userToken');
    return localStorage.getItem('userToken');
  };

  async function fetchClasses() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setClasses(json.data);
      }
    } catch (e) {
      console.log('Error fetching classes:', e);
    }
  }

  async function fetchAcademicSessions() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/academic-sessions`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const sessions = json.data.map((s: any) => s.session_name || s.name);
        setAcademicSessions(sessions);
        if (sessions.length > 0) {
          setAcademicSession(sessions[0]);
        }
      }
    } catch (e) {
      console.log('Error fetching academic sessions:', e);
    }
  }

  async function fetchStudents() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) setStudents(json.data || []);
      console.log(json);
    } catch (e) {
      Alert.alert('Load Error', 'Unable to fetch students.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function downloadSampleCsv() {
    const SAMPLE_CSV = 'firstName,lastName,studentNumber,classId\nJohn,Doe,STU-001,1\nJane,Smith,STU-002,1';
    try {
      // Show sample format in alert
      Alert.alert('CSV Template', SAMPLE_CSV);
    } catch (e) {
      Alert.alert('Info', 'Sample CSV format:\nfirstName,lastName,studentNumber,classId');
    }
  }

  async function pickAndUploadFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/comma-separated-values', 'text/csv'],
      });
      console.log(result);
      if (result.canceled) return;
      const file = result.assets[0];
      
      setLoading(true);
      let content = '';
      if (Platform.OS === 'web') {
        content = await (file as any).file.text();
      } else {
        content = await FileSystem.readAsStringAsync(file.uri);
      }

      const rows = content.split('\n');
      const headers = rows[0].split(',').map(h => h.trim());
      const studentsPayload = rows.slice(1).filter(r => r.trim()).map(r => {
        const values = r.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return {
          firstName: obj.firstName || obj.first_name,
          lastName: obj.lastName || obj.last_name,
          email: obj.email || null,
          phone: obj.phone || null,
          dateOfBirth: obj.dateOfBirth || obj.date_of_birth || null,
          studentNumber: obj.studentNumber || obj.registration_number || null,
          classId: form.classId,
          gender: obj.gender || null
        };
      });

      const token = await getToken();
      const resp = await fetch(`${API_BASE_URL}/api/students/bulk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          students: studentsPayload,
          academicSession: academicSession
        })
      });
      const json = await resp.json();
      if (json.success) {
        Alert.alert('Success', `Created and enrolled ${studentsPayload.length} students`);
        fetchStudents();
      } else {
        Alert.alert('Error', json.error || 'Upload failed');
      }
    } catch (e) {
      Alert.alert('Upload Error', 'Check your file format and ensure all required fields are present.');
      console.log('Upload error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveStudent() {
    if (!form.firstName || !form.lastName) {
      Alert.alert('Required', 'First and Last name are required.');
      return;
    }

    if (!form.classId) {
      Alert.alert('Required', 'Please select a class.');
      return;
    }

    if (!academicSession) {
      Alert.alert('Required', 'Please select an academic session.');
      return;
    }

    // Construct Date of Birth from parts
    const { year, month, day } = dobParts;
    let finalDob = form.dateOfBirth;
    if (year && month && day) {
      finalDob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    setSaving(true);
    try {
      const token = await getToken();

      if (!editingId) {
        const resp = await fetch(`${API_BASE_URL}/api/students/bulk`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            students: [{
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email || null,
              phone: form.phone || null,
              dateOfBirth: finalDob || null,
              studentNumber: form.studentNumber || null,
              classId: form.classId,
              gender: form.gender || null
            }],
            academicSession: academicSession
          })
        });
        const json = await resp.json();
        if (json.success) {
          setModalVisible(false);
          setForm({ firstName: '', lastName: '', email: '', phone: '', registrationNumber: '', gender: 'Male', dateOfBirth: '', classId: null, studentNumber: '' });
          setDobParts({ year: '', month: '', day: '' });
          fetchStudents();
          Alert.alert('Success', 'Student created and enrolled successfully');
        } else {
          Alert.alert('Error', json.error || 'Failed to save student');
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/students/${editingId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, dateOfBirth: finalDob })
        });
        const json = await res.json();
        if (json.success) {
          setModalVisible(false);
          fetchStudents();
          Alert.alert('Success', 'Student updated successfully');
        } else {
          Alert.alert('Error', json.message || 'Update failed');
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed');
      console.log('Save error:', e);
    } finally {
      setSaving(false);
    }
  }

  const openEdit = (s: Student) => {
    let year = '', month = '', day = '';
    if (s.date_of_birth) {
        const dateOnly = s.date_of_birth.split('T')[0];
        const parts = dateOnly.split('-');
        year = parts[0] || '';
        month = parts[1] || '';
        day = parts[2] || '';
        if (month.length === 1) month = '0' + month;
        if (day.length === 1) day = '0' + day;
    }
    setDobParts({ year, month, day });

    setForm({
      firstName: s.first_name,
      lastName: s.last_name,
      email: s.email,
      registrationNumber: s.registration_number,
      phone: s.phone,
      gender: s.gender || 'Male',
      dateOfBirth: s.date_of_birth,
      classId: null,
      studentNumber: ''
    });
    setEditingId(s.id);
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: Student }) => (
    <View style={styles.studentCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{item.first_name} {item.last_name}</Text>
        <Text style={styles.studentSub}>{item.registration_number || 'No Reg'}</Text>
        <Text style={styles.studentMeta}>{item.email || 'No Email'}</Text>
        {item.date_of_birth && (
          <Text style={styles.studentMeta}>
            DOB: {(() => {
              const d = new Date(item.date_of_birth);
              return isNaN(d.getTime()) ? item.date_of_birth : d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
            })()}
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
        <Ionicons name="pencil" size={16} color="#0F172A" />
      </TouchableOpacity>
    </View>
  );

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => {
          await clearAllStorage();
          router.replace('/');
        }}
      ]
    );
  };

  const years = Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - 2 - i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={styles.header}>
        <Text style={styles.title}>Students</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.smallBtn} onPress={downloadSampleCsv}>
            <Ionicons name="download-outline" size={14} color="#0F172A" />
            <Text style={styles.smallBtnText}> Template</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#0F172A', marginLeft: 6 }]} onPress={pickAndUploadFile}>
            <Ionicons name="cloud-upload-outline" size={14} color="#FACC15" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addButton, { marginLeft: 6 }]} onPress={() => { setForm({gender: 'Male'}); setDobParts({year:'', month:'', day:''}); setEditingId(null); setModalVisible(true); }}>
            <Ionicons name="add" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={students.filter(s => {
          const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
          const regNum = (s.registration_number || '').toLowerCase();
          const email = (s.email || '').toLowerCase();
          const phone = (s.phone || '').toLowerCase();
          const search = searchText.toLowerCase();
          return fullName.includes(search) || regNum.includes(search) || email.includes(search) || phone.includes(search);
        })}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={fetchStudents}
        ListHeaderComponent={
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#94A3B8" />
            <TextInput placeholder="Search students..." style={styles.searchInput} placeholderTextColor="#94A3B8" value={searchText} onChangeText={setSearchText} />
          </View>
        }
      />

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Student' : 'Add New Student'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <View style={styles.selectContainer}>
                <Text style={styles.selectText}>Academic Session</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {academicSessions.map((s) => (
                    <TouchableOpacity key={s} style={[styles.sessionChip, academicSession === s && styles.activeSessionChip]} onPress={() => setAcademicSession(s)}>
                      <Text style={[styles.sessionChipText, academicSession === s && styles.activeSessionChipText]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {!editingId && (
                <View style={styles.selectContainer}>
                  <Text style={styles.selectText}>Target Class</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {classes.map((c) => (
                      <TouchableOpacity key={c.id} style={[styles.classChip, form.classId === c.id && styles.activeClassChip]} onPress={() => setForm({...form, classId: c.id})}>
                        <Text style={[styles.classChipText, form.classId === c.id && styles.activeClassChipText]}>{c.display_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.label}>FIRST NAME</Text>
              <TextInput style={styles.input} value={form.firstName} onChangeText={(t) => setForm({...form, firstName: t})} placeholder="e.g. John" />
              
              <Text style={styles.label}>LAST NAME</Text>
              <TextInput style={styles.input} value={form.lastName} onChangeText={(t) => setForm({...form, lastName: t})} placeholder="e.g. Doe" />
              
              <Text style={styles.label}>EMAIL ADDRESS (OPTIONAL)</Text>
              <TextInput style={styles.input} value={form.email} onChangeText={(t) => setForm({...form, email: t})} placeholder="john.doe@example.com" keyboardType="email-address" />
              
              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput style={styles.input} value={form.phone} onChangeText={(t) => setForm({...form, phone: t})} placeholder="e.g. +234..." keyboardType="phone-pad" />

              <Text style={styles.label}>GENDER</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female'].map((g) => (
                  <TouchableOpacity 
                    key={g}
                    style={[styles.genderBtn, form.gender === g && styles.activeGender]} 
                    onPress={() => setForm({...form, gender: g})}
                  >
                    <Text style={[styles.genderText, form.gender === g && styles.activeGenderText]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>DATE OF BIRTH (YEAR - MONTH - DAY)</Text>
              <View style={styles.dobRow}>
                <View style={styles.dobPart}>
                  <ScrollView style={styles.dobScroll} nestedScrollEnabled>
                    {years.map(y => (
                      <TouchableOpacity key={y} style={[styles.dobItem, dobParts.year === y && styles.activeDobItem]} onPress={() => setDobParts({...dobParts, year: y})}>
                        <Text style={[styles.dobItemText, dobParts.year === y && styles.activeDobItemText]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.dobPart}>
                  <ScrollView style={styles.dobScroll} nestedScrollEnabled>
                    {months.map(m => (
                      <TouchableOpacity key={m} style={[styles.dobItem, dobParts.month === m && styles.activeDobItem]} onPress={() => setDobParts({...dobParts, month: m})}>
                        <Text style={[styles.dobItemText, dobParts.month === m && styles.activeDobItemText]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.dobPart}>
                  <ScrollView style={styles.dobScroll} nestedScrollEnabled>
                    {days.map(d => (
                      <TouchableOpacity key={d} style={[styles.dobItem, dobParts.day === d && styles.activeDobItem]} onPress={() => setDobParts({...dobParts, day: d})}>
                        <Text style={[styles.dobItemText, dobParts.day === d && styles.activeDobItemText]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 25, marginBottom: 40 }}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F1F5F9' }]} onPress={() => setModalVisible(false)}>
                  <Text style={{ color: '#475569', fontWeight: '800' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#FACC15' }]} onPress={saveStudent} disabled={saving}>
                  {saving ? <ActivityIndicator color="#0F172A" /> : <Text style={{ color: '#0F172A', fontWeight: '900' }}>{editingId ? 'Update' : 'Save Student'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Footer onLogout={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingTop: 50, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  addButton: { backgroundColor: '#FACC15', padding: 8, borderRadius: 12, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 16, padding: 12, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { marginLeft: 8, flex: 1, fontSize: 14, color: '#0F172A' },
  
  studentCard: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  studentName: { fontSize: 15, fontWeight: '900', color: '#1E293B' },
  studentSub: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '600' },
  studentMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  
  iconBtn: { padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F1F5F9' },
  smallBtnText: { fontSize: 12, fontWeight: '900', color: '#0F172A' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20, color: '#0F172A', textAlign: 'center' },
  label: { fontSize: 11, fontWeight: '900', color: '#64748B', marginBottom: 8, marginTop: 15, letterSpacing: 1 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 15, borderRadius: 15, marginBottom: 10, fontSize: 14, color: '#0F172A' },
  
  selectContainer: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 15, borderRadius: 15, marginBottom: 10 },
  selectText: { fontSize: 14, color: '#0F172A', fontWeight: '600', marginBottom: 8 },
  
  sessionChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  activeSessionChip: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  sessionChipText: { fontSize: 12, color: '#0F172A', fontWeight: '600' },
  activeSessionChipText: { color: '#FACC15' },
  
  classChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  activeClassChip: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  classChipText: { fontSize: 12, color: '#0F172A', fontWeight: '600' },
  activeClassChipText: { color: '#fff' },
  
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  genderBtn: { flex: 1, padding: 15, borderRadius: 15, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  activeGender: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  genderText: { fontWeight: '800', color: '#64748B' },
  activeGenderText: { color: '#FACC15' },
  
  modalBtn: { flex: 1, padding: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  
  dobRow: { flexDirection: 'row', gap: 10, height: 150 },
  dobPart: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  dobScroll: { flex: 1 },
  dobItem: { paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  activeDobItem: { backgroundColor: '#FACC15' },
  dobItemText: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  activeDobItemText: { color: '#0F172A', fontWeight: '900' },
});