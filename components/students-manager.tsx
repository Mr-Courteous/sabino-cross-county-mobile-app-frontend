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
  RefreshControl,
  ImageBackground,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '@/utils/api-service';
import { clearAllStorage } from '@/utils/storage';
import { Colors } from '@/constants/design-system';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';
import Footer from '../app/components/Footer';
import BulkUploadModal from '@/components/bulk-upload-modal';

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
  const { width } = useWindowDimensions();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C, width), [C.scheme, width]);
  
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
  });
  const [dobParts, setDobParts] = useState({ year: '', month: '', day: '' });
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [activeSessionName, setActiveSessionName] = useState<string>('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [isClassListOpen, setIsClassListOpen] = useState<boolean>(false);
  const [classSearchQuery, setClassSearchQuery] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [emailForTemplate, setEmailForTemplate] = useState('');
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState(false);
  const [bulkUploadVisible, setBulkUploadVisible] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const getToken = async () => {
    return Platform.OS !== 'web' ? await SecureStore.getItemAsync('userToken') : localStorage.getItem('userToken');
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

      const [classData, studentData, sessionData] = await Promise.all([classRes.json(), studentRes.json(), sessionRes.json()]);

      if (classData.success) setClasses(classData.data);
      if (studentData.success) setStudents(studentData.data || []);
      if (sessionData.success && sessionData.data?.length > 0) {
        setSessions(sessionData.data);
        const active = sessionData.data.find((s: any) => s.is_active) || sessionData.data[0];
        setActiveSessionName(active.session_name);
      }
    } catch (e: any) {
      setStatusAlert({ visible: true, type: 'error', title: 'Error', message: 'Unable to sync records.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  const onRefresh = () => { setRefreshing(true); fetchInitialData(); };

  const handleSendTemplateToEmail = async () => {
    if (!emailForTemplate.includes('@')) return;
    try {
      setSendingTemplate(true);
      setTemplateError(null);
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/students/email/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: emailForTemplate.trim() }),
      });
      const json = await response.json();
      if (json.success) {
        setTemplateSuccess(true);
        setEmailForTemplate('');
      } else throw new Error(json.message || 'Dispatch failure');
    } catch (e: any) {
      setTemplateError(e.message || 'Server error.');
    } finally {
      setSendingTemplate(false);
    }
  };

  const saveStudent = async () => {
    if (!form.firstName || !form.lastName) return;
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
        setStatusAlert({ visible: true, type: 'success', title: editingId ? 'Updated!' : 'Enrolled!', message: `${form.firstName} ${form.lastName} has been ${editingId ? 'updated' : 'added'} successfully.` });
      } else throw new Error(json.error || 'Request rejected.');
    } catch (e: any) {
      setEnrollError(e?.message || 'Connection lost.');
      setStatusAlert({ visible: true, type: 'error', title: 'Failed', message: e?.message || 'Connection lost.' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (s: Student) => {
    let year = '', month = '', day = '';
    if (s.date_of_birth) {
      const parts = String(s.date_of_birth).split('T')[0].split('-');
      if (parts.length === 3) { year = parts[0]; month = parts[1]; day = parts[2]; }
    }
    setDobParts({ year, month, day });
    setForm({ firstName: s.first_name, lastName: s.last_name, email: s.email, registrationNumber: s.registration_number, phone: s.phone, gender: s.gender || 'Male', dateOfBirth: s.date_of_birth, classId: null });
    setEditingId(s.id);
    setEnrollError(null);
    setModalVisible(true);
  };

  const isTiny = width < 300;

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity style={styles.studentCard} onPress={() => openEdit(item)}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <ThemedText style={styles.avatarText}>{(item.first_name?.[0] || '') + (item.last_name?.[0] || '')}</ThemedText>
        </View>
        <View style={styles.studentInfo}>
          <ThemedText style={styles.studentName} numberOfLines={1}>{item.first_name} {item.last_name}</ThemedText>
          <ThemedText style={styles.studentSub}>{item.registration_number || 'No REG'}</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );

  if (loading) return (
    <ThemedView style={styles.loader}>
      <ActivityIndicator size="large" color={Colors.accent.gold} />
      <ThemedText style={styles.loadingText}>SYNCING...</ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.mainWrapper}>
      <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1577891913314-147eeaa99602?q=80&w=2069' }} style={styles.hero}>
        <LinearGradient colors={['rgba(15, 23, 42, 0.7)', Colors.accent.navy]} style={styles.heroOverlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={20} color={C.text} /></TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.actionIcon} onPress={() => setBulkUploadVisible(true)}><Ionicons name="cloud-upload-outline" size={18} color={Colors.accent.gold} /></TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={() => { setForm({ gender: 'Male' }); setDobParts({ year: '', month: '', day: '' }); setEditingId(null); setModalVisible(true); }}><Ionicons name="add" size={22} color={Colors.accent.navy} /></TouchableOpacity>
            </View>
          </View>
          <View style={styles.heroContent}>
            <ThemedText style={styles.heroSubtitle}>OAGS REGISTRY</ThemedText>
            <ThemedText style={styles.heroMainTitle}>Students</ThemedText>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput placeholder="Search..." style={styles.searchInput} placeholderTextColor={C.textMuted} value={searchText} onChangeText={setSearchText} />
        </View>
      </View>

      <FlatList
        data={students.filter(s => {
          const search = searchText.toLowerCase();
          return `${s.first_name} ${s.last_name}`.toLowerCase().includes(search) || (s.registration_number || '').toLowerCase().includes(search);
        })}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.listContent}
        renderItem={renderStudent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListFooterComponent={<Footer themeColor={Colors.accent.gold} onLogout={() => {}} />}
      />

      <BulkUploadModal visible={bulkUploadVisible} onClose={() => setBulkUploadVisible(false)} onUploadComplete={(res) => { setBulkUploadVisible(false); if (res.success) fetchInitialData(); }} />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <LinearGradient colors={[C.isDark ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)', C.card]} style={styles.modalSheet}>
            <>
              <View style={styles.modalHeader}>
                <View><ThemedText style={styles.modalTitle}>{editingId ? 'Edit Record' : 'Enrollment'}</ThemedText></View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}><Ionicons name="close" size={20} color={Colors.accent.gold} /></TouchableOpacity>
              </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <ThemedText style={styles.sectionLabel}>IDENTITY</ThemedText>
                <TextInput style={styles.formInput} value={form.firstName} onChangeText={(t) => setForm({ ...form, firstName: t })} placeholder="First Name" placeholderTextColor={C.textMuted} />
                <TextInput style={styles.formInput} value={form.lastName} onChangeText={(t) => setForm({ ...form, lastName: t })} placeholder="Last Name" placeholderTextColor={C.textMuted} />
                <View style={styles.genderSelect}>
                  {['Male', 'Female'].map(g => (
                    <TouchableOpacity key={g} style={[styles.genderOption, form.gender === g && styles.activeGender]} onPress={() => setForm({ ...form, gender: g })}>
                      <ThemedText style={[styles.genderText, form.gender === g && { color: Colors.accent.gold }]}>{g}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {!editingId && (
                <View style={styles.formSection}>
                  <ThemedText style={styles.sectionLabel}>ENROLLMENT</ThemedText>
                  
                  <ThemedText style={styles.formLabel}>CLASS</ThemedText>
                  <TouchableOpacity style={styles.inputSelector} onPress={() => setShowClassDropdown(!showClassDropdown)}>
                    <ThemedText style={styles.selectorText}>{classes.find(c => c.id === form.classId)?.display_name || 'Select Class'}</ThemedText>
                    <Ionicons name="chevron-down" size={18} color={Colors.accent.gold} />
                  </TouchableOpacity>
                  {showClassDropdown && (
                    <View style={styles.listBox}>
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                        {classes.map(c => (
                          <TouchableOpacity key={c.id} style={[styles.listItem, form.classId === c.id && styles.listItemActive]} onPress={() => { setForm({ ...form, classId: c.id }); setShowClassDropdown(false); }}>
                            <ThemedText style={[styles.listItemText, form.classId === c.id && { color: Colors.accent.gold, fontWeight: '800' }]}>{c.display_name}</ThemedText>
                            {form.classId === c.id && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <ThemedText style={styles.formLabel}>SESSION</ThemedText>
                  <TouchableOpacity style={styles.inputSelector} onPress={() => setShowSessionDropdown(!showSessionDropdown)}>
                    <ThemedText style={styles.selectorText}>{activeSessionName || 'Select Session'}</ThemedText>
                    <Ionicons name="chevron-down" size={18} color={Colors.accent.gold} />
                  </TouchableOpacity>
                  {showSessionDropdown && (
                    <View style={styles.listBox}>
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                        {sessions.map(s => (
                          <TouchableOpacity key={s.id} style={[styles.listItem, activeSessionName === s.session_name && styles.listItemActive]} onPress={() => { setActiveSessionName(s.session_name); setShowSessionDropdown(false); }}>
                            <ThemedText style={[styles.listItemText, activeSessionName === s.session_name && { color: Colors.accent.gold, fontWeight: '800' }]}>{s.session_name}</ThemedText>
                            {activeSessionName === s.session_name && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
              <View style={styles.formSection}>
                <ThemedText style={styles.sectionLabel}>CONTACT</ThemedText>
                <TextInput style={styles.formInput} value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} placeholder="Email" placeholderTextColor={C.textMuted} keyboardType="email-address" />
                <TextInput style={styles.formInput} value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} placeholder="Phone" placeholderTextColor={C.textMuted} keyboardType="phone-pad" />
              </View>
              <CustomButton title={saving ? "SAVING..." : "SAVE RECORD"} onPress={saveStudent} loading={saving} variant="premium" style={{ marginTop: 20 }} />
            </ScrollView>
            </>
          </LinearGradient>
        </View>
      </Modal>

      {statusAlert.visible && (
        <CustomAlert
          type={statusAlert.type}
          title={statusAlert.title}
          message={statusAlert.message}
          onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
        />
      )}
    </ThemedView>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>, width: number) {
  const isTiny = width < 300;
  return StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: C.background },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: Colors.accent.gold, marginTop: 10, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    hero: { height: isTiny ? 180 : 220, width: '100%' },
    heroOverlay: { flex: 1, paddingHorizontal: isTiny ? 16 : 24, paddingTop: Platform.OS === 'ios' ? 50 : 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
    addButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.accent.gold, justifyContent: 'center', alignItems: 'center' },
    actionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
    heroContent: { marginTop: 'auto', marginBottom: 16 },
    heroSubtitle: { color: Colors.accent.gold, fontSize: 9, fontWeight: '800', letterSpacing: 2 },
    heroMainTitle: { color: C.text, fontSize: isTiny ? 24 : 28, fontWeight: '900', letterSpacing: -1 },
    searchSection: { paddingHorizontal: isTiny ? 16 : 24, marginTop: -10, marginBottom: 16 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: C.inputBorder },
    searchInput: { flex: 1, color: C.inputText, fontSize: 13, fontWeight: '600' },
    listContent: { paddingHorizontal: isTiny ? 16 : 24, paddingBottom: 60 },
    studentCard: { backgroundColor: C.card, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.cardBorder },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.actionIconWrap, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.accent.gold },
    avatarText: { color: Colors.accent.gold, fontSize: 12, fontWeight: '800' },
    studentInfo: { flex: 1, marginLeft: 12 },
    studentName: { fontSize: 13, fontWeight: '800', color: C.text },
    studentSub: { fontSize: 10, color: C.textSecondary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
    modalSheet: { height: '85%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { color: C.text, fontSize: 18, fontWeight: '900' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.actionItemBg, justifyContent: 'center', alignItems: 'center' },
    formSection: { marginBottom: 22 },
    sectionLabel: { color: C.textLabel, fontSize: 9, fontWeight: '800', marginBottom: 8 },
    formInput: { backgroundColor: C.inputBg, borderRadius: 12, padding: 12, color: C.inputText, fontSize: 13, borderWidth: 1, borderColor: C.inputBorder, marginBottom: 10 },
    genderSelect: { flexDirection: 'row', gap: 10 },
    genderOption: { flex: 1, height: 40, borderRadius: 10, backgroundColor: C.inputBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.inputBorder },
    activeGender: { borderColor: Colors.accent.gold, backgroundColor: Colors.accent.gold + '10' },
    genderText: { color: C.textMuted, fontSize: 12, fontWeight: '700' },
    inputSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.inputBg, borderRadius: 12, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: C.inputBorder, marginBottom: 10 },
    selectorText: { color: C.inputText, fontSize: 13, fontWeight: '700' },
    listBox: { backgroundColor: C.inputBg, borderRadius: 12, borderWidth: 1, borderColor: C.inputBorder, overflow: 'hidden', marginBottom: 10 },
    listItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    listItemActive: { backgroundColor: Colors.accent.gold + '10' },
    listItemText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
    formLabel: { fontSize: 9, fontWeight: '800', color: C.textLabel, marginBottom: 6 },
  });
}