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
  ImageBackground,
  TouchableWithoutFeedback
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
import { ThemedText } from '@/components/themed-text';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';
import Footer from '../app/components/Footer';

const { width } = Dimensions.get('window');
const IS_TINY = width < 320;
const IS_SMALL = width < 375;

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
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [emailForTemplate, setEmailForTemplate] = useState('');
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState(false);

  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  useEffect(() => {
    if (!downloadModalVisible) {
      setTemplateError(null);
      setTemplateSuccess(false);
    }
  }, [downloadModalVisible]);

  useEffect(() => {
    if (!modalVisible) {
      setEnrollError(null);
      setEnrollSuccess(false);
    }
  }, [modalVisible]);

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

  const handleDownloadTemplate = () => {
    setDownloadModalVisible(true);
  };

  const processLocalDownload = async () => {
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
      setDownloadModalVisible(false);
    } catch (e) {
      console.error(e);
      setStatusAlert({ visible: true, type: 'error', title: 'Download Error', message: 'Could not generate sample bulk data.' });
    }
  };

  const handleSendTemplateToEmail = async () => {
    try {
      setSendingTemplate(true);
      setTemplateError(null);
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/students/email/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: emailForTemplate.trim() }),
      });

      if (!response.ok) {
        const text = await response.text();
        // If the server returns HTML (e.g. 404 Cannot POST or 500 Stack Trace), extract the message or show raw text
        if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
          const match = text.match(/<pre>(.*?)<\/pre>/is) || text.match(/<title>(.*?)<\/title>/is);
          const htmlError = match ? match[1].trim() : text.substring(0, 100);
          throw new Error(`Server Error (${response.status}): ${htmlError}`);
        }
        
        // If it's JSON, parse it and extract the error
        try {
          const json = JSON.parse(text);
          throw new Error(json.error || json.message || `Server Error (${response.status})`);
        } catch(parseErr) {
          throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}`);
        }
      }

      const json = await response.json();
      if (json.success) {
        setTemplateSuccess(true);
        setEmailForTemplate('');
      } else {
        throw new Error(json.message || 'Server failed to dispatch email');
      }
    } catch (e: any) {
      console.log("Dispatch Template Error Details:", e);
      setTemplateError(e.message || 'Unable to connect to the server. Check if backend is running.');
    } finally {
      setSendingTemplate(false);
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
    <TouchableOpacity 
      style={[styles.studentCard, IS_TINY && styles.studentCardTiny]} 
      onPress={() => openEdit(item)}
    >
      <View style={[styles.cardHeader, IS_TINY && styles.cardHeaderTiny]}>
        <View style={styles.avatarContainer}>
          <ThemedText style={styles.avatarText}>
            {(item.first_name?.[0] || '') + (item.last_name?.[0] || '')}
          </ThemedText>
        </View>
        <View style={styles.studentInfo}>
          <ThemedText style={styles.studentName} numberOfLines={1}>
            {item.first_name} {item.last_name}
          </ThemedText>
          <View style={styles.metaRow}>
            <ThemedText style={styles.studentSub}>{item.registration_number || 'REG: N/A'}</ThemedText>
          </View>
        </View>
        {!IS_TINY && <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />}
      </View>
      
      {IS_TINY && (
        <View style={styles.tinyMeta}>
          <ThemedText style={styles.studentEmail} numberOfLines={1}>{item.email || 'No email'}</ThemedText>
          <ThemedText style={styles.studentSub}>{item.gender || 'N/A'}</ThemedText>
        </View>
      )}

      {!IS_TINY && (
        <ThemedText style={styles.studentEmail}>{item.email || 'No email attached'}</ThemedText>
      )}
    </TouchableOpacity>
  );

  if (loading) return (
    <ThemedView style={styles.loader}>
      <ActivityIndicator size="large" color={Colors.accent.gold} />
      <ThemedText style={styles.loadingText}>SYNCHRONIZING RECORDS...</ThemedText>
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
              <Ionicons name="chevron-back" size={24} color={C.text} />
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
            <ThemedText style={styles.heroSubtitle}>STUDENT DIRECTORY</ThemedText>
            <ThemedText style={styles.heroMainTitle}>Record Registry</ThemedText>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            placeholder="Search registry..."
            style={styles.searchInput}
            placeholderTextColor={C.textMuted}
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

      {/* Template Download / Email Modal */}
      <Modal
        visible={downloadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDownloadModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setDownloadModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.downloadSheet}>
              <View style={styles.sheetHandle} />
              
              {templateSuccess ? (
                <View style={styles.successScreen}>
                  <View style={styles.successIconOuter}>
                    <Ionicons name="checkmark-done-circle" size={60} color="#10B981" />
                  </View>
                  <ThemedText style={styles.successTitle}>DISPATCH SUCCESS</ThemedText>
                  <ThemedText style={styles.successText}>The bulk enrollment template is on its way to your inbox.</ThemedText>
                  <TouchableOpacity style={styles.doneBtn} onPress={() => setDownloadModalVisible(false)}>
                    <ThemedText style={styles.doneBtnText}>Return to Registry</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <ThemedText style={styles.sheetTitle}>Template Studio</ThemedText>
                  <ThemedText style={styles.sheetSubtitle}>Get the bulk student enrollment template</ThemedText>

                  {templateError && (
                    <View style={styles.modalErrorBanner}>
                      <Ionicons name="alert-circle" size={18} color="#fff" />
                      <ThemedText style={styles.modalErrorText}>{templateError}</ThemedText>
                    </View>
                  )}

                  <View style={styles.emailOption}>
                    <ThemedText style={styles.fieldLabel}>SEND VIA EMAIL</ThemedText>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={20} color={C.textMuted} style={styles.inputIconInline} />
                      <TextInput
                        style={styles.emailInput}
                        placeholder="Enter recipient email..."
                        placeholderTextColor={C.textMuted}
                        value={emailForTemplate}
                        onChangeText={setEmailForTemplate}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    <TouchableOpacity 
                      style={[styles.sendBtn, sendingTemplate && { opacity: 0.7 }]} 
                      onPress={handleSendTemplateToEmail}
                      disabled={sendingTemplate}
                    >
                      {sendingTemplate ? (
                        <ActivityIndicator size="small" color={Colors.accent.navy} />
                      ) : (
                        <>
                          <Ionicons name="send" size={16} color={Colors.accent.navy} />
                          <ThemedText style={styles.sendBtnText}>DISPATCH TEMPLATE</ThemedText>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dividerRow}>
                    <View style={styles.line} />
                    <ThemedText style={styles.dividerText}>OR</ThemedText>
                    <View style={styles.line} />
                  </View>

                  <TouchableOpacity style={styles.localDownloadBtn} onPress={processLocalDownload}>
                    <Ionicons name="download-outline" size={20} color={Colors.accent.gold} />
                    <ThemedText style={styles.localDownloadBtnText}>Download to Device</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelSheetBtn} onPress={() => setDownloadModalVisible(false)}>
                    <ThemedText style={styles.cancelSheetText}>Close</ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Global Status Alert (for bulk uploads, refreshes, etc) */}
      {!modalVisible && renderAlert()}

      <Modal 
        animationType="fade" 
        transparent={true} 
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={[C.isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', C.isDark ? 'rgba(30, 41, 59, 0.98)' : 'rgba(241, 245, 249, 0.98)']}
            style={styles.modalSheet}
          >
            {/* Modal Status Alert (for individual enrollment errors) */}
            <View style={styles.modalHeader}>
              <View>
                <ThemedText style={styles.modalTitle}>{editingId ? 'Modify Record' : 'Enroll Student'}</ThemedText>
                <ThemedText style={styles.modalSubtitle}>System-level database entry</ThemedText>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.accent.gold} />
              </TouchableOpacity>
            </View>

            {enrollError && (
              <View style={styles.modalErrorBanner}>
                <Ionicons name="alert-circle" size={18} color="#fff" />
                <ThemedText style={styles.modalErrorText}>{enrollError}</ThemedText>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>

              {!editingId && (
                <View style={styles.formSection}>
                  <ThemedText style={styles.sectionLabel}>CLASSES</ThemedText>
                  
                  <View style={styles.inputWrapper}>
                    {form.classId && !isClassListOpen ? (
                      <TouchableOpacity 
                        style={styles.selectedClassChip} 
                        onPress={() => { setIsClassListOpen(true); setClassSearchQuery(''); }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="school" size={16} color={Colors.accent.gold} style={{ marginRight: 8 }} />
                          <ThemedText style={styles.selectedClassChipText}>
                            {classes.find(c => c.id === form.classId)?.display_name}
                          </ThemedText>
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
                                <ThemedText style={[styles.classListText, form.classId === c.id && styles.activeClassListText]}>
                                  {c.display_name}
                                </ThemedText>
                              </View>
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.formSection}>
                <ThemedText style={styles.sectionLabel}>PERSONAL INFORMATION</ThemedText>
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
                      <ThemedText style={[styles.genderBtnText, form.gender === g && styles.activeGenderBtnText]}>{g}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <ThemedText style={styles.sectionLabel}>COMMUNICATION & LOGISTICS</ThemedText>
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
                  <ThemedText style={[styles.sectionLabel, { marginBottom: 0 }]}>DATE OF BIRTH</ThemedText>
                  {(dobParts.year && dobParts.month && dobParts.day) ? (
                    <ThemedText style={{ color: Colors.accent.gold, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>
                      {dobParts.year}-{dobParts.month}-{dobParts.day}
                    </ThemedText>
                  ) : form.dateOfBirth ? (
                    <ThemedText style={{ color: Colors.accent.gold, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>
                      {String(form.dateOfBirth).split('T')[0]}
                    </ThemedText>
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
          <ThemedText style={styles.dobLabel}>{label}</ThemedText>
          <ScrollView style={styles.dobList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {data.map((item: any) => (
              <TouchableOpacity
                key={item}
                style={[styles.dobItem, selected === item && styles.activeDobItem]}
                onPress={() => onSelect(item)}
              >
                <ThemedText style={[styles.dobItemText, selected === item && styles.activeDobItemText]}>{item}</ThemedText>
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
        setEnrollSuccess(true);
        setEnrollError(null);
        setTimeout(() => {
          setModalVisible(false);
          fetchInitialData();
        }, 1500);
      } else {
        const errorMsg = json.error || json.message || 'Server rejected the request.';
        throw new Error(errorMsg);
      }
    } catch (e: any) {
      setEnrollError(e?.message || 'Session timed out or connection lost.');
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

    hero: { height: IS_TINY ? 200 : 260, width: '100%' },
    heroOverlay: { 
      flex: 1, 
      paddingHorizontal: IS_TINY ? 16 : 24, 
      paddingTop: Platform.OS === 'ios' ? (IS_TINY ? 40 : 60) : 40 
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: IS_TINY ? 15 : 30 },
    backButton: { 
      width: IS_TINY ? 36 : 44, 
      height: IS_TINY ? 36 : 44, 
      borderRadius: 12, 
      backgroundColor: C.backButton, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: IS_TINY ? 8 : 12 },
    actionIcon: { 
      width: IS_TINY ? 36 : 44, 
      height: IS_TINY ? 36 : 44, 
      borderRadius: 12, 
      backgroundColor: C.backButton, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    addButton: { 
      width: IS_TINY ? 36 : 44, 
      height: IS_TINY ? 36 : 44, 
      borderRadius: 12, 
      backgroundColor: Colors.accent.gold, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },

    heroContent: { marginTop: 'auto', marginBottom: IS_TINY ? 15 : 20 },
    heroSubtitle: { color: Colors.accent.gold, fontSize: IS_TINY ? 9 : 11, fontWeight: '800', letterSpacing: 2, marginBottom: 2 },
    heroMainTitle: { 
      color: C.isDark ? '#FFFFFF' : '#0F172A', 
      fontSize: IS_TINY ? 24 : 32, 
      fontWeight: '900', 
      letterSpacing: -1 
    },

    searchSection: { paddingHorizontal: IS_TINY ? 16 : 24, marginTop: IS_TINY ? -5 : -10, marginBottom: 20 },
    searchContainer: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: C.inputBg, 
      borderRadius: 20, 
      paddingHorizontal: 16, 
      height: IS_TINY ? 44 : 50, 
      borderWidth: 1, 
      borderColor: C.inputBorder 
    },
    searchIcon: { marginRight: 12 },
    searchInput: { flex: 1, color: C.inputText, fontSize: IS_TINY ? 12 : 14, fontWeight: '600' },

    listContent: { paddingHorizontal: IS_TINY ? 16 : 24, paddingBottom: 100 },
    studentCard: { 
      backgroundColor: C.card, 
      borderRadius: 24, 
      padding: 16, 
      marginBottom: 12, 
      borderWidth: 1, 
      borderColor: C.cardBorder 
    },
    studentCardTiny: { padding: 12, borderRadius: 18 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    cardHeaderTiny: { marginBottom: 8 },
    
    avatarContainer: { 
      width: IS_TINY ? 40 : 50, 
      height: IS_TINY ? 40 : 50, 
      borderRadius: IS_TINY ? 12 : 16, 
      backgroundColor: C.isDark ? 'rgba(255,255,255,0.05)' : '#E8EEF4', 
      justifyContent: 'center', 
      alignItems: 'center', 
      borderWidth: 1, 
      borderColor: Colors.accent.gold 
    },
    avatarText: { color: Colors.accent.gold, fontSize: IS_TINY ? 14 : 16, fontWeight: '800' },
    studentInfo: { flex: 1, marginLeft: IS_TINY ? 12 : 16 },
    studentName: { fontSize: IS_TINY ? 14 : 16, fontWeight: '800', color: C.text, marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    studentSub: { fontSize: IS_TINY ? 10 : 12, color: C.textSecondary, fontWeight: '600' },
    tinyMeta: { 
      paddingTop: 8, 
      borderTopWidth: 1, 
      borderTopColor: C.divider,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    metaDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.divider },
    studentEmail: { fontSize: IS_TINY ? 10 : 11, color: C.textMuted, fontWeight: '500' },
    alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalOverlay: { flex: 1, backgroundColor: C.modalOverlay, justifyContent: 'flex-end' },
    modalSheet: { height: '90%', borderTopLeftRadius: IS_TINY ? 30 : 40, borderTopRightRadius: IS_TINY ? 30 : 40, padding: IS_TINY ? 16 : 24 },
    downloadSheet: { 
      backgroundColor: C.modalBg, 
      borderTopLeftRadius: 32, 
      borderTopRightRadius: 32, 
      padding: IS_TINY ? 16 : 24, 
      borderTopWidth: 1, 
      borderColor: C.cardBorder, 
      width: '100%' 
    },
    sheetHandle: { width: 40, height: 4, backgroundColor: C.divider, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    sheetTitle: { color: C.text, fontSize: IS_TINY ? 18 : 20, fontWeight: '900', textAlign: 'center' },
    sheetSubtitle: { color: C.textSecondary, fontSize: IS_TINY ? 11 : 13, textAlign: 'center', marginBottom: 25, marginTop: 4 },
    
    emailOption: { gap: 10 },
    fieldLabel: { color: C.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    inputContainer: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: C.inputBg, 
      borderRadius: 16, 
      paddingHorizontal: 16, 
      height: IS_TINY ? 46 : 52, 
      borderWidth: 1, 
      borderColor: C.inputBorder 
    },
    inputIconInline: { marginRight: 12 },
    emailInput: { flex: 1, color: C.text, fontSize: IS_TINY ? 13 : 15, fontWeight: '600' },
    sendBtn: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: Colors.accent.gold, 
      borderRadius: 16, 
      height: IS_TINY ? 46 : 52, 
      gap: 10 
    },
    sendBtnText: { color: Colors.accent.navy, fontSize: IS_TINY ? 12 : 13, fontWeight: '800' },

    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginVertical: IS_TINY ? 20 : 30 },
    line: { flex: 1, height: 1, backgroundColor: C.divider },
    dividerText: { color: C.textMuted, fontSize: 11, fontWeight: '800' },

    localDownloadBtn: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: IS_TINY ? 46 : 52, 
      borderRadius: 16, 
      borderWidth: 1, 
      borderColor: Colors.accent.gold, 
      gap: 10 
    },
    localDownloadBtnText: { color: Colors.accent.gold, fontSize: IS_TINY ? 12 : 14, fontWeight: '700' },
    
    cancelSheetBtn: { alignItems: 'center', marginTop: 24, paddingBottom: 10 },
    cancelSheetText: { color: C.textMuted, fontSize: 14, fontWeight: '600' },

    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: IS_TINY ? 20 : 32 },
    modalTitle: { color: C.text, fontSize: IS_TINY ? 20 : 24, fontWeight: '900', letterSpacing: -0.5 },
    modalSubtitle: { color: Colors.accent.gold, fontSize: IS_TINY ? 10 : 12, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.actionItemBg, justifyContent: 'center', alignItems: 'center' },

    modalScroll: { paddingBottom: 60 },
    formSection: { marginBottom: IS_TINY ? 20 : 32 },
    sectionLabel: { color: C.textLabel, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },

    classListContainer: { height: 160, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden' },
    classListScroll: { flex: 1 },
    classListContent: { padding: 4 },
    classListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, marginBottom: 4, backgroundColor: 'transparent' },
    activeClassListItem: { backgroundColor: 'rgba(250,204,21,0.2)', borderColor: 'rgba(250,204,21,0.4)', borderWidth: 1 },
    classListSelection: { flexDirection: 'row', alignItems: 'center' },
    classListText: { color: C.textSecondary, fontSize: 12, fontWeight: '700', marginLeft: 12 },
    activeClassListText: { color: C.text, fontWeight: '900' },

    inputWrapper: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: C.inputBg, 
      borderRadius: 16, 
      paddingHorizontal: 16, 
      height: IS_TINY ? 48 : 55, 
      marginBottom: 10, 
      borderWidth: 1, 
      borderColor: C.inputBorder 
    },
    inputIcon: { marginRight: 12 },
    formInput: { flex: 1, color: C.inputText, fontSize: IS_TINY ? 13 : 14, fontWeight: '600' },

    selectedClassChip: { backgroundColor: 'rgba(250,204,21,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(250,204,21,0.3)', alignSelf: 'flex-start', marginBottom: 10 },
    selectedClassChipText: { color: Colors.accent.gold, fontSize: IS_TINY ? 12 : 14, fontWeight: '800', marginRight: 8 },
    chipCloseBtn: { padding: 2 },

    genderSelect: { flexDirection: 'row', gap: 10, marginTop: 4 },
    genderOption: { flex: 1, height: IS_TINY ? 44 : 50, borderRadius: 16, backgroundColor: C.inputBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.inputBorder },
    activeGender: { backgroundColor: C.isDark ? 'rgba(255,255,255,0.1)' : '#FEF9C3', borderColor: Colors.accent.gold },
    genderBtnText: { color: C.textMuted, fontSize: 13, fontWeight: '700' },
    activeGenderBtnText: { color: Colors.accent.gold },

    dobGrid: { flexDirection: 'row', gap: 8, height: 160 },
    dobColumn: { flex: 1 },
    dobLabel: { color: C.textMuted, fontSize: 9, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
    dobList: { flex: 1, backgroundColor: C.inputBg, borderRadius: 16, borderWidth: 1, borderColor: C.inputBorder },
    dobItem: { paddingVertical: 10, alignItems: 'center' },
    activeDobItem: { backgroundColor: C.isDark ? 'rgba(255,255,255,0.05)' : '#EFF6FF' },
    dobItemText: { color: C.textMuted, fontSize: 12, fontWeight: '600' },
    activeDobItemText: { color: Colors.accent.gold, fontWeight: '900' },

    modalActions: { marginTop: 10 },
    modalErrorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EF4444',
      padding: 12,
      borderRadius: 12,
      marginBottom: 20,
      gap: 10
    },
    modalErrorText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      flex: 1
    },
    successScreen: {
      alignItems: 'center',
      paddingVertical: 20
    },
    successIconOuter: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20
    },
    successTitle: {
      color: C.text,
      fontSize: 18,
      fontWeight: '900',
      marginBottom: 8
    },
    successText: {
      color: C.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 30,
      fontWeight: '600'
    },
    doneBtn: {
      backgroundColor: '#10B981',
      paddingHorizontal: 30,
      paddingVertical: 14,
      borderRadius: 16,
      width: '100%',
      alignItems: 'center'
    },
    doneBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800'
    }
  });
}