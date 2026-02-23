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
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [academicSession, setAcademicSession] = useState<string>('');
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [searchText, setSearchText] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateForPicker, setSelectedDateForPicker] = useState<Date>(new Date());

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
      const res = await DocumentPicker.getDocumentAsync({ type: 'text/comma-separated-values' });
      if (res.canceled) return;

      if (!academicSession) {
        Alert.alert('Required', 'Please select an academic session first');
        return;
      }

      if (!form.classId) {
        Alert.alert('Required', 'Please select a class first');
        return;
      }

      setLoading(true);
      const content = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
      const header = lines[0].split(',').map(h => h.trim());
      
      const studentsPayload = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim());
        let obj: any = {};
        header.forEach((h, i) => obj[h] = cols[i] || null);
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

    setSaving(true);
    try {
      const token = await getToken();

      // Use bulk endpoint for adding new students (bulk endpoint requires classId and academicSession)
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
              dateOfBirth: form.dateOfBirth || null,
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
          fetchStudents();
          Alert.alert('Success', 'Student created and enrolled successfully');
        } else {
          Alert.alert('Error', json.error || 'Failed to save student');
        }
      } else {
        // Edit endpoint (if you have one for updating students)
        const res = await fetch(`${API_BASE_URL}/api/students/${editingId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
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
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        { text: 'Logout', onPress: async () => { await clearAllStorage(); router.replace('/'); }, style: 'destructive' }
      ]
    );
  };

  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(0);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

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
          <TouchableOpacity style={[styles.addButton, { marginLeft: 6 }]} onPress={() => { setForm({gender: 'Male'}); setEditingId(null); setModalVisible(true); }}>
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

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Student' : 'New Student'}</Text>
              
              <Text style={styles.label}>ACADEMIC SESSION *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowSessionDropdown(!showSessionDropdown)}
              >
                <Text style={styles.dropdownText}>{academicSession || 'Select session...'}</Text>
                <Ionicons name={showSessionDropdown ? "chevron-up" : "chevron-down"} size={20} color="#FACC15" />
              </TouchableOpacity>
              {showSessionDropdown && (
                <FlatList
                  data={academicSessions}
                  keyExtractor={(item) => item}
                  style={styles.dropdownMenu}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  renderItem={({item: session}) => (
                    <TouchableOpacity
                      style={[styles.dropdownItem, academicSession === session && styles.dropdownItemActive]}
                      onPress={() => {
                        setAcademicSession(session);
                        setShowSessionDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, academicSession === session && styles.dropdownItemTextActive]}>
                        {session}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              <Text style={styles.label}>CLASS *</Text>
              <View style={styles.selectContainer}>
                <Text style={styles.selectText}>{classes.find(c => c.id === form.classId)?.display_name || 'Select class...'}</Text>
                {classes.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {classes.map((cls) => (
                      <TouchableOpacity
                        key={cls.id}
                        style={[styles.classChip, form.classId === cls.id && styles.activeClassChip]}
                        onPress={() => setForm({ ...form, classId: cls.id })}
                      >
                        <Text style={[styles.classChipText, form.classId === cls.id && styles.activeClassChipText]}>
                          {cls.display_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
              
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput style={styles.input} placeholder="First Name" value={form.firstName} onChangeText={t => setForm({...form, firstName: t})} />
              <TextInput style={styles.input} placeholder="Last Name" value={form.lastName} onChangeText={t => setForm({...form, lastName: t})} />
              
              <Text style={styles.label}>CONTACT INFO</Text>
              <TextInput style={styles.input} placeholder="Email Address" keyboardType="email-address" value={form.email} onChangeText={t => setForm({...form, email: t})} />
              <TextInput style={styles.input} placeholder="Phone Number" keyboardType="phone-pad" value={form.phone} onChangeText={t => setForm({...form, phone: t})} />
              
              <Text style={styles.label}>ACADEMIC</Text>
              <TextInput style={styles.input} placeholder="Student Number" value={form.studentNumber} onChangeText={t => setForm({...form, studentNumber: t})} />
              
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

              <Text style={styles.label}>DATE OF BIRTH</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={18} color="#FACC15" />
                <Text style={styles.datePickerButtonText}>
                  {form.dateOfBirth ? form.dateOfBirth : 'Select date of birth'}
                </Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <View style={styles.calendarContainer}>
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => {
                      const newDate = new Date(selectedDateForPicker);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setSelectedDateForPicker(newDate);
                    }}>
                      <Ionicons name="chevron-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.calendarMonthYear}>
                      {selectedDateForPicker.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      const newDate = new Date(selectedDateForPicker);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setSelectedDateForPicker(newDate);
                    }}>
                      <Ionicons name="chevron-forward" size={24} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.calendarGrid}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <Text key={day} style={styles.calendarDayHeader}>{day}</Text>
                    ))}
                    {generateCalendarDays(selectedDateForPicker).map((day, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.calendarDay, 
                          day === 0 && styles.calendarDayEmpty,
                          day !== 0 && parseInt(form.dateOfBirth?.split('-')[2] || '') === day && styles.calendarDaySelected,
                          day !== 0 && styles.calendarDayActive
                        ]}
                        onPress={() => {
                          if (day !== 0) {
                            const year = selectedDateForPicker.getFullYear();
                            const month = String(selectedDateForPicker.getMonth() + 1).padStart(2, '0');
                            const dayStr = String(day).padStart(2, '0');
                            const dateStr = `${year}-${month}-${dayStr}`;
                            setForm({...form, dateOfBirth: dateStr});
                            setShowDatePicker(false);
                          }
                        }}
                      >
                        <Text style={[styles.calendarDayText, day === 0 && styles.calendarDayEmptyText, day !== 0 && parseInt(form.dateOfBirth?.split('-')[2] || '') === day && styles.calendarDaySelectedText]}>
                          {day === 0 ? '' : day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <TouchableOpacity
                    style={styles.calendarCloseBtn}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.calendarCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
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
  
  dropdown: { backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#0F172A', padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  dropdownMenu: { backgroundColor: '#0F172A', borderWidth: 0, borderRadius: 15, marginBottom: 10, maxHeight: 300, paddingVertical: 8 },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  dropdownItemActive: { backgroundColor: '#FACC15' },
  dropdownItemText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  dropdownItemTextActive: { fontWeight: '900', color: '#0F172A' },
  
  datePickerButton: { backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#FACC15', padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  datePickerButtonText: { fontSize: 14, color: '#0F172A', fontWeight: '600', flex: 1 },
  calendarContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 15, padding: 15, marginBottom: 10, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  calendarMonthYear: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDayHeader: { width: '14.28%', textAlign: 'center', fontWeight: '900', color: '#64748B', marginBottom: 10, fontSize: 12 },
  calendarDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  calendarDayActive: { borderRadius: 8, backgroundColor: '#F8FAFC' },
  calendarDayEmpty: {},
  calendarDaySelected: { backgroundColor: '#FACC15', borderRadius: 8 },
  calendarDayText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  calendarDayEmptyText: { color: 'transparent' },
  calendarDaySelectedText: { fontWeight: '900', color: '#0F172A' },
  calendarCloseBtn: { backgroundColor: '#0F172A', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  calendarCloseBtnText: { color: '#FACC15', fontWeight: '900', fontSize: 14 }
});