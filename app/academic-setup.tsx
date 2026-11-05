import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/utils/api-service';
import { Colors } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';

/**
 * Academic setup: classes and the school's own subjects.
 * (Teacher assignments are handled in Manage Staff.)
 */

type Tab = 'classes' | 'subjects';

interface ClassRow { id: number; class_name: string; capacity: number }
interface SubjectRow { id: number; name: string; category?: string | null }

const getToken = async () => {
  if (Platform.OS !== 'web') return await SecureStore.getItemAsync('userToken');
  return localStorage.getItem('userToken');
};

// Defined at module level on purpose: components declared inside another
// component get a new identity every render, which would drop the keyboard
// focus on every keystroke.
const AddBar = ({ value, onChange, placeholder, onAdd, C, styles }: any) => (
  <View style={[styles.row, { marginBottom: 14 }]}>
    <TextInput style={[styles.input, { flex: 1 }]} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.textMuted} maxLength={100} />
    <TouchableOpacity onPress={onAdd} style={styles.addBtn}><ThemedText style={styles.addText}>Add</ThemedText></TouchableOpacity>
  </View>
);

const EditRow = ({ kind, id, label, sub, onDelete, C, styles, editing, setEditing, saveEdit }: any) => {
  const isEditing = editing?.kind === kind && editing.id === id;
  return (
    <View style={styles.rowCard}>
      {isEditing ? (
        <>
          <TextInput style={[styles.input, { flex: 1 }]} value={editing.value} autoFocus onChangeText={(v) => setEditing({ ...editing, value: v })} maxLength={100} />
          <TouchableOpacity onPress={saveEdit} style={styles.iconBtn}><Ionicons name="checkmark" size={20} color="#22C55E" /></TouchableOpacity>
          <TouchableOpacity onPress={() => setEditing(null)} style={styles.iconBtn}><Ionicons name="close" size={20} color={C.textMuted} /></TouchableOpacity>
        </>
      ) : (
        <>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.rowTitle}>{label}</ThemedText>
            {!!sub && <ThemedText style={styles.small}>{sub}</ThemedText>}
          </View>
          <TouchableOpacity onPress={() => setEditing({ kind, id, value: label })} style={styles.iconBtn}><Ionicons name="create-outline" size={18} color={C.text} /></TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.iconBtn}><Ionicons name="trash-outline" size={18} color="#EF4444" /></TouchableOpacity>
        </>
      )}
    </View>
  );
};

export default function AcademicSetupScreen() {
  const router = useRouter();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);

  const [token, setToken] = useState('');
  const [tab, setTab] = useState<Tab>('classes');
  const [loading, setLoading] = useState(true);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);

  const [newClass, setNewClass] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [editing, setEditing] = useState<{ kind: 'class' | 'subject'; id: number; value: string } | null>(null);

  const [alert, setAlert] = useState<{ visible: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; onConfirm?: () => void; confirmLabel?: string }>({
    visible: false, type: 'info', title: '', message: '',
  });
  const say = (type: 'success' | 'error' | 'info', title: string, message: string) => setAlert({ visible: true, type, title, message });

  const api = useCallback(async (method: string, path: string, body?: any, tk?: string) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk || token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 402) { router.replace('/pricing'); throw new Error('Subscription required'); }
    let json: any;
    try {
      json = await res.json();
    } catch (_) {
      // An HTML "Cannot POST ..." page means the server hasn't been updated yet.
      return {
        ok: false,
        json: {
          error: res.status === 404
            ? 'The server does not have this feature yet (404). Deploy the latest backend, then try again.'
            : `Unexpected server response (${res.status}).`,
        },
      };
    }
    return { ok: res.ok && json.success !== false, json };
  }, [token]);

  const loadAll = useCallback(async (tk?: string) => {
    try {
      // Each list loads independently so one failure doesn't blank the others.
      const [c, sub] = await Promise.all([
        api('GET', '/api/classes/school', undefined, tk).catch(() => null),
        api('GET', '/api/subjects/school', undefined, tk).catch(() => null),
      ]);
      if (c?.ok) setClasses(c.json.data);
      if (sub?.ok) setSubjects(sub.json.data);
      const failed = [c, sub].find((x) => x && !x.ok);
      if (failed) say('error', 'Some data did not load', failed.json.error || 'Please try again.');
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => {
    (async () => {
      const tk = (await getToken()) || '';
      setToken(tk);
      await loadAll(tk);
    })();
  }, []);

  // One generic "do a write, then reload" helper
  const act = async (method: string, path: string, body: any, okMsg?: string, after?: () => void) => {
    try {
      const r = await api(method, path, body);
      if (!r.ok) { say('error', 'Not done', r.json.error || 'Something went wrong.'); return; }
      after?.();
      await loadAll();
      if (okMsg) say('success', 'Done', okMsg);
    } catch (e: any) { say('error', 'Error', e?.message || 'Connection error.'); }
  };

  const confirmThen = (title: string, message: string, label: string, fn: () => void) =>
    setAlert({ visible: true, type: 'warning', title, message, confirmLabel: label, onConfirm: fn });

  const saveEdit = () => {
    if (!editing || !editing.value.trim()) return;
    const { kind, id, value } = editing;
    if (kind === 'class') act('PUT', `/api/classes/school/${id}`, { className: value }, undefined, () => setEditing(null));
    if (kind === 'subject') act('PUT', `/api/subjects/school/${id}`, { name: value }, undefined, () => setEditing(null));
  };

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && { backgroundColor: Colors.accent.gold + '30', borderColor: Colors.accent.gold }]}>
      <ThemedText style={{ fontSize: 12, fontWeight: '700', color: active ? Colors.accent.gold : C.textSecondary }}>{label}</ThemedText>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.accent.gold} /></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={C.text} /></TouchableOpacity>
        <ThemedText style={styles.title}>Academic Setup</ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.row, { paddingHorizontal: 16, gap: 6, marginBottom: 8 }]}>
        {(['classes', 'subjects'] as Tab[]).map((t) => (
          <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} active={tab === t} onPress={() => setTab(t)} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {tab === 'classes' && (
          <>
            <AddBar C={C} styles={styles} value={newClass} onChange={setNewClass} placeholder="New class, e.g. Primary 7" onAdd={() => newClass.trim() && act('POST', '/api/classes/school', { className: newClass }, 'Class added.', () => setNewClass(''))} />
            {classes.map((c) => (
              <EditRow C={C} styles={styles} editing={editing} setEditing={setEditing} saveEdit={saveEdit} key={c.id} kind="class" id={c.id} label={c.class_name}
                onDelete={() => confirmThen('Archive class?', `"${c.class_name}" will be hidden. Past report cards are kept. A class with active students cannot be archived.`, 'Archive', () => act('DELETE', `/api/classes/school/${c.id}`, undefined, 'Class archived.'))} />
            ))}
          </>
        )}

        {tab === 'subjects' && (
          <>
            <ThemedText style={[styles.small, { marginBottom: 10 }]}>Subjects you add here belong to your school only. The shared subject library is still available in score entry.</ThemedText>
            <AddBar C={C} styles={styles} value={newSubject} onChange={setNewSubject} placeholder="New subject, e.g. Dance" onAdd={() => newSubject.trim() && act('POST', '/api/subjects/school', { name: newSubject }, 'Subject added.', () => setNewSubject(''))} />
            {subjects.length === 0 && <ThemedText style={styles.small}>You haven't added any subjects of your own yet.</ThemedText>}
            {subjects.map((s) => (
              <EditRow C={C} styles={styles} editing={editing} setEditing={setEditing} saveEdit={saveEdit} key={s.id} kind="subject" id={s.id} label={s.name}
                onDelete={() => confirmThen('Delete subject?', `Delete "${s.name}"? A subject that already has scores cannot be deleted - rename it instead.`, 'Delete', () => act('DELETE', `/api/subjects/school/${s.id}`, undefined, 'Subject deleted.'))} />
            ))}
          </>
        )}
      </ScrollView>

      {alert.visible && (
        <CustomAlert
          type={alert.type}
          title={alert.title}
          message={alert.message}
          confirmLabel={alert.confirmLabel}
          onConfirm={alert.onConfirm ? () => { const fn = alert.onConfirm; setAlert((a) => ({ ...a, visible: false })); fn && fn(); } : undefined}
          onClose={() => setAlert((a) => ({ ...a, visible: false }))}
        />
      )}
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingHorizontal: 16, paddingBottom: 10 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  section: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: Colors.accent.gold, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: C.divider },
  rowTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  small: { fontSize: 11, color: C.textSecondary },
  input: { height: 40, borderRadius: 10, borderWidth: 1, borderColor: C.inputBorder, backgroundColor: C.inputBg, color: C.inputText, paddingHorizontal: 10, fontSize: 13 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  addBtn: { borderWidth: 1, borderColor: Colors.accent.gold, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  addText: { fontSize: 12, fontWeight: '800', color: Colors.accent.gold },
  chip: { borderWidth: 1, borderColor: C.divider, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
});
