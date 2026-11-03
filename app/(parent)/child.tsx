import { View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';
import { parentFetch, childFetch, getParentData, SessionExpiredError, API_BASE_URL } from '@/utils/parent-session';
import { PrimaryButton, ScreenHeader, cardStyle, gradeColor } from '@/components/parent-ui';

type Tab = 'results' | 'report' | 'attendance' | 'profile';

interface ReportTerm { enrollment_id: number; session_id: number; term: number; class_name: string; session_name: string | null; subjects: number; average_total: number }

// Same A-F bands the student screen uses for schools on the standard layout
const letter = (percent: number) => (percent >= 75 ? 'A' : percent >= 65 ? 'B' : percent >= 55 ? 'C' : percent >= 45 ? 'D' : 'F');

const STATUS_COLOR: Record<string, string> = { present: '#10B981', late: '#F59E0B', absent: '#EF4444', sick: '#8B5CF6', excused: '#3B82F6' };

export default function ChildScreen() {
  const router = useRouter();
  const C = useAppColors();
  const params = useLocalSearchParams<{ studentId: string }>();
  const studentId = Number(params.studentId);

  const [tab, setTab] = useState<Tab>('results');
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [termIdx, setTermIdx] = useState(0);
  const [grades, setGrades] = useState<{ rows: any[]; layout: any; loading: boolean; error: string | null }>({ rows: [], layout: null, loading: false, error: null });
  const [attendance, setAttendance] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success' | 'info' | 'warning'; title: string; message: string; onConfirm?: () => void; confirmLabel?: string } | null>(null);

  const expired = useCallback((e: any) => {
    if (e instanceof SessionExpiredError) { router.replace('/(parent)' as any); return true; }
    return false;
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const r = await parentFetch(`/api/parents/children/${studentId}/overview`);
      if (!r.ok) throw new Error(r.json?.error || 'Could not load this child.');
      setOverview(r.json.data);
    } catch (e: any) {
      if (expired(e)) return;
      setAlert({ type: 'error', title: 'Cannot load', message: e?.message });
    } finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const terms: ReportTerm[] = overview?.reportTerms || [];
  const selected = terms[termIdx];

  // Results for the chosen term, using the child's own (view-only) student token
  const loadGrades = useCallback(async () => {
    if (!selected) return;
    setGrades((g) => ({ ...g, loading: true, error: null }));
    try {
      const res = await childFetch(studentId, `/api/scores/my-grades?term=${selected.term}&sessionId=${selected.session_id}`);
      const json = await res.json().catch(() => ({}));
      if (res.status === 402) throw new Error("This school's account is inactive, so results can't be shown right now. Please contact the school.");
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not load the results.');
      setGrades({ rows: json.data || [], layout: json.layout || null, loading: false, error: null });
    } catch (e: any) {
      if (expired(e)) return;
      setGrades({ rows: [], layout: null, loading: false, error: e?.message || 'Could not load the results.' });
    }
  }, [studentId, selected?.term, selected?.session_id]);

  useEffect(() => { if (tab === 'results') loadGrades(); }, [tab, loadGrades]);

  useEffect(() => {
    if (tab !== 'attendance' || attendance) return;
    (async () => {
      try {
        const r = await parentFetch(`/api/parents/children/${studentId}/attendance`);
        if (!r.ok) throw new Error(r.json?.error || 'Could not load attendance.');
        setAttendance(r.json.data);
      } catch (e: any) {
        if (expired(e)) return;
        setAttendance({ terms: [], recent: [], error: e?.message });
      }
    })();
  }, [tab]);

  const emailReport = async () => {
    if (!selected) return;
    try {
      setBusy(true);
      const me = await getParentData();
      const res = await childFetch(studentId, `/api/reports/email/official-report/${selected.enrollment_id}`, {
        method: 'POST', body: { term: selected.term, sessionId: selected.session_id, email: me?.email },
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 402) throw new Error("This school's account is inactive. Please contact the school.");
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not send the report card.');
      setAlert({ type: 'success', title: 'Report card sent', message: `The report card was emailed to ${me?.email}.` });
    } catch (e: any) {
      if (!expired(e)) setAlert({ type: 'error', title: 'Cannot send', message: e?.message });
    } finally { setBusy(false); }
  };

  // Web only: fetch the PDF with the child's token and download it
  const downloadPdf = async () => {
    if (!selected || Platform.OS !== 'web') return;
    try {
      setBusy(true);
      const res = await childFetch(studentId, `/api/reports/pdf/${selected.enrollment_id}?term=${selected.term}&sessionId=${selected.session_id}`);
      if (res.status === 402) throw new Error("This school's account is inactive. Please contact the school.");
      if (!res.ok) throw new Error('Could not generate the PDF.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${overview?.student?.firstName || 'report'}-term-${selected.term}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e: any) {
      if (!expired(e)) setAlert({ type: 'error', title: 'Cannot download', message: e?.message });
    } finally { setBusy(false); }
  };

  const removeChild = () => setAlert({
    type: 'warning', title: 'Remove this child?',
    message: 'They will disappear from your account. You can add them again later with the registration number and a link code from the school.',
    confirmLabel: 'Remove',
    onConfirm: async () => {
      try {
        const r = await parentFetch(`/api/parents/children/${studentId}`, { method: 'DELETE' });
        if (!r.ok) throw new Error(r.json?.error || 'Could not remove.');
        router.replace('/(parent)/dashboard' as any);
      } catch (e: any) { if (!expired(e)) setAlert({ type: 'error', title: 'Error', message: e?.message }); }
    },
  });

  const s = overview?.student;
  const name = s ? `${s.firstName} ${s.lastName}` : 'Child';

  // ── Results rendering ────────────────────────────────────────────────
  const renderResults = () => {
    if (terms.length === 0) return <Empty C={C} text="No results have been published for this child yet." />;
    if (grades.loading) return <ActivityIndicator style={{ marginTop: 30 }} color={Colors.accent.gold} />;
    if (grades.error) return <Empty C={C} text={grades.error} warn />;
    if (grades.rows.length === 0) return <Empty C={C} text="No scores for this term." />;

    const lay = grades.layout;
    const totalMax = lay?.total_max || 100;
    const avg = grades.rows.reduce((sum, r) => sum + Number(r.total_score || 0), 0) / grades.rows.length;

    return (
      <>
        <View style={[cardStyle(C), { flexDirection: 'row', justifyContent: 'space-around' }]}>
          <Stat C={C} label="SUBJECTS" value={String(grades.rows.length)} />
          <Stat C={C} label="AVERAGE" value={`${Math.round(avg * 10) / 10}`} />
          <Stat C={C} label="OUT OF" value={String(totalMax)} />
        </View>

        {grades.rows.map((row: any, i: number) => {
          const lrow = lay?.rows?.find((x: any) => x.subject_name === row.subject_name);
          const total = lrow ? Number(lrow.total_score) : Number(row.total_score || 0);
          const pct = totalMax ? (total / totalMax) * 100 : total;
          const grade = lrow ? lrow.grade : letter(total);
          const col = gradeColor(pct);
          const parts: { label: string; value: any }[] = lrow
            ? lay.columns.filter((c: any) => c.type !== 'computed').map((c: any) => ({ label: c.label, value: lrow.cells[c.key] }))
            : [
                { label: 'CA1', value: row.ca1_score }, { label: 'CA2', value: row.ca2_score },
                { label: 'CA3', value: row.ca3_score }, { label: 'CA4', value: row.ca4_score },
                { label: 'Exam', value: row.exam_score },
              ];
          const extras: { label: string; value: any }[] = lrow
            ? lay.columns.filter((c: any) => c.type === 'computed' && !['total', 'grade'].includes(c.source)).map((c: any) => ({ label: c.label, value: lrow.cells[c.key] }))
            : [];
          return (
            <View key={`${row.subject_name}-${i}`} style={cardStyle(C)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 15, fontWeight: '800', color: C.text }}>{row.subject_name}</ThemedText>
                  {!!lrow?.remark && <ThemedText style={{ fontSize: 11, color: C.textMuted }}>{lrow.remark}</ThemedText>}
                </View>
                <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                  <ThemedText style={{ fontSize: 20, fontWeight: '900', color: col }}>{total}</ThemedText>
                  <ThemedText style={{ fontSize: 10, color: C.textMuted }}>/ {totalMax}</ThemedText>
                </View>
                <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: col, alignItems: 'center', justifyContent: 'center' }}>
                  <ThemedText style={{ fontWeight: '900', color: col }}>{grade || '-'}</ThemedText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {[...parts, ...extras].filter((p) => p.value !== null && p.value !== undefined && p.value !== '').map((p, k) => (
                  <View key={k} style={{ minWidth: 64, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: C.background, borderWidth: 1, borderColor: C.divider }}>
                    <ThemedText style={{ fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: C.textMuted }}>{String(p.label).toUpperCase()}</ThemedText>
                    <ThemedText style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{typeof p.value === 'number' ? p.value : String(p.value)}</ThemedText>
                  </View>
                ))}
              </View>
              {!!row.teacher_remark && <ThemedText style={{ fontSize: 12, color: C.textSecondary, marginTop: 10, fontStyle: 'italic' }}>"{row.teacher_remark}"</ThemedText>}
            </View>
          );
        })}
      </>
    );
  };

  const TermPicker = () =>
    terms.length > 1 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {terms.map((t, i) => (
          <TouchableOpacity key={`${t.enrollment_id}-${t.term}`} onPress={() => setTermIdx(i)}
            style={{ borderWidth: 1, borderColor: i === termIdx ? '#2563EB' : C.divider, backgroundColor: i === termIdx ? '#2563EB22' : 'transparent', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 }}>
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: i === termIdx ? '#2563EB' : C.textSecondary }}>{t.session_name || 'Session'} • Term {t.term}</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    ) : null;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'results', label: 'Results', icon: 'stats-chart-outline' },
    { key: 'report', label: 'Report card', icon: 'document-text-outline' },
    { key: 'attendance', label: 'Attendance', icon: 'calendar-outline' },
    { key: 'profile', label: 'Profile', icon: 'person-outline' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader C={C} title={name} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(parent)/dashboard' as any))} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={Colors.accent.gold} /></View>
      ) : (
        <>
          <View style={{ paddingHorizontal: 16 }}>
            <ThemedText style={{ fontSize: 12, color: C.textSecondary }}>
              {overview?.enrollments?.[0]?.class_name || 'Not enrolled'}{overview?.enrollments?.[0]?.session_name ? ` • ${overview.enrollments[0].session_name}` : ''} • {overview?.school?.name}
            </ThemedText>
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginTop: 12, marginBottom: 6 }}>
            {tabs.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: tab === t.key ? '#2563EB' : 'transparent' }}>
                <Ionicons name={t.icon} size={18} color={tab === t.key ? '#2563EB' : C.textMuted} />
                <ThemedText style={{ fontSize: 10, fontWeight: '800', marginTop: 2, color: tab === t.key ? '#2563EB' : C.textMuted }} numberOfLines={1}>{t.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, maxWidth: 800, width: '100%', alignSelf: 'center' }}
            refreshControl={<RefreshControl refreshing={false} onRefresh={() => { loadOverview(); if (tab === 'results') loadGrades(); if (tab === 'attendance') setAttendance(null); }} />}>

            {tab === 'results' && (<><TermPicker />{renderResults()}</>)}

            {tab === 'report' && (
              terms.length === 0 ? <Empty C={C} text="No report cards are available yet." /> : (
                <>
                  <TermPicker />
                  <View style={cardStyle(C)}>
                    <ThemedText style={{ fontSize: 15, fontWeight: '800', color: C.text }}>{selected?.session_name} • Term {selected?.term}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: C.textSecondary, marginTop: 4, marginBottom: 14 }}>
                      {selected?.class_name} • {selected?.subjects} subject{selected?.subjects === 1 ? '' : 's'} • average total {selected?.average_total}
                    </ThemedText>
                    {Platform.OS === 'web' && (<><PrimaryButton C={C} title="DOWNLOAD PDF" onPress={downloadPdf} loading={busy} /><View style={{ height: 10 }} /></>)}
                    <PrimaryButton C={C} outline={Platform.OS === 'web'} title="EMAIL THIS REPORT CARD TO ME" onPress={emailReport} loading={busy} />
                  </View>
                </>
              )
            )}

            {tab === 'attendance' && (
              !attendance ? <ActivityIndicator style={{ marginTop: 30 }} color={Colors.accent.gold} /> :
              attendance.error ? <Empty C={C} text={attendance.error} warn /> :
              attendance.terms.length === 0 ? <Empty C={C} text="No attendance has been recorded for this child yet." /> : (
                <>
                  {attendance.terms.map((t: any) => (
                    <View key={`${t.enrollment_id}-${t.term}`} style={cardStyle(C)}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <ThemedText style={{ fontSize: 14, fontWeight: '800', color: C.text }}>{t.session_name || 'Session'} • Term {t.term}</ThemedText>
                          <ThemedText style={{ fontSize: 11, color: C.textMuted }}>{t.class_name} • school met {t.sessions_held} time{t.sessions_held === 1 ? '' : 's'}</ThemedText>
                        </View>
                        <ThemedText style={{ fontSize: 22, fontWeight: '900', color: t.percentage === null ? C.textMuted : t.percentage >= 75 ? '#10B981' : t.percentage >= 50 ? '#F59E0B' : '#EF4444' }}>
                          {t.percentage === null ? '-' : `${t.percentage}%`}
                        </ThemedText>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {(['present', 'late', 'absent', 'sick', 'excused'] as const).map((k) => (
                          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: C.background, borderWidth: 1, borderColor: C.divider }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STATUS_COLOR[k] }} />
                            <ThemedText style={{ fontSize: 11, color: C.textSecondary }}>{k[0].toUpperCase() + k.slice(1)} {t[k]}</ThemedText>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                  {attendance.recent.length > 0 && (
                    <View style={cardStyle(C)}>
                      <ThemedText style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: C.textMuted, marginBottom: 10 }}>RECENT DAYS</ThemedText>
                      {attendance.recent.map((r: any, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: C.divider }}>
                          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: STATUS_COLOR[r.status] || C.textMuted, marginRight: 10 }} />
                          <ThemedText style={{ flex: 1, fontSize: 13, color: C.text }}>{String(r.attendance_date).slice(0, 10)}{r.period && r.period !== 'full_day' ? ` (${r.period})` : ''}</ThemedText>
                          <ThemedText style={{ fontSize: 12, color: STATUS_COLOR[r.status] || C.textSecondary, fontWeight: '700' }}>{r.status}</ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )
            )}

            {tab === 'profile' && s && (
              <>
                <View style={cardStyle(C)}>
                  <Row C={C} label="Name" value={name} />
                  <Row C={C} label="Registration no." value={s.registrationNumber} />
                  <Row C={C} label="Gender" value={s.gender} />
                  <Row C={C} label="Date of birth" value={s.dateOfBirth ? String(s.dateOfBirth).slice(0, 10) : null} />
                  <Row C={C} label="Address" value={s.address} />
                  <Row C={C} label="You are the child's" value={overview.relationship} last />
                </View>
                <View style={cardStyle(C)}>
                  <ThemedText style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: C.textMuted, marginBottom: 8 }}>SCHOOL</ThemedText>
                  <Row C={C} label="Name" value={overview.school?.name} />
                  <Row C={C} label="Phone" value={overview.school?.phone} />
                  <Row C={C} label="Email" value={overview.school?.email} last />
                </View>
                {overview.enrollments?.length > 0 && (
                  <View style={cardStyle(C)}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: C.textMuted, marginBottom: 8 }}>CLASS HISTORY</ThemedText>
                    {overview.enrollments.map((e: any, i: number) => (
                      <Row key={e.enrollment_id} C={C} label={e.session_name || 'Session'} value={`${e.class_name}${e.status ? ` (${e.status})` : ''}`} last={i === overview.enrollments.length - 1} />
                    ))}
                  </View>
                )}
                <PrimaryButton C={C} outline title="REMOVE THIS CHILD FROM MY ACCOUNT" onPress={removeChild} />
              </>
            )}
          </ScrollView>
        </>
      )}
      {alert && (
        <CustomAlert type={alert.type} title={alert.title} message={alert.message} confirmLabel={alert.confirmLabel}
          onConfirm={alert.onConfirm ? () => { const fn = alert.onConfirm; setAlert(null); fn && fn(); } : undefined}
          onClose={() => setAlert(null)} />
      )}
    </View>
  );
}

const Empty = ({ C, text, warn }: any) => (
  <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
    <Ionicons name={warn ? 'alert-circle-outline' : 'file-tray-outline'} size={34} color={warn ? '#F59E0B' : C.textMuted} />
    <ThemedText style={{ textAlign: 'center', color: C.textSecondary, marginTop: 10, lineHeight: 19 }}>{text}</ThemedText>
  </View>
);

const Stat = ({ C, label, value }: any) => (
  <View style={{ alignItems: 'center' }}>
    <ThemedText style={{ fontSize: 20, fontWeight: '900', color: Colors.accent.gold }}>{value}</ThemedText>
    <ThemedText style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1, color: C.textMuted }}>{label}</ThemedText>
  </View>
);

const Row = ({ C, label, value, last }: any) =>
  value ? (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.divider }}>
      <ThemedText style={{ fontSize: 12, color: C.textMuted }}>{label}</ThemedText>
      <ThemedText style={{ fontSize: 13, fontWeight: '600', color: C.text, flexShrink: 1, textAlign: 'right', marginLeft: 16, textTransform: label === "You are the child's" ? 'capitalize' : 'none' }}>{String(value)}</ThemedText>
    </View>
  ) : null;
