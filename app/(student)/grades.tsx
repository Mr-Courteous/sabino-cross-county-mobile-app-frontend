import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Platform,
    Alert,
    RefreshControl,
    Dimensions,
    Modal,
    TextInput,
    ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { Colors } from '@/constants/design-system';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-app-colors';

const { width } = Dimensions.get('window');

interface Grade {
    subject_name: string | null;
    ca1_score: number | string | null;
    ca2_score: number | string | null;
    ca3_score: number | string | null;
    ca4_score: number | string | null;
    exam_score: number | string | null;
    student_total?: number | string | null;
    total_score?: number | string | null;
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

const getLetterGrade = (score: number) => {
    if (score >= 75) return { label: 'A', color: '#10B981', desc: 'EXCELLENT' };
    if (score >= 65) return { label: 'B', color: '#3B82F6', desc: 'VERY GOOD' };
    if (score >= 55) return { label: 'C', color: '#FACC15', desc: 'GOOD' };
    if (score >= 45) return { label: 'D', color: '#FB923C', desc: 'PASS' };
    return { label: 'F', color: '#EF4444', desc: 'FAIL' };
};

export default function StudentGrades() {
    const router = useRouter();
    const C = useAppColors();
    const styles = useMemo(() => makeStyles(C), [C.scheme]);
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
    
    // Status states
    const [downloading, setDownloading] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Error Display
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

    // Dropdown States
    const [showSessionSelector, setShowSessionSelector] = useState(false);
    const [showEnrollmentSelector, setShowEnrollmentSelector] = useState(false);
    const [showTermSelector, setShowTermSelector] = useState(false);

    // Email modal state
    const [emailModalVisible, setEmailModalVisible] = useState(false);
    const [emailInput, setEmailInput] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const getToken = async () => {
        return Platform.OS === 'web' 
            ? localStorage.getItem('studentToken') 
            : await SecureStore.getItemAsync('studentToken');
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            if (!token) {
                router.replace('/(student)');
                return;
            }

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
            } else {
                throw new Error(sessData.error || 'Failed to load academic sessions');
            }
        } catch (err: any) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'System Offline',
                message: err.message || 'Failed to initialize academic portal'
            });
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
        } finally {
            setFetchingMetadata(false);
        }
    };

    const fetchGrades = async () => {
        if (!selectedEnrollment) {
            setStatusAlert({
                visible: true,
                type: 'warning',
                title: 'Selection Required',
                message: 'Select a class enrollment to view records.'
            });
            return;
        }

        setFetchingGrades(true);
        setStatusAlert({ ...statusAlert, visible: false });
        try {
            const token = await getToken();
            const sessionIdToUse = selectedEnrollment?.session_id || selectedSessionId;
            const endpoint = `${API_BASE_URL}/api/scores/my-grades?term=${selectedTerm}&sessionId=${sessionIdToUse}`;

            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await res.json();

            if (data.success && data.data.length > 0) {
                setGrades(data.data);
                setSummary(data.summary);
            } else {
                setGrades([]);
                setSummary(null);
                setStatusAlert({
                    visible: true,
                    type: 'info',
                    title: 'No Data Records',
                    message: data.message || data.error || 'No scores recorded for this academic term.'
                });
            }
        } catch (err: any) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Connection Fault',
                message: 'Unable to synchronize with the academic database.'
            });
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
        if (enr?.session_id) setSelectedSessionId(enr.session_id);
        setGrades([]);
        setSummary(null);
    };

    const handleTermChange = (term: number) => {
        setSelectedTerm(term);
        setGrades([]);
        setSummary(null);
    };

    const sendEmailReport = useCallback(async (email: string) => {
        try {
            const token = await getToken();
            const sessionIdToUse = selectedEnrollment?.session_id || selectedSessionId;
            const emailUrl = `${API_BASE_URL}/api/reports/email/official-report/${selectedEnrollment?.enrollment_id}`;
            const response = await fetch(emailUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    term: selectedTerm,
                    sessionId: sessionIdToUse,
                    email: email.trim()
                }),
            });

            const result = await response.json();
            if (response.ok && result.success) {
                setShowSuccessModal(true);
                setSentSuccess(true);
                setTimeout(() => setSentSuccess(false), 5000);
            } else {
                throw new Error(result.error || 'Dispatch failure');
            }
        } catch (err: any) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Dispatch Error',
                message: err.message || 'Failed to transmit report via secure channel'
            });
        }
    }, [selectedEnrollment, selectedSessionId, selectedTerm]);

    const handleEmailModalSubmit = async () => {
        if (!emailInput.trim() || !emailInput.includes('@')) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Validation Error',
                message: 'Enter a valid digital address.'
            });
            return;
        }
        setEmailModalVisible(false);
        setDownloading(true);
        await sendEmailReport(emailInput.trim());
        setDownloading(false);
        setEmailInput('');
    };

    const handleEmailReport = async () => {
        if (!selectedEnrollment) return;
        if (Platform.OS === 'ios') {
            Alert.prompt(
                'Digital Delivery',
                'Enter recipient email for official report:',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Transmit',
                        onPress: async (email: string | undefined) => {
                            if (!email || !email.includes('@')) return;
                            setDownloading(true);
                            await sendEmailReport(email.trim());
                            setDownloading(false);
                        }
                    }
                ],
                'plain-text',
                '',
                'email-address'
            );
        } else {
            setEmailInput('');
            setEmailModalVisible(true);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchInitialData();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.accent.gold} />
                <ThemedText style={styles.loadingText}>SYNCHRONIZING ACADEMIC RECORDS...</ThemedText>
            </ThemedView>
        );
    }

        const MetricCard = ({ label, value, icon, color }: any) => (
            <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: color + '15' }]}>
                    <Ionicons name={icon as any} size={18} color={color} />
                </View>
                <ThemedText style={styles.metricValue}>{value}</ThemedText>
                <ThemedText style={styles.metricLabel}>{label}</ThemedText>
            </View>
        );

        const ScoreBar = ({ label, value, max }: any) => {
            const percentage = Math.min((value / max) * 100, 100);
            return (
                <View style={styles.scoreBarContainer}>
                    <View style={styles.scoreBarHeader}>
                        <ThemedText style={styles.scoreBarLabel}>{label}</ThemedText>
                        <ThemedText style={styles.scoreBarValue}>{value}/{max}</ThemedText>
                    </View>
                    <View style={styles.progressBar}>
                        <LinearGradient
                            colors={['#FACC15', '#EAB308']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressFill, { width: `${percentage}%` }]}
                        />
                    </View>
                </View>
            );
        };

    return (
        <ThemedView style={styles.container}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071&auto=format&fit=crop' }}
                style={styles.hero}
            >
                <LinearGradient
                    colors={[C.isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)', C.background]}
                    style={styles.heroOverlay}
                >
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color={C.isDark ? "#FFFFFF" : Colors.accent.navy} />
                        </TouchableOpacity>
                        <ThemedText style={styles.headerTitle}>Academic Performance</ThemedText>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.heroContent}>
                        <ThemedText style={styles.heroSubtitle}>PROXIMITY TO EXCELLENCE</ThemedText>
                        <ThemedText style={styles.heroMainTitle}>Academic Records</ThemedText>
                    </View>
                </LinearGradient>
            </ImageBackground>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" />}
            >
                {/* Custom Alert for status updates */}
                {statusAlert.visible && (
                    <CustomAlert
                        type={statusAlert.type}
                        title={statusAlert.title}
                        message={statusAlert.message}
                        onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
                        onConfirm={statusAlert.onConfirm}
                        style={styles.alert}
                    />
                )}

                {/* Filter Section */}
                <View style={styles.card}>
                    <ThemedText style={styles.cardLabel}>ACADEMIC PARAMETERS</ThemedText>
                    
                    <ThemedText style={styles.filterTitle}>Academic Session</ThemedText>
                    <TouchableOpacity 
                        style={styles.inputSelector} 
                        onPress={() => setShowSessionSelector(!showSessionSelector)}
                    >
                        <ThemedText style={styles.selectorText}>
                            {sessions.find(s => s.id === selectedSessionId)?.year_label || 'Select Session'}
                        </ThemedText>
                        <Ionicons name={showSessionSelector ? "chevron-up" : "chevron-down"} size={20} color={Colors.accent.gold} />
                    </TouchableOpacity>

                    {showSessionSelector && (
                        <View style={styles.selectorList}>
                            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                {sessions.map((sess) => (
                                    <TouchableOpacity
                                        key={sess.id}
                                        style={[styles.selectorItem, selectedSessionId === sess.id && styles.selectorItemActive]}
                                        onPress={() => {
                                            handleSessionChange(sess.id);
                                            setShowSessionSelector(false);
                                        }}
                                    >
                                        <ThemedText style={[styles.selectorItemText, selectedSessionId === sess.id && styles.selectorItemTextActive]}>
                                            {sess.year_label}
                                        </ThemedText>
                                        {selectedSessionId === sess.id && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <ThemedText style={styles.filterTitle}>Enrollment</ThemedText>
                    {fetchingMetadata ? (
                        <ActivityIndicator size="small" color="#FACC15" style={styles.inlineLoader} />
                    ) : enrollments.length > 0 ? (
                        <>
                            <TouchableOpacity 
                                style={styles.inputSelector} 
                                onPress={() => setShowEnrollmentSelector(!showEnrollmentSelector)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Ionicons name="school-outline" size={18} color={Colors.accent.gold} />
                                    <ThemedText style={styles.selectorText}>
                                        {selectedEnrollment?.class_name || 'Select Enrollment'}
                                    </ThemedText>
                                </View>
                                <Ionicons name={showEnrollmentSelector ? "chevron-up" : "chevron-down"} size={20} color={Colors.accent.gold} />
                            </TouchableOpacity>

                            {showEnrollmentSelector && (
                                <View style={styles.selectorList}>
                                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                        {enrollments.map((enr) => (
                                            <TouchableOpacity
                                                key={enr.enrollment_id}
                                                style={[styles.selectorItem, selectedEnrollment?.enrollment_id === enr.enrollment_id && styles.selectorItemActive]}
                                                onPress={() => {
                                                    handleEnrollmentChange(enr);
                                                    setShowEnrollmentSelector(false);
                                                }}
                                            >
                                                <ThemedText style={[styles.selectorItemText, selectedEnrollment?.enrollment_id === enr.enrollment_id && styles.selectorItemTextActive]}>
                                                    {enr.class_name}
                                                </ThemedText>
                                                {selectedEnrollment?.enrollment_id === enr.enrollment_id && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </>
                    ) : (
                        <ThemedText style={styles.emptyFilterText}>No active enrollments for this session</ThemedText>
                    )}

                    <ThemedText style={styles.filterTitle}>Terminal Period</ThemedText>
                    <TouchableOpacity 
                        style={styles.inputSelector} 
                        onPress={() => setShowTermSelector(!showTermSelector)}
                    >
                        <ThemedText style={styles.selectorText}>
                            TERM {selectedTerm}
                        </ThemedText>
                        <Ionicons name={showTermSelector ? "chevron-up" : "chevron-down"} size={20} color={Colors.accent.gold} />
                    </TouchableOpacity>

                    {showTermSelector && (
                        <View style={styles.selectorList}>
                            <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                {[1, 2, 3].map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.selectorItem, selectedTerm === t && styles.selectorItemActive]}
                                        onPress={() => {
                                            handleTermChange(t);
                                            setShowTermSelector(false);
                                        }}
                                    >
                                        <ThemedText style={[styles.selectorItemText, selectedTerm === t && styles.selectorItemTextActive]}>
                                            TERM {t}
                                        </ThemedText>
                                        {selectedTerm === t && <Ionicons name="checkmark-circle" size={18} color={Colors.accent.gold} />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <CustomButton
                        title={fetchingGrades ? "SYNCHRONIZING..." : "RETRIEVE RECORDS"}
                        onPress={fetchGrades}
                        variant="premium"
                        loading={fetchingGrades}
                        disabled={!selectedEnrollment}
                        style={styles.searchBtn}
                    />
                </View>

                {/* Results Section */}
                {grades.length > 0 ? (
                    <>
                        {summary && (
                            <View style={styles.summaryGrid}>
                                <MetricCard label="AVERAGE" value={summary.average_score ? `${parseFloat(summary.average_score as any).toFixed(0)}%` : '--'} icon="analytics-outline" color="#3B82F6" />
                                <MetricCard label="STATUS" value={`${summary.subjects_passed ?? 0} PASS`} icon="shield-checkmark-outline" color="#10B981" />
                            </View>
                        )}

                        <ThemedText style={styles.sectionLabel}>SUBJECT BREAKDOWN</ThemedText>
                        <View style={styles.gradesList}>
                            {grades.map((grade, idx) => {
                                const caTotal = Number(grade.ca1_score || 0) + 
                                               Number(grade.ca2_score || 0) + 
                                               Number(grade.ca3_score || 0) + 
                                               Number(grade.ca4_score || 0);
                                const examScore = Number(grade.exam_score || 0);
                                const manualTotal = caTotal + examScore;
                                
                                // Prioritize API total if it's non-zero, otherwise use manual sum
                                const total = Number(grade.student_total ?? grade.total_score) || manualTotal;
                                
                                const classAvg = grade.class_average != null ? Number(grade.class_average) : null;
                                const letterGrade = getLetterGrade(total);
                                const isAbove = classAvg != null ? total >= classAvg : true;

                                return (
                                    <View key={idx} style={styles.gradeCard}>
                                        <View style={styles.gradeHeader}>
                                            <View style={styles.subjectInfo}>
                                                <ThemedText style={styles.subjectName}>{grade.subject_name || 'Generic Subject'}</ThemedText>
                                                 <View style={styles.comparisonRow}>
                                                    <ThemedText style={styles.avgText}>Class Avg: {classAvg != null ? `${classAvg.toFixed(0)}%` : 'N/A'}</ThemedText>
                                                    {classAvg != null && (
                                                        <View style={[styles.statusBadge, { backgroundColor: isAbove ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                                                            <Ionicons name={isAbove ? 'trending-up' : 'trending-down'} size={12} color={isAbove ? '#10B981' : '#EF4444'} />
                                                            <ThemedText style={[styles.statusText, { color: isAbove ? '#10B981' : '#EF4444' }]}>
                                                                {Math.abs(total - classAvg).toFixed(0)}%
                                                            </ThemedText>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                            <View style={[styles.gradeCircle, { borderColor: letterGrade.color }]}>
                                                <ThemedText style={[styles.gradeLetter, { color: letterGrade.color }]}>{letterGrade.label}</ThemedText>
                                                <ThemedText style={[styles.gradeDesc, { color: letterGrade.color }]}>{letterGrade.desc}</ThemedText>
                                            </View>
                                        </View>

                                        <View style={styles.scoreBars}>
                                            <ScoreBar label="Continuous Assessment" value={caTotal} max={40} />
                                            <ScoreBar label="Terminal Examination" value={examScore} max={60} />
                                        </View>

                                        <View style={styles.totalRow}>
                                            <ThemedText style={styles.totalLabel}>CUMULATIVE SCORE</ThemedText>
                                            <ThemedText style={[styles.totalValue, { color: letterGrade.color }]}>{total}%</ThemedText>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        <CustomButton
                            title={downloading ? "TRANSMITTING..." : "EMAIL OFFICIAL REPORT"}
                            onPress={handleEmailReport}
                            variant="outline"
                            icon="mail-outline"
                            disabled={downloading}
                            style={styles.dispatchBtn}
                        />
                    </>
                ) : (
                    !fetchingGrades && (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="document-text-outline" size={48} color={C.textMuted} />
                            </View>
                            <ThemedText style={styles.emptyTitle}>Secure Records Portal</ThemedText>
                            <ThemedText style={styles.emptyDesc}>Select academic parameters above to decrypt and view performance analytics.</ThemedText>
                        </View>
                    )
                )}
            </ScrollView>

            {/* Email Input Modal */}
            <Modal 
                visible={emailModalVisible} 
                transparent 
                animationType="fade"
                onRequestClose={() => setEmailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: C.modalBg }]}>
                        <ThemedText style={styles.modalTitle}>Secure Dispatch</ThemedText>
                        <ThemedText style={styles.modalSubtitle}>Enter destination address for academic credentials</ThemedText>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="recipient@institution.edu"
                            placeholderTextColor={C.textMuted}
                            value={emailInput}
                            onChangeText={setEmailInput}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setEmailModalVisible(false)}>
                                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmit} onPress={handleEmailModalSubmit}>
                                <ThemedText style={styles.modalSubmitText}>Transmit</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Success Modal */}
            <Modal 
                visible={showSuccessModal} 
                transparent 
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: C.modalBg }]}>
                        <View style={styles.successIcon}>
                            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                        </View>
                        <ThemedText style={styles.modalTitle}>Transmission Success</ThemedText>
                        <ThemedText style={styles.modalSubtitle}>Official records have been verified and transmitted to the requested destination.</ThemedText>
                        <CustomButton title="ACKNOWLEDGE" onPress={() => setShowSuccessModal(false)} variant="premium" />
                    </View>
                </View>
            </Modal>
        </ThemedView>
    );
}


function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: C.background },
        loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
        loadingText: { color: C.textSecondary, marginTop: 15, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
        
        hero: { height: 280, width: '100%' },
        heroOverlay: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
        header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 },
        backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
        headerTitle: { color: C.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
        heroContent: { marginTop: 'auto', marginBottom: 30 },
        heroSubtitle: { color: Colors.accent.gold, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
        heroMainTitle: { color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 },

        scrollView: { flex: 1, marginTop: -30 },
        scrollContent: { padding: 20, paddingBottom: 60 },
        alert: { marginBottom: 20 },

        card: { backgroundColor: C.card, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 24 },
        cardLabel: { color: Colors.accent.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 20 },
        filterTitle: { color: C.textLabel, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, marginTop: 24, textTransform: 'uppercase' },
        
        inputSelector: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: C.inputBg,
            borderRadius: 16,
            paddingHorizontal: 20,
            height: 60,
            borderWidth: 1,
            borderColor: C.inputBorder,
        },
        selectorText: { color: C.inputText, fontSize: 15, fontWeight: '700' },
        
        selectorList: {
            backgroundColor: C.modalBg,
            borderRadius: 20,
            marginTop: 8,
            padding: 8,
            borderWidth: 1,
            borderColor: C.cardBorder,
            overflow: 'hidden',
        },
        selectorItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: 12,
        },
        selectorItemActive: { backgroundColor: 'rgba(250, 204, 21, 0.1)' },
        selectorItemText: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },
        selectorItemTextActive: { color: Colors.accent.gold, fontWeight: '800' },

        pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
        pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: C.actionItemBg, borderWidth: 1, borderColor: C.cardBorder },
        pillActive: { backgroundColor: Colors.accent.gold + '20', borderColor: Colors.accent.gold },
        pillText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
        pillTextActive: { color: Colors.accent.gold, fontWeight: '800' },
        
        classPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: C.actionItemBg, marginRight: 10, borderWidth: 1, borderColor: C.cardBorder },
        classPillActive: { backgroundColor: Colors.accent.gold, borderColor: Colors.accent.gold },
        classPillText: { color: C.textSecondary, fontSize: 13, fontWeight: '700' },
        classPillTextActive: { color: Colors.accent.navy, fontWeight: '800' },
        emptyFilterText: { color: C.textMuted, fontSize: 12, fontStyle: 'italic', marginVertical: 8 },

        inlineLoader: { marginVertical: 10, alignSelf: 'flex-start' },

        searchBtn: { height: 56 },

        summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
        metricCard: { flex: 1, backgroundColor: C.card, borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder },
        metricIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
        metricValue: { color: C.text, fontSize: 16, fontWeight: '900' },
        metricLabel: { color: C.textSecondary, fontSize: 10, fontWeight: '700', marginTop: 2 },

        sectionLabel: { color: Colors.accent.gold, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
        gradesList: { gap: 16, marginBottom: 30 },
        gradeCard: { backgroundColor: C.card, borderRadius: 32, padding: 20, borderWidth: 1, borderColor: C.cardBorder },
        gradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
        subjectInfo: { flex: 1 },
        subjectName: { color: C.text, fontSize: 18, fontWeight: '900', marginBottom: 6 },
        comparisonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        avgText: { color: C.textSecondary, fontSize: 11, fontWeight: '600' },
        statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
        statusText: { fontSize: 10, fontWeight: '800' },
        gradeCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
        gradeLetter: { fontSize: 24, fontWeight: '900', marginBottom: -4 },
        gradeDesc: { fontSize: 8, fontWeight: '800', opacity: 0.8 },

        scoreBars: { gap: 16, marginBottom: 20 },
        scoreBarContainer: { gap: 6 },
        scoreBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        scoreBarLabel: { color: C.textSecondary, fontSize: 11, fontWeight: '700' },
        scoreBarValue: { color: C.text, fontSize: 11, fontWeight: '800' },
        progressBar: { height: 6, backgroundColor: C.divider, borderRadius: 3, overflow: 'hidden' },
        progressFill: { height: '100%', borderRadius: 3 },

        totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: C.divider },
        totalLabel: { color: C.textSecondary, fontSize: 11, fontWeight: '800' },
        totalValue: { fontSize: 20, fontWeight: '900' },
        dispatchBtn: { height: 56, marginTop: 10 },

        emptyState: { padding: 40, alignItems: 'center', backgroundColor: C.card, borderRadius: 32, borderWidth: 1, borderColor: C.cardBorder },
        emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.actionItemBg, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
        emptyTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },
        emptyDesc: { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },

        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
        modalContent: { width: '100%', borderRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder },
        modalTitle: { color: C.text, fontSize: 24, fontWeight: '900', marginBottom: 12 },
        modalSubtitle: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
        modalInput: { width: '100%', height: 60, backgroundColor: C.inputBg, borderRadius: 16, paddingHorizontal: 20, color: C.inputText, fontSize: 16, borderWidth: 1, borderColor: C.inputBorder, marginBottom: 24 },
        modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
        modalCancel: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, borderSize: 1, borderColor: C.divider },
        modalCancelText: { color: C.textSecondary, fontSize: 15, fontWeight: '700' },
        modalSubmit: { flex: 2, height: 56, backgroundColor: Colors.accent.gold, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
        modalSubmitText: { color: Colors.accent.navy, fontSize: 15, fontWeight: '800' },
        successIcon: { marginBottom: 24 }
    });
}
