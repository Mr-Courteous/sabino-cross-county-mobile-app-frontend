import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  RefreshControl,
  ImageBackground
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '@/utils/api-service';
import { clearAllStorage } from '@/utils/storage';
import { Colors } from '@/constants/design-system';
import { ThemedView } from '@/components/themed-view';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';
import Footer from '../app/components/Footer';

const { width } = Dimensions.get('window');

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
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
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

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const [activeSessionName, setActiveSessionName] = useState<string>('');
  const [isClassListOpen, setIsClassListOpen] = useState<boolean>(false);
  const [classSearchQuery, setClassSearchQuery] = useState<string>('');

  const [searchText, setSearchText] = useState<string>('');

  const renderAlert = () => {
    if (!statusAlert.visible) return null;
    return (
      <CustomAlert
        type={statusAlert.type}
        title={statusAlert.title}
        message={statusAlert.message}
        onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
        onConfirm={statusAlert.onConfirm}
        confirmLabel={statusAlert.confirmLabel}
      />
    );
  };

  const getToken = async () => {
    return Platform.OS !== 'web'
      ? await SecureStore.getItemAsync('userToken')
      : localStorage.getItem('userToken');
  };

  const fetchInitialData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const [classRes, studentRes, sessionRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/classes`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/students`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/academic-sessions`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const [classData, studentData, sessionData] = await Promise.all([
        classRes.json(),
        studentRes.json(),
        sessionRes.json()
      ]);

      if (classData.success) setClasses(classData.data);
      if (studentData.success) setStudents(studentData.data || []);

      if (sessionData.success && sessionData.data?.length > 0) {
        const active = sessionData.data.find((s: any) => s.is_active) || sessionData.data[0];
        setActiveSessionName(active.session_name);
      }

    } catch (e: any) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'System Error',
        message: e?.message || 'Unable to synchronize student records.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInitialData();
  };

  const handleDownloadTemplate = async () => {
    try {
      const csvContent = "firstName,lastName,email,phone,dateOfBirth,classId,studentNumber,gender\nJohn,Doe,john@example.com,1234567890,2005-08-16,1,STU-001,Male";

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "student_bulk_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fileUri = `${FileSystem.documentDirectory}student_bulk_template.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: 'utf8' });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Sharing unavailable', 'Cannot process CSV locally.');
        }
      }
    } catch (e) {
      console.error(e);
      setStatusAlert({ visible: true, type: 'error', title: 'Download Error', message: 'Could not generate sample bulk data.' });
    }
  };

  const handlePickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/comma-separated-values', 'text/csv'],
      });
      if (result.canceled) return;
      const file = result.assets[0];

      setLoading(true);
      const token = await getToken();

      let text = '';
      if (Platform.OS === 'web') {
        text = await (file as any).file.text();
      } else {
        text = await FileSystem.readAsStringAsync(file.uri, { encoding: 'utf8' });
      }

      setStatusAlert({
        visible: true,
        type: 'info',
        title: 'Processing',
        message: 'Formatting bulk CSV payload...'
      });

      const sessionRes = await fetch(`${API_BASE_URL}/api/academic-sessions`, { headers: { Authorization: `Bearer ${token}` } });
      const sessionData = await sessionRes.json();
      let sessionName = '';
      if (sessionData.success && sessionData.data?.length > 0) {
        sessionName = sessionData.data.find((s: any) => s.is_active)?.session_name || sessionData.data[0].session_name;
      }

      if (!sessionName) throw new Error('No active academic session found on the server.');

      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) throw new Error('CSV is empty or missing data rows');

      const studentsArray = [];
      for (let i = 1; i < lines.length; i++) {
        const attrs = lines[i].split(',').map(a => a.trim());
        if (attrs.length >= 6) {
          studentsArray.push({
            firstName: attrs[0],
            lastName: attrs[1],
            email: attrs[2],
            phone: attrs[3],
            dateOfBirth: attrs[4],
            classId: Number(attrs[5]),
            studentNumber: attrs[6] || undefined,
            gender: attrs[7] || undefined,
          });
        }
      }

      const res = await fetch(`${API_BASE_URL}/api/students/bulk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsArray, academicSession: sessionName })
      });

      const json = await res.json();
      if (json.success) {
        fetchInitialData();
        setStatusAlert({ visible: true, type: 'success', title: 'Bulk Success', message: `Processed ${studentsArray.length} records successfully.` });
      } else {
        throw new Error(json.error || json.message || 'Server rejected bulk payload');
      }
    } catch (e: any) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Bulk Upload Failed',
        message: e?.message || 'Bulk synchronization failed.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setStatusAlert({
      visible: true,
      type: 'warning',
      title: 'Sign-out',
      message: 'Terminate administrative session?',
      confirmLabel: 'LOGOUT',
      onConfirm: async () => {
        await clearAllStorage();
        router.replace('/');
      }
    });
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity style={styles.studentCard} onPress={() => openEdit(item)}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {(item.first_name?.[0] || '') + (item.last_name?.[0] || '')}
        </Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.first_name} {item.last_name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.studentSub}>{item.registration_number || 'REG: N/A'}</Text>
          <View style={styles.metaDivider} />
          <Text style={styles.studentSub}>{item.gender || 'N/A'}</Text>
        </View>
        <Text style={styles.studentEmail}>{item.email || 'No email attached'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
    </TouchableOpacity>
  );

  if (loading) return (
    <ThemedView style={styles.loader}>
      <ActivityIndicator size="large" color={Colors.accent.gold} />
      <Text style={styles.loadingText}>SYNCHRONIZING RECORDS...</Text>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.mainWrapper}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1577891913314-147eeaa99602?q=80&w=2069&auto=format&fit=crop' }}
        style={styles.hero}
      >
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.7)', Colors.accent.navy]}
          style={styles.heroOverlay}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionIcon} onPress={handleDownloadTemplate}>
                <Ionicons name="cloud-download-outline" size={20} color={Colors.accent.gold} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon} onPress={handlePickAndUpload}>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.accent.gold} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => { setForm({ gender: 'Male' }); setDobParts({ year: '', month: '', day: '' }); setEditingId(null); setModalVisible(true); }}
              >
                <Ionicons name="add" size={24} color={Colors.accent.navy} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroSubtitle}>STUDENT DIRECTORY</Text>
            <Text style={styles.heroMainTitle}>Record Registry</Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            placeholder="Search registry..."
            style={styles.searchInput}
            placeholderTextColor="#64748B"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <FlatList
        data={students.filter(s => {
          const search = searchText.toLowerCase();
          return `${s.first_name} ${s.last_name}`.toLowerCase().includes(search) ||
            (s.registration_number || '').toLowerCase().includes(search);
        })}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.listContent}
        renderItem={renderStudent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListFooterComponent={<Footer themeColor={Colors.accent.gold} onLogout={handleLogout} />}
      />

      {/* Global Status Alert (for bulk uploads, refreshes, etc) */}
      {!modalVisible && renderAlert()}

      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.95)', 'rgba(30, 41, 59, 0.98)']}
            style={styles.modalSheet}
          >
            {/* Modal Status Alert (for individual enrollment errors) */}
            {renderAlert()}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingId ? 'Modify Record' : 'Enroll Student'}</Text>
                <Text style={styles.modalSubtitle}>System-level database entry</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>

              {!editingId && (
                <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>CLASSES</Text>
                  
                  <View style={styles.inputWrapper}>
                    {form.classId && !isClassListOpen ? (
                      <TouchableOpacity 
                        style={styles.selectedClassChip} 
                        onPress={() => { setIsClassListOpen(true); setClassSearchQuery(''); }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="school" size={16} color={Colors.accent.gold} style={{ marginRight: 8 }} />
                          <Text style={styles.selectedClassChipText}>
                            {classes.find(c => c.id === form.classId)?.display_name}
                          </Text>
                          <TouchableOpacity 
                            onPress={(e) => { 
                              e.stopPropagation();
                              setForm({ ...form, classId: null }); 
                              setIsClassListOpen(true); 
                            }}
                            style={styles.chipCloseBtn}
                          >
                            <Ionicons name="close-circle" size={18} color={Colors.accent.gold} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                        <TextInput
                          style={styles.formInput}
                          placeholder="Search and select class..."
                          placeholderTextColor="#64748B"
                          value={classSearchQuery}
                          onChangeText={(t) => {
                            setClassSearchQuery(t);
                            setIsClassListOpen(true);
                          }}
                          onFocus={() => setIsClassListOpen(true)}
                        />
                      </>
                    )}
                  </View>

                  {(isClassListOpen || !form.classId) && (
                    <View style={styles.classListContainer}>
                      <ScrollView 
                        nestedScrollEnabled 
                        style={styles.classListScroll}
                        contentContainerStyle={styles.classListContent}
                      >
                        {classes
                          .filter((c: any) => c.display_name.toLowerCase().includes(classSearchQuery.toLowerCase()))
                          .map((c: any) => (
                            <TouchableOpacity
                              key={c.id}
                              style={[styles.classListItem, form.classId === c.id && styles.activeClassListItem]}
                              onPress={() => {
                                setForm({ ...form, classId: c.id });
                                setIsClassListOpen(false);
                                setClassSearchQuery('');
                              }}
                            >
                              <View style={styles.classListSelection}>
                                <Ionicons 
                                  name={form.classId === c.id ? "radio-button-on" : "radio-button-off"} 
                                  size={18} 
                                  color={form.classId === c.id ? Colors.accent.gold : "rgba(255,255,255,0.2)"} 
                                />
                                <Text style={[styles.classListText, form.classId === c.id && styles.activeClassListText]}>
                                  {c.display_name}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color={Colors.accent.gold} style={styles.inputIcon} />
                  <TextInput
                    style={styles.formInput}
                    value={form.firstName}
                    onChangeText={(t) => setForm({ ...form, firstName: t })}
                    placeholder="First Name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color={Colors.accent.gold} style={styles.inputIcon} />
                  <TextInput
                    style={styles.formInput}
                    value={form.lastName}
                    onChangeText={(t) => setForm({ ...form, lastName: t })}
                    placeholder="Last Name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                <View style={styles.genderSelect}>
                  {['Male', 'Female'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderOption, form.gender === g && styles.activeGender]}
                      onPress={() => setForm({ ...form, gender: g })}
                    >
                      <Text style={[styles.genderBtnText, form.gender === g && styles.activeGenderBtnText]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>COMMUNICATION & LOGISTICS</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={Colors.accent.gold} style={styles.inputIcon} />
                  <TextInput
                    style={styles.formInput}
                    value={form.email}
                    onChangeText={(t) => setForm({ ...form, email: t })}
                    placeholder="Email Address"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={18} color={Colors.accent.gold} style={styles.inputIcon} />
                  <TextInput
                    style={styles.formInput}
                    value={form.phone}
                    onChangeText={(t) => setForm({ ...form, phone: t })}
                    placeholder="Direct Link / Phone"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>DATE OF BIRTH</Text>
                  {(dobParts.year && dobParts.month && dobParts.day) ? (
                    <Text style={{ color: Colors.accent.gold, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>
                      {dobParts.year}-{dobParts.month}-{dobParts.day}
                    </Text>
                  ) : form.dateOfBirth ? (
                    <Text style={{ color: Colors.accent.gold, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>
                      {String(form.dateOfBirth).split('T')[0]}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.dobGrid}>
                  <DobPicker data={years} selected={dobParts.year} onSelect={(y: any) => setDobParts({ ...dobParts, year: y })} label="Year" />
                  <DobPicker data={months} selected={dobParts.month} onSelect={(m: any) => setDobParts({ ...dobParts, month: m })} label="Month" />
                  <DobPicker data={days} selected={dobParts.day} onSelect={(d: any) => setDobParts({ ...dobParts, day: d })} label="Day" />
                </View>
              </View>

              <View style={styles.modalActions}>
                <CustomButton
                  title={saving ? "SECURELY SAVING..." : "REGISTER STUDENT"}
                  onPress={saveStudent}
                  loading={saving}
                  icon={<Ionicons name="shield-checkmark-outline" size={20} color={Colors.accent.navy} style={{ marginRight: 10 }} />}
                />
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>
    </ThemedView>
  );

    function DobPicker({ data, selected, onSelect, label }: any) {
      return (
        <View style={styles.dobColumn}>
          <Text style={styles.dobLabel}>{label}</Text>
          <ScrollView style={styles.dobList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {data.map((item: any) => (
              <TouchableOpacity
                key={item}
                style={[styles.dobItem, selected === item && styles.activeDobItem]}
                onPress={() => onSelect(item)}
              >
                <Text style={[styles.dobItemText, selected === item && styles.activeDobItemText]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

  async function saveStudent() {
    if (!form.firstName || !form.lastName) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Identity attributes are mandatory.'
      });
      return;
    }
    if (!form.classId && !editingId) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Allocation Error',
        message: 'Student must be assigned to a class.'
      });
      return;
    }

    const { year, month, day } = dobParts;
    let finalDob = form.dateOfBirth;
    if (year && month && day) finalDob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    setSaving(true);
    try {
      const token = await getToken();
      const method = editingId ? 'PUT' : 'POST';
      const endpoint = editingId ? `/api/students/${editingId}` : `/api/students/bulk`;
      const body = editingId
        ? JSON.stringify({ ...form, dateOfBirth: finalDob })
        : JSON.stringify({ students: [{ ...form, dateOfBirth: finalDob }], academicSession: activeSessionName });

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body
      });
      const json = await res.json();
      if (json.success) {
        setModalVisible(false);
        fetchInitialData();
        setStatusAlert({
          visible: true,
          type: 'success',
          title: 'Registry Success',
          message: 'Database synchronized successfully.'
        });
      } else {
        const errorMsg = json.error || json.message || 'Server rejected the request.';
        throw new Error(errorMsg);
      }
    } catch (e: any) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Error',
        message: e?.message || 'Session timed out or connection lost.'
      });
    } finally {
      setSaving(false);
    }
  }

  function openEdit(s: Student) {
    let year = '', month = '', day = '';
    if (s.date_of_birth) {
      try {
        const d = new Date(s.date_of_birth);
        if (!isNaN(d.getTime())) {
          year = String(d.getFullYear());
          month = String(d.getMonth() + 1).padStart(2, '0');
          day = String(d.getDate()).padStart(2, '0');
        } else {
          const parts = String(s.date_of_birth).split('T')[0].split('-');
          if (parts.length === 3) {
            year = parts[0];
            month = parts[1].padStart(2, '0');
            day = parts[2].padStart(2, '0');
          }
        }
      } catch (e) { }
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
      classId: null
    });
    setEditingId(s.id);
    setModalVisible(true);
  }
}


const years = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() - 2 - i));
const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
  return StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: C.background },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
    loadingText: { color: Colors.accent.gold, marginTop: 15, fontSize: 12, fontWeight: '800', letterSpacing: 2 },

    hero: { height: 260, width: '100%' },
    heroOverlay: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
    backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
    addButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.accent.gold, justifyContent: 'center', alignItems: 'center' },

    heroContent: { marginTop: 'auto', marginBottom: 20 },
    heroSubtitle: { color: Colors.accent.gold, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 2 },
    heroMainTitle: { color: C.isDark ? '#FFFFFF' : '#0F172A', fontSize: 32, fontWeight: '900', letterSpacing: -1 },

    searchSection: { paddingHorizontal: 24, marginTop: -25, marginBottom: 20 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 20, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: C.inputBorder },
    searchIcon: { marginRight: 12 },
    searchInput: { flex: 1, color: C.inputText, fontSize: 14, fontWeight: '600' },

    listContent: { paddingHorizontal: 24, paddingBottom: 100 },
    studentCard: { backgroundColor: C.card, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: C.cardBorder },
    avatarContainer: { width: 50, height: 50, borderRadius: 16, backgroundColor: C.isDark ? 'rgba(255,255,255,0.05)' : '#E8EEF4', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.accent.gold },
    avatarText: { color: Colors.accent.gold, fontSize: 16, fontWeight: '800' },
    studentInfo: { flex: 1, marginLeft: 16 },
    studentName: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    studentSub: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
    metaDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.divider },
    studentEmail: { fontSize: 11, color: C.textMuted, fontWeight: '500' },
    alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalOverlay: { flex: 1, backgroundColor: C.modalOverlay, justifyContent: 'flex-end' },
    modalSheet: { height: '90%', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
    modalTitle: { color: C.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    modalSubtitle: { color: Colors.accent.gold, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.actionItemBg, justifyContent: 'center', alignItems: 'center' },

    modalScroll: { paddingBottom: 60 },
    formSection: { marginBottom: 32 },
    sectionLabel: { color: C.textLabel, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 16 },

    classListContainer: { height: 200, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden' },
    classListScroll: { flex: 1 },
    classListContent: { padding: 4 },
    classListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginBottom: 4, backgroundColor: 'transparent' },
    activeClassListItem: { backgroundColor: 'rgba(250,204,21,0.2)', borderColor: 'rgba(250,204,21,0.4)', borderWidth: 1 },
    classListSelection: { flexDirection: 'row', alignItems: 'center' },
    classListText: { color: C.textSecondary, fontSize: 13, fontWeight: '700', marginLeft: 12 },
    activeClassListText: { color: C.text, fontWeight: '900' },

    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 16, paddingHorizontal: 16, height: 55, marginBottom: 12, borderWidth: 1, borderColor: C.inputBorder },
    inputIcon: { marginRight: 12 },
    formInput: { flex: 1, color: C.inputText, fontSize: 14, fontWeight: '600' },

    selectedClassChip: { backgroundColor: 'rgba(250,204,21,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(250,204,21,0.3)', alignSelf: 'flex-start' },
    selectedClassChipText: { color: Colors.accent.gold, fontSize: 14, fontWeight: '800', marginRight: 8 },
    chipCloseBtn: { padding: 2 },

    genderSelect: { flexDirection: 'row', gap: 12, marginTop: 8 },
    genderOption: { flex: 1, height: 50, borderRadius: 16, backgroundColor: C.inputBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.inputBorder },
    activeGender: { backgroundColor: C.isDark ? 'rgba(255,255,255,0.1)' : '#FEF9C3', borderColor: Colors.accent.gold },
    genderBtnText: { color: C.textMuted, fontSize: 14, fontWeight: '700' },
    activeGenderBtnText: { color: Colors.accent.gold },

    dobGrid: { flexDirection: 'row', gap: 12, height: 180 },
    dobColumn: { flex: 1 },
    dobLabel: { color: C.textMuted, fontSize: 10, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    dobList: { flex: 1, backgroundColor: C.inputBg, borderRadius: 16, borderWidth: 1, borderColor: C.inputBorder },
    dobItem: { paddingVertical: 12, alignItems: 'center' },
    activeDobItem: { backgroundColor: C.isDark ? 'rgba(255,255,255,0.05)' : '#EFF6FF' },
    dobItemText: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
    activeDobItemText: { color: Colors.accent.gold, fontWeight: '900' },

    modalActions: { marginTop: 10 },
  });
}