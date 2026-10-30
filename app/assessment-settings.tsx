import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Switch,
  StyleSheet,
} from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/utils/api-service';
import { Colors } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';

/**
 * Result template editor.
 * A school decides the columns of its score sheet and report cards
 * (CA1, CA2, Exam, comments, class min/avg/max, grade...), the mark each
 * is out of, and its grading scale. Saving does NOT change existing report
 * cards; they only follow the new template when edited, or when the school
 * taps "Apply to existing report cards".
 */

type ColType = 'number' | 'text' | 'computed';
interface Component {
  key: string;
  label: string;
  type: ColType;
  max?: number;
  counts_toward_total?: boolean;
  source?: string;
  visible?: boolean;
}
interface Band { min: string; grade: string; remark: string }

const SOURCES: Record<string, string> = {
  total: 'Total',
  grade: 'Grade',
  remark: 'Remark',
  class_average: 'Class Avg',
  class_min: 'Min',
  class_max: 'Max',
};
const SOURCE_KEYS = Object.keys(SOURCES);

const num = (key: string, label: string, max: number): Component => ({ key, label, type: 'number', max, counts_toward_total: true, visible: true });
const calc = (key: string, label: string, source: string): Component => ({ key, label, type: 'computed', source, visible: true });

// Quick starting points. Picking one only fills the editor below; nothing is
// saved (and no report card changes) until "Save template" is tapped.
const PRESETS: { name: string; hint: string; components: Component[] }[] = [
  {
    name: 'Standard',
    hint: 'CA1-CA4 (10 each) + Exam 60',
    components: [num('ca1', 'CA1', 10), num('ca2', 'CA2', 10), num('ca3', 'CA3', 10), num('ca4', 'CA4', 10), num('exam', 'Exam', 60), calc('total', 'Total', 'total')],
  },
  {
    name: '10 / 10 / 80',
    hint: 'CA1 10 + CA2 10 + Exam 80',
    components: [num('ca1', 'CA1', 10), num('ca2', 'CA2', 10), num('exam', 'Exam', 80), calc('total', 'Total', 'total'), calc('grade', 'Grade', 'grade')],
  },
  {
    name: '20 / 20 / 60',
    hint: 'CA1 20 + CA2 20 + Exam 60',
    components: [num('ca1', 'CA1', 20), num('ca2', 'CA2', 20), num('exam', 'Exam', 60), calc('total', 'Total', 'total'), calc('grade', 'Grade', 'grade')],
  },
  {
    name: '30 / 70',
    hint: 'Continuous assessment 30 + Exam 70',
    components: [num('ca', 'CA', 30), num('exam', 'Exam', 70), calc('total', 'Total', 'total'), calc('grade', 'Grade', 'grade')],
  },
  {
    name: 'Full report',
    hint: '20/20/60 + Min, Avg, Max, Grade, Remark',
    components: [
      num('ca1', 'CA1', 20), num('ca2', 'CA2', 20), num('exam', 'Exam', 60), calc('total', 'Total', 'total'),
      calc('min', 'Min', 'class_min'), calc('avg', 'Class Avg', 'class_average'), calc('max', 'Max', 'class_max'),
      calc('grade', 'Grade', 'grade'), calc('remark', 'Remark', 'remark'),
    ],
  },
];

const getToken = async () => {
  if (Platform.OS !== 'web') return await SecureStore.getItemAsync('userToken');
  return localStorage.getItem('userToken');
};

const slug = (label: string, taken: Set<string>) => {
  let base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!/^[a-z]/.test(base)) base = `col_${base}`;
  base = base.slice(0, 24) || 'col';
  let key = base;
  let i = 2;
  while (taken.has(key)) key = `${base}_${i++}`;
  return key;
};

export default function AssessmentSettingsScreen() {
  const router = useRouter();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [components, setComponents] = useState<Component[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [isCustom, setIsCustom] = useState(false);
  const [version, setVersion] = useState(0);
  const [defaults, setDefaults] = useState<{ components: Component[]; grading_bands: any[] } | null>(null);
  const [sessions, setSessions] = useState<{ id: number; session_name: string }[]>([]);
  const [applySession, setApplySession] = useState<number | null>(null);
  const [applyTerm, setApplyTerm] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; onConfirm?: () => void; confirmLabel?: string }>({
    visible: false, type: 'info', title: '', message: '',
  });

  const toBands = (b: any[]): Band[] => b.map((x) => ({ min: String(x.min), grade: x.grade, remark: x.remark || '' }));

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

  useEffect(() => {
    (async () => {
      try {
        const tk = (await getToken()) || '';
        setToken(tk);
        const cfg = await api('GET', '/api/assessment/config', undefined, tk);
        if (!cfg.ok) {
          setAlert({ visible: true, type: 'error', title: 'Cannot load template', message: cfg.json.error || 'Please try again.' });
        }
        if (cfg.ok) {
          setComponents(cfg.json.data.components);
          setBands(toBands(cfg.json.data.grading_bands));
          setIsCustom(cfg.json.data.isCustom);
          setVersion(cfg.json.data.version);
          setDefaults(cfg.json.defaults);
        }
        const ses = await api('GET', '/api/academic-sessions', undefined, tk);
        if (ses.ok && Array.isArray(ses.json.data)) {
          setSessions(ses.json.data.map((s: any) => ({ id: s.id, session_name: s.session_name || s.name })));
        }
      } catch (e) { /* alert shown by UI state below */ }
      finally { setLoading(false); }
    })();
  }, []);

  const totalMax = components
    .filter((c) => c.type === 'number' && c.counts_toward_total !== false)
    .reduce((s, c) => s + (Number(c.max) || 0), 0);

  const update = (i: number, patch: Partial<Component>) => {
    setComponents((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
    setDirty(true);
  };
  const move = (i: number, dir: -1 | 1) => {
    setComponents((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  };
  const remove = (i: number) => { setComponents((prev) => prev.filter((_, idx) => idx !== i)); setDirty(true); };
  // Adds a column. `at` = position to insert at (used by the per-column
  // "add above" button). Without it, score/text columns go after the last
  // input column but BEFORE Total/Grade/Min..., so they never land after the totals.
  const add = (type: ColType, at?: number) => {
    setComponents((prev) => {
      const taken = new Set(prev.map((c) => c.key));
      const label = type === 'number' ? 'New Score' : type === 'text' ? 'Comment' : 'Total';
      const base: Component = { key: slug(label, taken), label, type, visible: true };
      if (type === 'number') { base.max = 10; base.counts_toward_total = true; }
      if (type === 'computed') { base.source = 'total'; }
      let index = at;
      if (index === undefined) {
        if (type === 'computed') index = prev.length;
        else {
          let lastInput = -1;
          prev.forEach((c, i) => { if (c.type !== 'computed') lastInput = i; });
          index = lastInput + 1;
        }
      }
      const next = [...prev];
      next.splice(index, 0, base);
      return next;
    });
    setDirty(true);
  };
  const cycleSource = (i: number) => {
    const cur = components[i].source || 'total';
    const next = SOURCE_KEYS[(SOURCE_KEYS.indexOf(cur) + 1) % SOURCE_KEYS.length];
    update(i, { source: next, label: components[i].label === SOURCES[cur] ? SOURCES[next] : components[i].label });
  };

  const save = async () => {
    const payload = {
      components: components.map((c) => ({
        ...c,
        max: c.type === 'number' ? Number(c.max) : undefined,
      })),
      grading_bands: bands.map((b) => ({ min: Number(b.min), grade: b.grade.trim(), remark: b.remark.trim() })),
    };
    try {
      setSaving(true);
      const r = await api('PUT', '/api/assessment/config', payload);
      if (r.ok) {
        setIsCustom(true);
        setVersion(r.json.data.version);
        setDirty(false);
        setAlert({ visible: true, type: 'success', title: 'Template saved', message: r.json.message });
      } else {
        setAlert({ visible: true, type: 'error', title: 'Cannot save', message: r.json.errors?.join('\n') || r.json.error || 'Please check the template.' });
      }
    } catch (e: any) {
      setAlert({ visible: true, type: 'error', title: 'Error', message: e?.message || 'Connection error.' });
    } finally { setSaving(false); }
  };

  const reset = () => setAlert({
    visible: true, type: 'warning', title: 'Back to standard layout?',
    message: 'New scores will use CA1-CA4 (10 each) and Exam (60). Existing report cards are not changed.',
    confirmLabel: 'Reset',
    onConfirm: async () => {
      try {
        const r = await api('POST', '/api/assessment/config/reset');
        if (r.ok && defaults) {
          setComponents(defaults.components);
          setBands(toBands(defaults.grading_bands));
          setIsCustom(false); setVersion(0); setDirty(false);
          setAlert({ visible: true, type: 'success', title: 'Reset', message: r.json.message });
        }
      } catch (e) { /* ignore */ }
    },
  });

  const applyToExisting = () => {
    if (dirty) {
      setAlert({ visible: true, type: 'info', title: 'Save first', message: 'Save your template before applying it to existing report cards.' });
      return;
    }
    const scope = `${applySession ? sessions.find((s) => s.id === applySession)?.session_name : 'ALL sessions'}, ${applyTerm ? `term ${applyTerm}` : 'ALL terms'}`;
    setAlert({
      visible: true, type: 'warning', title: 'Change existing report cards?',
      message: `This re-lays-out and re-grades existing report cards (${scope}) using the template above. Marks in columns that no longer exist stop counting toward totals. This cannot be undone.`,
      confirmLabel: 'Apply',
      onConfirm: async () => {
        try {
          const r = await api('POST', '/api/assessment/apply', { confirm: true, sessionId: applySession || undefined, term: applyTerm || undefined });
          setAlert({ visible: true, type: r.ok ? 'success' : 'error', title: r.ok ? 'Applied' : 'Failed', message: r.json.message || r.json.error });
        } catch (e) { /* ignore */ }
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent.gold} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Result Template</ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.accent.gold} />
          <ThemedText style={styles.noteText}>
            {isCustom ? `Custom template (v${version}). ` : 'Using the standard layout. '}
            Saving a change does not alter existing report cards.
          </ThemedText>
        </View>

        <ThemedText style={styles.section}>START FROM A PRESET (then tweak below)</ThemedText>
        <View style={[styles.row, { flexWrap: 'wrap', gap: 8, marginBottom: 18 }]}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p.name}
              style={[styles.card, { marginBottom: 0, paddingVertical: 8, paddingHorizontal: 12 }]}
              onPress={() => {
                setComponents(p.components.map((c) => ({ ...c })));
                setDirty(true);
              }}
            >
              <ThemedText style={{ fontSize: 13, fontWeight: '800', color: C.text }}>{p.name}</ThemedText>
              <ThemedText style={styles.small}>{p.hint}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedText style={styles.section}>COLUMNS (score sheet & report card)</ThemedText>
        {components.map((c, i) => (
          <View key={c.key} style={styles.card}>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={c.label}
                onChangeText={(v) => update(i, { label: v })}
                placeholder="Column name"
                placeholderTextColor={C.textMuted}
                maxLength={30}
              />
              <TouchableOpacity onPress={() => move(i, -1)} style={styles.iconBtn}><Ionicons name="chevron-up" size={18} color={C.text} /></TouchableOpacity>
              <TouchableOpacity onPress={() => move(i, 1)} style={styles.iconBtn}><Ionicons name="chevron-down" size={18} color={C.text} /></TouchableOpacity>
              <TouchableOpacity onPress={() => remove(i)} style={styles.iconBtn}><Ionicons name="trash-outline" size={18} color="#EF4444" /></TouchableOpacity>
            </View>

            {c.type === 'number' && (
              <View style={[styles.row, { marginTop: 8 }]}>
                <ThemedText style={styles.small}>Out of</ThemedText>
                <TextInput
                  style={[styles.input, { width: 70, textAlign: 'center' }]}
                  keyboardType="numeric"
                  value={String(c.max ?? '')}
                  onChangeText={(v) => update(i, { max: v === '' ? undefined : Number(v.replace(/[^0-9.]/g, '')) })}
                  maxLength={5}
                />
                <ThemedText style={[styles.small, { marginLeft: 12 }]}>Counts toward total</ThemedText>
                <Switch value={c.counts_toward_total !== false} onValueChange={(v) => update(i, { counts_toward_total: v })} />
              </View>
            )}
            {c.type === 'text' && <ThemedText style={[styles.small, { marginTop: 8 }]}>Text column (e.g. teacher comment) - not counted in the total.</ThemedText>}
            {c.type === 'computed' && (
              <TouchableOpacity onPress={() => cycleSource(i)} style={[styles.row, { marginTop: 8 }]}>
                <ThemedText style={styles.small}>Shows: </ThemedText>
                <ThemedText style={[styles.small, { color: Colors.accent.gold, fontWeight: '800' }]}>{SOURCES[c.source || 'total']}</ThemedText>
                <ThemedText style={[styles.small, { marginLeft: 6 }]}>(tap to change)</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => add('number', i)} style={[styles.row, { marginTop: 10 }]}>
              <Ionicons name="add-circle-outline" size={16} color={Colors.accent.gold} />
              <ThemedText style={[styles.small, { color: Colors.accent.gold, fontWeight: '800' }]}>Add a score column above this one</ThemedText>
            </TouchableOpacity>
            <View style={[styles.row, { marginTop: 8 }]}>
              <ThemedText style={styles.small}>{c.type === 'number' ? 'Number' : c.type === 'text' ? 'Text' : 'Calculated'} column</ThemedText>
              <View style={{ flex: 1 }} />
              <ThemedText style={styles.small}>Show on report</ThemedText>
              <Switch value={c.visible !== false} onValueChange={(v) => update(i, { visible: v })} />
            </View>
          </View>
        ))}

        <View style={[styles.row, { flexWrap: 'wrap', gap: 8, marginBottom: 6 }]}>
          <TouchableOpacity style={styles.addBtn} onPress={() => add('number')}><ThemedText style={styles.addText}>+ Score column</ThemedText></TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => add('text')}><ThemedText style={styles.addText}>+ Text column</ThemedText></TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => add('computed')}><ThemedText style={styles.addText}>+ Total / Grade / Min...</ThemedText></TouchableOpacity>
        </View>
        <ThemedText style={[styles.small, { color: totalMax === 100 ? C.textMuted : '#F59E0B', marginBottom: 18 }]}>
          Total marks: {totalMax}{totalMax !== 100 ? '  (not 100 - make sure your grading scale below matches)' : ''}
        </ThemedText>

        <ThemedText style={styles.section}>GRADING SCALE</ThemedText>
        {bands.map((b, i) => (
          <View key={i} style={[styles.row, { marginBottom: 8 }]}>
            <ThemedText style={styles.small}>from</ThemedText>
            <TextInput style={[styles.input, { width: 56, textAlign: 'center' }]} keyboardType="numeric" value={b.min}
              onChangeText={(v) => { setBands((p) => p.map((x, k) => (k === i ? { ...x, min: v.replace(/[^0-9.]/g, '') } : x))); setDirty(true); }} />
            <TextInput style={[styles.input, { width: 56, textAlign: 'center' }]} value={b.grade} maxLength={5} autoCapitalize="characters"
              onChangeText={(v) => { setBands((p) => p.map((x, k) => (k === i ? { ...x, grade: v } : x))); setDirty(true); }} />
            <TextInput style={[styles.input, { flex: 1 }]} value={b.remark} maxLength={30} placeholder="Remark" placeholderTextColor={C.textMuted}
              onChangeText={(v) => { setBands((p) => p.map((x, k) => (k === i ? { ...x, remark: v } : x))); setDirty(true); }} />
            <TouchableOpacity onPress={() => { setBands((p) => p.filter((_, k) => k !== i)); setDirty(true); }} style={styles.iconBtn}>
              <Ionicons name="close" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={[styles.addBtn, { alignSelf: 'flex-start', marginBottom: 20 }]} onPress={() => { setBands((p) => [...p, { min: '0', grade: '', remark: '' }]); setDirty(true); }}>
          <ThemedText style={styles.addText}>+ Grade</ThemedText>
        </TouchableOpacity>

        <CustomButton title={saving ? 'Saving...' : 'Save template'} onPress={save} loading={saving} variant="premium" disabled={!dirty && isCustom} style={{ paddingVertical: 14 }} />
        {isCustom && (
          <TouchableOpacity onPress={reset} style={{ alignItems: 'center', marginTop: 14 }}>
            <ThemedText style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Reset to standard layout</ThemedText>
          </TouchableOpacity>
        )}

        {isCustom && (
          <View style={[styles.card, { marginTop: 28 }]}>
            <ThemedText style={styles.section}>APPLY TO EXISTING REPORT CARDS</ThemedText>
            <ThemedText style={styles.small}>
              Report cards already issued keep their old layout and grades. Use this only if you want them to follow the current template.
            </ThemedText>
            <View style={[styles.row, { flexWrap: 'wrap', gap: 6, marginTop: 10 }]}>
              <Chip C={C} styles={styles} label="All sessions" active={applySession === null} onPress={() => setApplySession(null)} />
              {sessions.map((s) => (
                <Chip key={s.id} C={C} styles={styles} label={s.session_name} active={applySession === s.id} onPress={() => setApplySession(s.id)} />
              ))}
            </View>
            <View style={[styles.row, { flexWrap: 'wrap', gap: 6, marginTop: 8 }]}>
              <Chip C={C} styles={styles} label="All terms" active={applyTerm === null} onPress={() => setApplyTerm(null)} />
              {[1, 2, 3].map((t) => (
                <Chip key={t} C={C} styles={styles} label={`Term ${t}`} active={applyTerm === t} onPress={() => setApplyTerm(t)} />
              ))}
            </View>
            <TouchableOpacity onPress={applyToExisting} style={[styles.addBtn, { marginTop: 14, alignSelf: 'flex-start', borderColor: '#F59E0B' }]}>
              <ThemedText style={[styles.addText, { color: '#F59E0B' }]}>Apply template...</ThemedText>
            </TouchableOpacity>
          </View>
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

const Chip = ({ label, active, onPress, C, styles }: any) => (
  <TouchableOpacity onPress={onPress} style={[styles.chip, active && { backgroundColor: Colors.accent.gold + '30', borderColor: Colors.accent.gold }]}>
    <ThemedText style={{ fontSize: 11, color: active ? Colors.accent.gold : C.textSecondary, fontWeight: '700' }}>{label}</ThemedText>
  </TouchableOpacity>
);

const makeStyles = (C: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingHorizontal: 16, paddingBottom: 10 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  note: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: Colors.accent.gold + '15', padding: 10, borderRadius: 12, marginBottom: 16 },
  noteText: { flex: 1, fontSize: 12, color: C.textSecondary },
  section: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: Colors.accent.gold, marginBottom: 10 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.divider },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { height: 40, borderRadius: 10, borderWidth: 1, borderColor: C.inputBorder, backgroundColor: C.inputBg, color: C.inputText, paddingHorizontal: 10, fontSize: 13 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  small: { fontSize: 11, color: C.textSecondary },
  addBtn: { borderWidth: 1, borderColor: Colors.accent.gold, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  addText: { fontSize: 12, fontWeight: '700', color: Colors.accent.gold },
  chip: { borderWidth: 1, borderColor: C.divider, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
});
