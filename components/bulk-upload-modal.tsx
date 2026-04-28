import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { API_BASE_URL } from '@/utils/api-service';
import { Colors } from '@/constants/design-system';
import { useAppColors } from '@/hooks/use-app-colors';
import { ThemedText } from '@/components/themed-text';

type ClassItem = { id: number; display_name: string; capacity?: number; };
type SessionItem = { id: number; session_name: string; year_label?: string; };
type UploadResult = { success: boolean; count?: number; error?: string; };
interface BulkUploadModalProps { visible: boolean; onClose: () => void; onUploadComplete: (result: UploadResult) => void; }

const getToken = async () => {
  return Platform.OS !== 'web' ? await SecureStore.getItemAsync('userToken') : localStorage.getItem('userToken');
};

function parseStudentCsv(text: string) {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error('CSV is empty.');
  const students: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const attrs = lines[i].split(',').map((a) => a.trim());
    if (attrs.length >= 2 && attrs[0] && attrs[1]) {
      students.push({ firstName: attrs[0], lastName: attrs[1], email: attrs[2] || undefined, phone: attrs[3] || undefined, dateOfBirth: attrs[4] || undefined, gender: attrs[5] || undefined, studentNumber: attrs[6] || undefined });
    }
  }
  if (students.length === 0) throw new Error('No valid rows.');
  return students;
}

type Step = 'select' | 'upload' | 'done' | 'error';

export default function BulkUploadModal({ visible, onClose, onUploadComplete }: BulkUploadModalProps) {
  const { width } = useWindowDimensions();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C, width), [C.scheme, width]);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [step, setStep] = useState<Step>('select');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [emailForTemplate, setEmailForTemplate] = useState('');
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Auth required.');
      const [classRes, sessionRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/classes`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/academic-sessions`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [classData, sessionData] = await Promise.all([classRes.json(), sessionRes.json()]);
      if (classData.success) setClasses(classData.data ?? []);
      if (sessionData.success) setSessions(sessionData.data ?? []);
    } catch (e: any) {
      setDataError(e?.message || 'Data error.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setStep('select'); setSelectedClass(null); setSelectedSession(null);
      setShowClassDropdown(false); setShowSessionDropdown(false); setUploadError(null);
      setUploadedCount(0); setEmailForTemplate(''); setTemplateError(null);
      setTemplateSuccess(false); fetchData();
    }
  }, [visible, fetchData]);

  const handleSendTemplateToEmail = async () => {
    if (!emailForTemplate.trim()) return;
    try {
      setSendingTemplate(true); setTemplateError(null);
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/students/email/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: emailForTemplate.trim() }),
      });
      const json = await response.json();
      if (json.success) { setTemplateSuccess(true); setEmailForTemplate(''); }
      else throw new Error(json.message || 'Dispatch failure.');
    } catch (e: any) { setTemplateError(e.message || 'Server error.'); }
    finally { setSendingTemplate(false); }
  };

  const handlePickAndUpload = async () => {
    if (!selectedClass || !selectedSession) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/comma-separated-values', 'text/csv', '*/*'] });
      if (result.canceled) return;
      const file = result.assets[0];
      setUploading(true); setUploadError(null); setStep('upload');
      let text = Platform.OS === 'web' ? await (file as any).file.text() : await FileSystem.readAsStringAsync(file.uri, { encoding: 'utf8' });
      const students = parseStudentCsv(text);
      const payload = students.map((s) => ({ ...s, classId: selectedClass.id }));
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/students/bulk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: payload, academicSession: selectedSession.session_name }),
      });
      const json = await res.json();
      if (json.success) {
        setUploadedCount(json.count ?? students.length); setStep('done');
        onUploadComplete({ success: true, count: json.count ?? students.length });
      } else throw new Error(json.message || 'Upload rejected.');
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed.'); setStep('error');
      onUploadComplete({ success: false, error: e?.message });
    } finally { setUploading(false); }
  };

  const isTiny = width < 300;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableWithoutFeedback>
          <LinearGradient colors={[C.isDark ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.99)', C.card]} style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View><ThemedText style={styles.title}>Bulk Enrollment</ThemedText></View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}><Ionicons name="close" size={18} color={Colors.accent.gold} /></TouchableOpacity>
            </View>

            {loadingData ? (
              <View style={styles.center}><ActivityIndicator size="small" color={Colors.accent.gold} /><ThemedText style={styles.loadingText}>Syncing options...</ThemedText></View>
            ) : step === 'done' ? (
              <View style={styles.center}><Ionicons name="checkmark-done-circle" size={48} color="#10B981" /><ThemedText style={styles.successTitle}>Complete</ThemedText><TouchableOpacity style={styles.doneBtn} onPress={onClose}><ThemedText style={styles.doneBtnText}>Return</ThemedText></TouchableOpacity></View>
            ) : step === 'upload' ? (
              <View style={styles.center}><ActivityIndicator size="small" color={Colors.accent.gold} /><ThemedText style={styles.loadingText}>Processing...</ThemedText></View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {step === 'error' && uploadError && <View style={styles.errorBanner}><ThemedText style={styles.errorText}>{uploadError}</ThemedText></View>}
                
                <SectionHeader icon="school-outline" label="CLASS" />
                <TouchableOpacity style={styles.inputSelector} onPress={() => setShowClassDropdown(!showClassDropdown)}>
                  <ThemedText style={styles.selectorText}>{selectedClass?.display_name || 'Select Class'}</ThemedText>
                  <Ionicons name="chevron-down" size={18} color={Colors.accent.gold} />
                </TouchableOpacity>
                {showClassDropdown && (
                  <View style={styles.listBox}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {classes.map(c => (
                        <TouchableOpacity key={c.id} style={[styles.listItem, selectedClass?.id === c.id && styles.listItemActive]} onPress={() => { setSelectedClass(c); setShowClassDropdown(false); }}>
                          <ThemedText style={[styles.listItemText, selectedClass?.id === c.id && { color: Colors.accent.gold, fontWeight: '800' }]}>{c.display_name}</ThemedText>
                          {selectedClass?.id === c.id && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={{ height: 16 }} />

                <SectionHeader icon="calendar-outline" label="SESSION" />
                <TouchableOpacity style={styles.inputSelector} onPress={() => setShowSessionDropdown(!showSessionDropdown)}>
                  <ThemedText style={styles.selectorText}>{selectedSession?.session_name || 'Select Session'}</ThemedText>
                  <Ionicons name="chevron-down" size={18} color={Colors.accent.gold} />
                </TouchableOpacity>
                {showSessionDropdown && (
                  <View style={styles.listBox}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {sessions.map(s => (
                        <TouchableOpacity key={s.id} style={[styles.listItem, selectedSession?.id === s.id && styles.listItemActive]} onPress={() => { setSelectedSession(s); setShowSessionDropdown(false); }}>
                          <ThemedText style={[styles.listItemText, selectedSession?.id === s.id && { color: Colors.accent.gold, fontWeight: '800' }]}>{s.session_name}</ThemedText>
                          {selectedSession?.id === s.id && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.emailSection}>
                  <SectionHeader icon="mail-outline" label="GET TEMPLATE" />
                  <View style={styles.emailRow}>
                    <TextInput style={styles.emailInput} placeholder="email@oags.com" placeholderTextColor={C.textMuted} value={emailForTemplate} onChangeText={setEmailForTemplate} keyboardType="email-address" />
                    <TouchableOpacity onPress={handleSendTemplateToEmail} disabled={sendingTemplate}><Ionicons name="send" size={18} color={Colors.accent.gold} /></TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={[styles.uploadBtn, (!selectedClass || !selectedSession) && styles.uploadDisabled]} onPress={handlePickAndUpload} disabled={!selectedClass || !selectedSession}>
                  <ThemedText style={styles.uploadBtnText}>UPLOAD CSV</ThemedText>
                </TouchableOpacity>
              </ScrollView>
            )}
          </LinearGradient>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
}

function SectionHeader({ icon, label }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginTop: 12 }}>
      <Ionicons name={icon} size={12} color={Colors.accent.gold} style={{ marginRight: 6 }} />
      <Text style={{ color: Colors.accent.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}

function makeStyles(C: any, width: number) {
  const isTiny = width < 300;
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: isTiny ? 16 : 24, maxHeight: '90%' },
    handle: { width: 34, height: 4, backgroundColor: C.divider, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '900', color: C.text },
    closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.inputBg, justifyContent: 'center', alignItems: 'center' },
    center: { alignItems: 'center', padding: 30 },
    loadingText: { color: C.textMuted, marginTop: 10, fontSize: 11 },
    inputSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.inputBg, borderRadius: 12, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: C.inputBorder, marginBottom: 8 },
    selectorText: { color: C.inputText, fontSize: 13, fontWeight: '700' },
    listBox: { backgroundColor: C.inputBg, borderRadius: 12, borderWidth: 1, borderColor: C.inputBorder, overflow: 'hidden' },
    listItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    listItemActive: { backgroundColor: Colors.accent.gold + '10' },
    listItemText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
    emailSection: { marginTop: 16 },
    emailRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 10, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: C.inputBorder },
    emailInput: { flex: 1, fontSize: 12, color: C.inputText },
    uploadBtn: { backgroundColor: Colors.accent.gold, borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    uploadDisabled: { opacity: 0.5 },
    uploadBtnText: { color: Colors.accent.navy, fontWeight: '900', fontSize: 13 },
    errorBanner: { backgroundColor: '#EF4444', padding: 10, borderRadius: 10, marginBottom: 12 },
    errorText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    successTitle: { fontSize: 18, fontWeight: '900', color: C.text, marginTop: 12 },
    doneBtn: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
    doneBtnText: { color: '#fff', fontWeight: '800' }
  });
}
