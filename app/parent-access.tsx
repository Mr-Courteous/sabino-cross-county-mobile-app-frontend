import { View, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Platform, Switch, Share } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/utils/api-service';
import { Colors } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';
import { Field, PrimaryButton, ScreenHeader, cardStyle } from '@/components/parent-ui';

/**
 * School side of parent access.
 * - give each student's parent link code to the parent (share / read out / print)
 * - record the guardian's contact; with "auto-link" on, a parent who registers
 *   with that e-mail sees the child without needing a code
 * - see who is linked to a child and remove access
 */

interface StudentRow {
  id: number; first_name: string; last_name: string; registration_number: string; parent_link_code: string;
  guardian_name: string | null; guardian_email: string | null; guardian_phone: string | null; linked_parents: number;
}

const getToken = async () => (Platform.OS !== 'web' ? await SecureStore.getItemAsync('userToken') : localStorage.getItem('userToken'));

export default function ParentAccessScreen() {
  const router = useRouter();
  const C = useAppColors();
  const tokenRef = useRef('');

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<{ autoLink: boolean; parents: number; linkedStudents: number } | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [links, setLinks] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success' | 'info' | 'warning'; title: string; message: string; onConfirm?: () => void; confirmLabel?: string } | null>(null);

  const api = useCallback(async (method: string, path: string, body?: any) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({ error: res.status === 404 ? 'The server does not have this feature yet. Deploy the latest backend.' : 'Unexpected server response.' }));
    return { ok: res.ok && json.success !== false, json };
  }, []);

  const loadStudents = useCallback(async (q = '') => {
    const r = await api('GET', `/api/parents/school/students?limit=40&search=${encodeURIComponent(q)}`);
    if (r.ok) setStudents(r.json.data);
    else setAlert({ type: 'error', title: 'Cannot load students', message: r.json.error || 'Please try again.' });
  }, [api]);

  useEffect(() => {
    (async () => {
      tokenRef.current = (await getToken()) || '';
      const s = await api('GET', '/api/parents/school/settings');
      if (s.ok) setSettings(s.json.data);
      else setAlert({ type: 'error', title: 'Cannot load', message: s.json.error || 'Please try again.' });
      await loadStudents();
      setLoading(false);
    })();
  }, []);

  // search as you type
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => loadStudents(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const toggleAutoLink = async (value: boolean) => {
    const r = await api('PUT', '/api/parents/school/settings', { autoLink: value });
    if (r.ok) setSettings((s) => (s ? { ...s, autoLink: value } : s));
    else setAlert({ type: 'error', title: 'Not saved', message: r.json.error });
  };

  const openStudent = async (st: StudentRow) => {
    if (openId === st.id) { setOpenId(null); return; }
    setOpenId(st.id);
    setForm({ name: st.guardian_name || '', email: st.guardian_email || '', phone: st.guardian_phone || '' });
    setLinks([]);
    const r = await api('GET', `/api/parents/school/students/${st.id}/links`);
    if (r.ok) setLinks(r.json.data);
  };

  const saveGuardian = async (st: StudentRow) => {
    setBusy(true);
    const r = await api('PUT', `/api/parents/school/students/${st.id}/guardian`, { guardianName: form.name, guardianEmail: form.email, guardianPhone: form.phone });
    setBusy(false);
    if (!r.ok) return setAlert({ type: 'error', title: 'Not saved', message: r.json.error });
    setAlert({ type: 'success', title: 'Saved', message: 'Guardian details saved.' });
    await loadStudents(search.trim());
    const l = await api('GET', `/api/parents/school/students/${st.id}/links`);
    if (l.ok) setLinks(l.json.data);
  };

  const copyCode = async (st: StudentRow) => {
    try {
      await Clipboard.setStringAsync(st.parent_link_code);
      setAlert({ type: 'success', title: 'Code copied', message: `Link code ${st.parent_link_code} copied to clipboard.` });
    } catch {
      setAlert({ type: 'error', title: 'Copy failed', message: 'Could not copy the link code. Please select and copy it manually.' });
    }
  };

  const shareCode = async (st: StudentRow) => {
    const message = `Parent access for ${st.first_name} ${st.last_name}\nRegistration number: ${st.registration_number}\nLink code: ${st.parent_link_code}\nOpen the Sabino Edu app, choose "Parents' Login", create an account and tap "Add a child".`;
    try {
      await Share.share({ message, title: `Parent access for ${st.first_name} ${st.last_name}` });
    } catch {
      await copyCode(st);
    }
  };

  const regenerate = (st: StudentRow) => setAlert({
    type: 'warning', title: 'Make a new code?',
    message: `The old code for ${st.first_name} stops working. Parents already linked keep their access unless you also remove them. Remove all current parents too?`,
    confirmLabel: 'New code + remove parents',
    onConfirm: async () => {
      const r = await api('POST', `/api/parents/school/students/${st.id}/regenerate-code`, { revokeLinks: true });
      if (!r.ok) return setAlert({ type: 'error', title: 'Failed', message: r.json.error });
      setAlert({ type: 'success', title: 'New code created', message: `New code: ${r.json.data.parentLinkCode}\n${r.json.data.revokedLinks} parent link(s) removed.` });
      await loadStudents(search.trim());
      setLinks([]);
    },
  });

  const removeLink = async (linkId: number, st: StudentRow) => {
    const r = await api('DELETE', `/api/parents/school/links/${linkId}`);
    if (!r.ok) return setAlert({ type: 'error', title: 'Failed', message: r.json.error });
    setLinks((l) => l.filter((x) => x.link_id !== linkId));
    loadStudents(search.trim());
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={Colors.accent.gold} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader C={C} title="Parent Access" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, maxWidth: 800, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {settings && (
          <View style={cardStyle(C)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <ThemedText style={{ fontWeight: '800', color: C.text }}>Auto-link by guardian email</ThemedText>
                <ThemedText style={{ fontSize: 12, color: C.textSecondary, marginTop: 4, lineHeight: 17 }}>
                  When on, a parent who registers with the guardian email you saved for a student sees that child automatically. When off, parents must enter the registration number and link code.
                </ThemedText>
              </View>
              <Switch value={settings.autoLink} onValueChange={toggleAutoLink} />
            </View>
            <ThemedText style={{ fontSize: 11, color: C.textMuted, marginTop: 10 }}>{settings.parents} parent account(s) linked • {settings.linkedStudents} student(s) with a parent</ThemedText>
          </View>
        )}

        <Field C={C} value={search} onChangeText={setSearch} placeholder="Search a student by name or registration number" />

        {students.length === 0 && <ThemedText style={{ color: C.textMuted, textAlign: 'center', marginTop: 20 }}>No students found.</ThemedText>}

        {students.map((st) => (
          <View key={st.id} style={cardStyle(C)}>
            <TouchableOpacity onPress={() => openStudent(st)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontWeight: '800', color: C.text }}>{st.first_name} {st.last_name}</ThemedText>
                <ThemedText style={{ fontSize: 11, color: C.textMuted }}>{st.registration_number} • {st.linked_parents} parent{st.linked_parents === 1 ? '' : 's'} linked</ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                <ThemedText style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1, color: C.textMuted }}>LINK CODE</ThemedText>
                <ThemedText selectable style={{ fontSize: 15, fontWeight: '900', letterSpacing: 2, color: Colors.accent.gold }}>{st.parent_link_code}</ThemedText>
              </View>
              <Ionicons name={openId === st.id ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
            </TouchableOpacity>

            {openId === st.id && (
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1 }}><PrimaryButton C={C} title="COPY CODE" onPress={() => copyCode(st)} /></View>
                  <View style={{ flex: 1 }}><PrimaryButton C={C} outline title="SHARE" onPress={() => shareCode(st)} /></View>
                  <View style={{ flex: 1 }}><PrimaryButton C={C} outline title="NEW CODE" onPress={() => regenerate(st)} /></View>
                </View>

                <ThemedText style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: C.textMuted, marginBottom: 8 }}>GUARDIAN CONTACT</ThemedText>
                <Field C={C} value={form.name} onChangeText={(v: string) => setForm({ ...form, name: v })} placeholder="Guardian name" />
                <Field C={C} value={form.email} onChangeText={(v: string) => setForm({ ...form, email: v })} placeholder="Guardian email" autoCapitalize="none" keyboardType="email-address" />
                <Field C={C} value={form.phone} onChangeText={(v: string) => setForm({ ...form, phone: v })} placeholder="Guardian phone" keyboardType="phone-pad" />
                <PrimaryButton C={C} title="SAVE GUARDIAN DETAILS" onPress={() => saveGuardian(st)} loading={busy} />

                <ThemedText style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: C.textMuted, marginTop: 18, marginBottom: 8 }}>PARENTS WITH ACCESS</ThemedText>
                {links.length === 0 && <ThemedText style={{ fontSize: 12, color: C.textMuted }}>No parent is linked to this student yet.</ThemedText>}
                {links.map((l) => (
                  <View key={l.link_id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.divider }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontWeight: '700', color: C.text }}>{l.full_name} <ThemedText style={{ fontWeight: '400', color: C.textMuted }}>({l.relationship})</ThemedText></ThemedText>
                      <ThemedText style={{ fontSize: 11, color: C.textMuted }}>{l.email}{l.phone ? ` • ${l.phone}` : ''} • via {l.linked_via}</ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => removeLink(l.link_id, st)} style={{ padding: 8 }}>
                      <Ionicons name="close-circle-outline" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      {alert && (
        <CustomAlert type={alert.type} title={alert.title} message={alert.message} confirmLabel={alert.confirmLabel}
          onConfirm={alert.onConfirm ? () => { const fn = alert.onConfirm; setAlert(null); fn && fn(); } : undefined}
          onClose={() => setAlert(null)} />
      )}
    </View>
  );
}
