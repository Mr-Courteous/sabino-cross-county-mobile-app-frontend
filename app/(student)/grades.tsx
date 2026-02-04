import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Platform,
    Alert,
    RefreshControl,
    Linking,
    Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '@/utils/api-service';

const { width } = Dimensions.get('window');

interface Grade {
    subject_name: string | null;
    ca1_score: number | string | null;
    ca2_score: number | string | null;
    ca3_score: number | string | null;
    ca4_score: number | string | null;
    exam_score: number | string | null;
    student_total?: number | string | null; // some endpoints return `student_total`
    total_score?: number | string | null; // others return `total_score`
    class_average?: number | string | null;
}

interface Enrollment {
    enrollment_id: number;
    session_id: number;
    academic_year_label: string;
    academic_session: string;
    enrollment_status: string;
    class_id: number;
    class_name: string;
    created_at: string;
}

interface Session {
    id: number;
    year_label: string;
}

interface Summary {
    position?: number | string | null;
    total_students?: number | string | null;
    student_total_score?: number | string | null;
    average_score?: number | string | null;
    subjects_passed?: number | string | null;
    subjects_failed?: number | string | null;
}

const getToken = async () => {
    if (Platform.OS !== 'web') return await SecureStore.getItemAsync('studentToken');
    return localStorage.getItem('studentToken');
};

const getLetterGrade = (score: number) => {
    if (score >= 75) return { label: 'A', color: '#10B981' };
    if (score >= 65) return { label: 'B', color: '#3B82F6' };
    if (score >= 55) return { label: 'C', color: '#FACC15' };
    if (score >= 45) return { label: 'D', color: '#FB923C' };
    return { label: 'F', color: '#EF4444' };
};

export default function StudentGrades() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Selectors
    const [sessions, setSessions] = useState<Session[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
    const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
    const [selectedTerm, setSelectedTerm] = useState<number>(1);

    // Data
    const [grades, setGrades] = useState<Grade[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [fetchingMetadata, setFetchingMetadata] = useState(false);
    const [fetchingGrades, setFetchingGrades] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            if (!token) {
                router.replace('/(student)');
                return;
            }

            // Fetch Academic Years
            const sessRes = await fetch(`${API_BASE_URL}/api/academic-years`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const sessData = await sessRes.json();

            if (sessData.success) {
                setSessions(sessData.data);
                if (sessData.data.length > 0) {
                    const latest = sessData.data[0];
                    setSelectedSessionId(latest.id);
                    await fetchSessionEnrollments(latest.id);
                }
            }
        } catch (error) {
            console.error('Initial fetch error:', error);
            Alert.alert('Error', 'Failed to initialize academic portal');
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionEnrollments = async (sessionId: number) => {
        setFetchingMetadata(true);
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/api/students/me/enrollments/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setEnrollments(data.data);
                if (data.data.length > 0) {
                    setSelectedEnrollment(data.data[0]);
                } else {
                    setSelectedEnrollment(null);
                }
            }
        } catch (error) {
            console.error('Enrollment fetch error:', error);
        } finally {
            setFetchingMetadata(false);
        }
    };

    const fetchGrades = async () => {
        if (!selectedEnrollment || !selectedSessionId) {
            Alert.alert('Missing Selection', 'Please select a session and class enrollment.');
            return;
        }

        setFetchingGrades(true);
        try {
            const token = await getToken();

            // Fetch detailed scores and summary stats from my-grades endpoint
            // prefer the enrollment's session_id when available (ensures accuracy)
            const sessionIdToUse = selectedEnrollment?.session_id || selectedSessionId;
            const res = await fetch(`${API_BASE_URL}/api/scores/my-grades?term=${selectedTerm}&sessionId=${sessionIdToUse}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            // Debugging logs
            console.log('🟣 fetchGrades: my-grades data =>', data);

            if (data.success) {
                setGrades(data.data);
                setSummary(data.summary);
            } else {
                setGrades([]);
                setSummary(null);
                Alert.alert('No Records', 'No scores found for the selected period.');
            }

        } catch (error) {
            console.error('Grades fetch error:', error);
            Alert.alert('Error', 'Could not retrieve academic records');
        } finally {
            setFetchingGrades(false);
        }
    };

    const handleSessionChange = (id: number) => {
        setSelectedSessionId(id);
        setEnrollments([]);
        setSelectedEnrollment(null);
        setGrades([]);
        setSummary(null);
        fetchSessionEnrollments(id);
    };

    const handleEnrollmentChange = (enr: Enrollment) => {
        setSelectedEnrollment(enr);
        // Keep selected session in sync with chosen enrollment to avoid mismatches
        if (enr?.session_id) {
            setSelectedSessionId(enr.session_id);
        }
        setGrades([]);
        setSummary(null);
    };

    const handleTermChange = (term: number) => {
        setSelectedTerm(term);
        setGrades([]);
        setSummary(null);
    };

    const handleDownloadReport = async () => {
        if (!selectedEnrollment) {
            Alert.alert('Error', 'Please select an enrollment first');
            return;
        }

        setDownloading(true);
        try {
            const token = await getToken();
            if (!token) {
                Alert.alert('Error', 'Authentication required. Please login again.');
                return;
            }

            const sessionIdToUse = selectedEnrollment?.session_id || selectedSessionId;
            const downloadUrl = `${API_BASE_URL}/api/reports/download/official-report/${selectedEnrollment.enrollment_id}?term=${selectedTerm}&sessionId=${sessionIdToUse}`;
            const fileName = `Official_Report_${selectedEnrollment.class_name}_T${selectedTerm}.pdf`;

            if (Platform.OS === 'web') {
                // For web, fetch the PDF and download as blob
                try {
                    const response = await fetch(downloadUrl, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const blob = await response.blob();
                    
                    // Create blob URL and trigger download
                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    
                    // Cleanup
                    setTimeout(() => {
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(blobUrl);
                    }, 100);

                    Alert.alert('Success', `Report downloaded: ${fileName}`);
                } catch (fetchError) {
                    console.error('Fetch error:', fetchError);
                    throw fetchError;
                }
            } else {
                // For mobile, download to device
                const fileUri = `${FileSystem.documentDirectory}${fileName}`;

                console.log('Downloading from:', downloadUrl);
                console.log('Saving to:', fileUri);

                const result = await FileSystem.downloadAsync(downloadUrl, fileUri, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (result?.status === 200) {
                    console.log('PDF downloaded to:', result.uri);
                    Alert.alert('Success', 'Report card downloaded successfully.', [
                        { text: 'View', onPress: () => Linking.openURL(result.uri!) },
                        { text: 'Done' }
                    ]);
                } else {
                    throw new Error('Download failed with status: ' + result?.status);
                }
            }
        } catch (error) {
            console.error('Download Error:', error);
            Alert.alert('Download Failed', error instanceof Error ? error.message : 'Failed to download report card');
        } finally {
            setDownloading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchInitialData();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FACC15" />
                <Text style={styles.loadingText}>Loading Academic Portal...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.gradient}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Academic Results</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" />}
                >
                    {/* Drill-down Selectors */}
                    <View style={styles.filterCard}>
                        {/* 1. Academic Session */}
                        <Text style={styles.filterLabel}>Academic Session</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                            {sessions.map((sess) => (
                                <TouchableOpacity
                                    key={sess.id}
                                    style={[styles.pill, selectedSessionId === sess.id && styles.pillActive]}
                                    onPress={() => handleSessionChange(sess.id)}
                                >
                                    <Text style={[styles.pillText, selectedSessionId === sess.id && styles.pillTextActive]}>
                                        {sess.year_label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* 2. Enrollment / Class */}
                        <Text style={[styles.filterLabel, { marginTop: 20 }]}>Available Enrollments</Text>
                        {fetchingMetadata ? (
                            <ActivityIndicator size="small" color="#FACC15" style={{ alignSelf: 'flex-start', marginVertical: 10 }} />
                        ) : enrollments.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                                {enrollments.map((enr) => (
                                    <TouchableOpacity
                                        key={enr.enrollment_id}
                                        style={[styles.classPill, selectedEnrollment?.enrollment_id === enr.enrollment_id && styles.classPillActive]}
                                        onPress={() => handleEnrollmentChange(enr)}
                                    >
                                        <Ionicons
                                            name="school-outline"
                                            size={16}
                                            color={selectedEnrollment?.enrollment_id === enr.enrollment_id ? "#0F172A" : "#FACC15"}
                                        />
                                        <Text style={[styles.classPillText, selectedEnrollment?.enrollment_id === enr.enrollment_id && styles.classPillTextActive]}>
                                            {enr.class_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.emptyFilterText}>No classes found for this session</Text>
                        )}

                        {/* 3. Term Selection */}
                        <Text style={[styles.filterLabel, { marginTop: 20 }]}>Academic Term</Text>
                        <View style={styles.termGrid}>
                            {[1, 2, 3].map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.termOption, selectedTerm === t && styles.termActive]}
                                    onPress={() => handleTermChange(t)}
                                >
                                    <Text style={[styles.termText, selectedTerm === t && styles.termTextActive]}>Term {t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Search Action */}
                        <TouchableOpacity
                            style={[styles.searchBtn, (!selectedEnrollment || fetchingGrades) && styles.searchBtnDisabled]}
                            onPress={fetchGrades}
                            disabled={!selectedEnrollment || fetchingGrades}
                        >
                            <LinearGradient colors={['#FACC15', '#EAB308']} style={styles.searchGradient}>
                                {fetchingGrades ? (
                                    <ActivityIndicator color="#0F172A" />
                                ) : (
                                    <>
                                        <Ionicons name="analytics" size={20} color="#0F172A" />
                                        <Text style={styles.searchBtnText}>View My Performance</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Results Display */}
                    {grades.length > 0 ? (
                        <>
                            {summary && (
                                <View style={styles.summaryContainer}>
                                    <MetricCard label="Class Rank" value={`${summary.position ?? '-'} / ${summary.total_students ?? '-'}`} icon="trophy" color="#FACC15" />
                                    <MetricCard label="Average" value={summary.average_score ? `${parseFloat(summary.average_score as any).toFixed(1)}%` : 'N/A'} icon="trending-up" color="#3B82F6" />
                                    <MetricCard label="Standing" value={`${summary.subjects_passed ?? 0} / ${((Number(summary.subjects_passed) || 0) + (Number(summary.subjects_failed) || 0))}`} icon="ribbon" color="#10B981" />
                                </View>
                            )}

                            <View style={styles.gradesList}>
                                {grades.map((grade, idx) => {
                                    // Normalize numeric fields (they may come as strings or null)
                                    const ca1 = Number(grade.ca1_score) || 0;
                                    const ca2 = Number(grade.ca2_score) || 0;
                                    const ca3 = Number(grade.ca3_score) || 0;
                                    const ca4 = Number(grade.ca4_score) || 0;
                                    const exam = Number(grade.exam_score) || 0;
                                    const total = Number(grade.student_total ?? grade.total_score) || 0;
                                    const classAvg = grade.class_average !== undefined && grade.class_average !== null ? Number(grade.class_average) : null;

                                    const letterGrade = getLetterGrade(total);
                                    const diff = classAvg !== null ? (total - classAvg).toFixed(1) : '—';
                                    const isAbove = diff !== '—' ? parseFloat(diff) >= 0 : false;

                                    return (
                                        <View key={idx} style={styles.gradeCard}>
                                            <View style={styles.gradeHeader}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.subjectTitle}>{grade.subject_name || 'Subject'}</Text>
                                                    <View style={styles.compRow}>
                                                        <Text style={styles.avgText}>Avg: {classAvg !== null ? `${classAvg.toFixed(1)}%` : 'N/A'}</Text>
                                                        <View style={[styles.diffBadge, { backgroundColor: isAbove ? '#10B98120' : '#EF444420' }]}>
                                                            <Text style={[styles.diffValue, { color: isAbove ? '#10B981' : '#EF4444' }]}>
                                                                {diff === '—' ? '—' : `${isAbove ? '+' : ''}${diff}%`}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <View style={[styles.letterBox, { backgroundColor: letterGrade.color + '15' }]}>
                                                    <Text style={[styles.letterChar, { color: letterGrade.color }]}>{letterGrade.label}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.breakdown}>
                                                <ScorePart label="CA" val={ca1 + ca2 + ca3 + ca4} max={40} />
                                                <ScorePart label="Exam" val={exam} max={60} />
                                                <View style={styles.totalBlock}>
                                                    <Text style={styles.totalLabel}>Grand Total</Text>
                                                    <Text style={styles.totalNum}>{total || '—'}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.barContainer}>
                                                <View style={[styles.barFill, { width: `${Math.min(total, 100)}%`, backgroundColor: letterGrade.color }]} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            <TouchableOpacity style={styles.downloadAction} onPress={handleDownloadReport} disabled={downloading}>
                                <LinearGradient colors={['#FACC15', '#EAB308']} style={styles.downloadGradientOuter}>
                                    <Ionicons name="cloud-download" size={24} color="#0F172A" />
                                    <Text style={styles.downloadActionText}>{downloading ? 'Processing File...' : 'Download Official Report'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    ) : (
                        !fetchingGrades && (
                            <View style={styles.emptyState}>
                                <Ionicons name="search-outline" size={80} color="#334155" />
                                <Text style={styles.emptyTitle}>Ready to Check?</Text>
                                <Text style={styles.emptyDesc}>Select your academic details above and tap "View My Performance" to see your grades.</Text>
                            </View>
                        )
                    )}
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

function MetricCard({ label, value, icon, color }: any) {
    return (
        <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon as any} size={20} color={color} />
            </View>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

function ScorePart({ label, val, max }: any) {
    return (
        <View style={styles.scorePart}>
            <Text style={styles.scorePartLabel}>{label}</Text>
            <Text style={styles.scorePartVal}>{val}<Text style={styles.scorePartMax}>/{max}</Text></Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    loadingContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#94A3B8', marginTop: 20, fontSize: 16, fontWeight: '600' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingTop: 60, paddingBottom: 25 },
    backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.08)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    scrollContent: { padding: 20, paddingBottom: 50 },

    // Filters
    filterCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 32, padding: 24, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    filterLabel: { color: '#64748B', fontSize: 12, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5 },
    hScroll: { flexDirection: 'row', marginBottom: 5 },
    pill: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    pillActive: { backgroundColor: 'rgba(250, 204, 21, 0.12)', borderColor: '#FACC15' },
    pillText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
    pillTextActive: { color: '#FACC15', fontWeight: '800' },
    classPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(250, 204, 21, 0.05)', marginRight: 10, borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.2)' },
    classPillActive: { backgroundColor: '#FACC15', borderColor: '#FACC15' },
    classPillText: { color: '#FACC15', fontSize: 14, fontWeight: '700' },
    classPillTextActive: { color: '#0F172A', fontWeight: '800' },
    emptyFilterText: { color: '#475569', fontSize: 13, fontStyle: 'italic', marginVertical: 10 },
    termGrid: { flexDirection: 'row', gap: 10 },
    termOption: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    termActive: { backgroundColor: 'rgba(250, 204, 21, 0.12)', borderColor: '#FACC15' },
    termText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
    termTextActive: { color: '#FACC15', fontWeight: '800' },
    searchBtn: { marginTop: 25, borderRadius: 20, overflow: 'hidden' },
    searchBtnDisabled: { opacity: 0.5 },
    searchGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
    searchBtnText: { color: '#0F172A', fontSize: 16, fontWeight: '900' },

    // Summary
    summaryContainer: { flexDirection: 'row', gap: 12, marginBottom: 35 },
    metricCard: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    metricIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    metricValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
    metricLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', marginTop: 4 },

    // Results
    gradesList: { gap: 20 },
    gradeCard: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
    gradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    subjectTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    compRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    avgText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
    diffBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    diffValue: { fontSize: 11, fontWeight: '800' },
    letterBox: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    letterChar: { fontSize: 28, fontWeight: '900' },
    breakdown: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 20, borderRadius: 24, marginBottom: 20 },
    scorePart: { gap: 4 },
    scorePartLabel: { color: '#64748B', fontSize: 11, fontWeight: '800' },
    scorePartVal: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    scorePartMax: { color: '#334155', fontSize: 12 },
    totalBlock: { alignItems: 'flex-end', gap: 4 },
    totalLabel: { color: '#FACC15', fontSize: 11, fontWeight: '800' },
    totalNum: { color: '#FACC15', fontSize: 24, fontWeight: '950' },
    barContainer: { height: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 5, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5 },

    // Footer Action
    downloadAction: { marginTop: 40, marginBottom: 20, borderRadius: 24, overflow: 'hidden', elevation: 10, shadowColor: '#FACC15', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
    downloadGradientOuter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 22, gap: 15 },
    downloadActionText: { color: '#0F172A', fontSize: 18, fontWeight: '900' },

    // Empty
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 25 },
    emptyDesc: { color: '#64748B', fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 24 },
});
