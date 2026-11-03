import { View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';
import { parentFetch, getParentData, clearParentSession, SessionExpiredError } from '@/utils/parent-session';
import { Field, PrimaryButton, ScreenHeader, cardStyle } from '@/components/parent-ui';

interface Child {
  studentId: number; firstName: string; lastName: string; registrationNumber: string; photo?: string | null;
  relationship: string; school: { id: number; name: string; active: boolean };
  currentClass: string | null; currentSession: string | null;
  latestResults: { sessionId: number; term: number; subjects: number; averageTotal: number } | null;
}

const RELATIONS = ['Mother', 'Father', 'Guardian'];

export default function ParentDashboard() {
  const router = useRouter();
  const C = useAppColors();
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 3 : width >= 600 ? 2 : 1;

  const [parentName, setParentName] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [reg, setReg] = useState('');
  const [code, setCode] = useState('');
  const [relation, setRelation] = useState('Guardian');
  const [adding, setAdding] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success' | 'info'; title: string; message: string } | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const p = await getParentData();
      if (p?.fullName) setParentName(p.fullName);
      const r = await parentFetch('/api/parents/children');
      if (!r.ok) throw new Error(r.json?.error || 'Could not load your children.');
      setChildren(r.json.data);
      if (r.json.data.length === 0) setShowAdd(true);
    } catch (e: any) {
      if (e instanceof SessionExpiredError) { router.replace('/(parent)' as any); return; }
      setAlert({ type: 'error', title: 'Cannot load', message: e?.message || 'Check your connection.' });
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const logout = async () => { await clearParentSession(); router.replace('/(parent)' as any); };

  const addChild = async () => {
    if (!reg.trim() || !code.trim()) { setAlert({ type: 'error', title: 'Missing details', message: "Enter the child's registration number and the link code from the school." }); return; }
    try {
      setAdding(true);
      const r = await parentFetch('/api/parents/children/link', { method: 'POST', body: { registrationNumber: reg.trim(), linkCode: code.trim(), relationship: relation.toLowerCase() } });
      if (!r.ok) throw new Error(r.json?.error || 'Could not add the child.');
      setReg(''); setCode(''); setShowAdd(false);
      setAlert({ type: 'success', title: 'Child added', message: r.json.message });
      await load();
    } catch (e: any) {
      if (e instanceof SessionExpiredError) { router.replace('/(parent)' as any); return; }
      setAlert({ type: 'error', title: 'Cannot add child', message: e?.message });
    } finally { setAdding(false); }
  };

  const cardWidth = columns === 1 ? '100%' : `${Math.floor(100 / columns) - 2}%`;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader
        C={C}
        title="My Children"
        right={<TouchableOpacity onPress={logout} accessibilityLabel="Log out"><Ionicons name="log-out-outline" size={24} color={C.text} /></TouchableOpacity>}
      />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={Colors.accent.gold} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60, maxWidth: 1100, width: '100%', alignSelf: 'center' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
            {parentName ? `Welcome, ${parentName}. ` : ''}{children.length === 0 ? 'Add your first child to get started.' : `You are viewing ${children.length} ${children.length === 1 ? 'child' : 'children'}. Tap one to see scores, report cards and attendance.`}
          </ThemedText>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {children.map((c) => {
              const initials = `${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}`.toUpperCase();
              return (
                <TouchableOpacity
                  key={c.studentId}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/(parent)/child', params: { studentId: String(c.studentId) } } as any)}
                  style={[cardStyle(C), { width: cardWidth as any, marginBottom: 0 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {c.photo ? (
                      <Image source={{ uri: c.photo }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                    ) : (
                      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#2563EB22', alignItems: 'center', justifyContent: 'center' }}>
                        <ThemedText style={{ color: '#2563EB', fontWeight: '900', fontSize: 16 }}>{initials}</ThemedText>
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <ThemedText style={{ fontSize: 16, fontWeight: '800', color: C.text }} numberOfLines={1}>{c.firstName} {c.lastName}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: C.textSecondary }} numberOfLines={1}>{c.currentClass || 'Not enrolled yet'}{c.currentSession ? ` • ${c.currentSession}` : ''}</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: C.textMuted }} numberOfLines={1}>{c.school.name}</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
                  </View>

                  <View style={{ height: 1, backgroundColor: C.divider, marginVertical: 12 }} />
                  {!c.school.active ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
                      <ThemedText style={{ fontSize: 12, color: '#F59E0B', flex: 1 }}>The school's account is inactive. Please contact the school.</ThemedText>
                    </View>
                  ) : c.latestResults ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <ThemedText style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1, color: C.textMuted }}>LATEST RESULTS • TERM {c.latestResults.term}</ThemedText>
                        <ThemedText style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{c.latestResults.subjects} subject{c.latestResults.subjects === 1 ? '' : 's'}</ThemedText>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <ThemedText style={{ fontSize: 20, fontWeight: '900', color: Colors.accent.gold }}>{c.latestResults.averageTotal}</ThemedText>
                        <ThemedText style={{ fontSize: 10, color: C.textMuted }}>average total</ThemedText>
                      </View>
                    </View>
                  ) : (
                    <ThemedText style={{ fontSize: 12, color: C.textMuted }}>No results published yet.</ThemedText>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[cardStyle(C), { marginTop: 18 }]}>
            <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={showAdd ? 'remove-circle-outline' : 'add-circle-outline'} size={22} color="#2563EB" />
              <ThemedText style={{ flex: 1, fontWeight: '800', color: C.text }}>Add a child</ThemedText>
            </TouchableOpacity>
            {showAdd && (
              <View style={{ marginTop: 14 }}>
                <ThemedText style={{ fontSize: 12, color: C.textSecondary, marginBottom: 12, lineHeight: 18 }}>
                  Ask the school for your child's registration number and parent link code. Add each child once - they will all appear here.
                </ThemedText>
                <Field C={C} label="REGISTRATION NUMBER" value={reg} onChangeText={setReg} autoCapitalize="characters" placeholder="e.g. STU-08513F" />
                <Field C={C} label="PARENT LINK CODE" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="8 characters from the school" maxLength={12} />
                <ThemedText style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: C.textSecondary, marginBottom: 8 }}>YOU ARE THE CHILD'S</ThemedText>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {RELATIONS.map((r) => (
                    <TouchableOpacity key={r} onPress={() => setRelation(r)}
                      style={{ borderWidth: 1, borderColor: relation === r ? '#2563EB' : C.divider, backgroundColor: relation === r ? '#2563EB22' : 'transparent', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 }}>
                      <ThemedText style={{ fontSize: 12, fontWeight: '700', color: relation === r ? '#2563EB' : C.textSecondary }}>{r}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
                <PrimaryButton C={C} title="ADD CHILD" onPress={addChild} loading={adding} />
              </View>
            )}
          </View>
        </ScrollView>
      )}
      {alert && <CustomAlert type={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(null)} />}
    </View>
  );
}
