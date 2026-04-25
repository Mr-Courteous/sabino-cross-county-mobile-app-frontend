import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Image,
    Platform,
    Alert,
    RefreshControl,
    Modal,
    FlatList,
    Linking,
    ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { clearAllStorage } from '@/utils/storage';
import Footer from '../components/Footer';
import EditProfileModal from '../../components/EditProfileModal';
import { Colors } from '@/constants/design-system';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';

interface StudentData {
    id: number;
    school_id: number;
    first_name: string;
    last_name: string;
    email: string;
    registration_number: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    photo?: string;
    school_name?: string;
}

export default function StudentDashboard() {
    const router = useRouter();
    const C = useAppColors();
    const styles = useMemo(() => makeStyles(C), [C.scheme]);

    function CompactActionCard({ icon, label, color, onPress }: any) {
        return (
            <TouchableOpacity style={styles.compactCard} onPress={onPress}>
                <View style={[styles.compactIcon, { backgroundColor: `${color}15` }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <Text style={styles.compactLabel}>{label}</Text>
            </TouchableOpacity>
        );
    }

    const [student, setStudent] = useState<StudentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Enrollment State
    const [enrollModalVisible, setEnrollModalVisible] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState<string>('');
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [enrollLoading, setEnrollLoading] = useState(false);
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
    const [editProfileVisible, setEditProfileVisible] = useState(false);
    const [showSessionSelector, setShowSessionSelector] = useState(false);
    const [showClassSelector, setShowClassSelector] = useState(false);

    // Modal Feedback State (Standard React State)
    const [enrollError, setEnrollError] = useState<string | null>(null);
    const [enrollSuccess, setEnrollSuccess] = useState(false);

    useEffect(() => {
        if (!enrollModalVisible) {
            setEnrollError(null);
            setEnrollSuccess(false);
        }
    }, [enrollModalVisible]);

    useEffect(() => {
        loadStudentData();
        fetchMyEnrollments();
    }, []);

    const fetchMyEnrollments = async () => {
        try {
            const token = Platform.OS === 'web'
                ? localStorage.getItem('studentToken')
                : await SecureStore.getItemAsync('studentToken');

            if (!token) return;

            const res = await fetch(`${API_BASE_URL}/api/students/me/enrollments`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (data && data.success) {
                setEnrollments(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load enrollments:', error);
        }
    };

    const loadStudentData = async () => {
        try {
            let studentData: string | null = null;

            if (Platform.OS === 'web') {
                studentData = localStorage.getItem('studentData');
            } else {
                studentData = await SecureStore.getItemAsync('studentData');
            }

            if (studentData) {
                setStudent(JSON.parse(studentData));
            } else {
                router.replace('/(student)');
            }
        } catch (error) {
            console.error('Error loading student data:', error);
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'System Error',
                message: 'Failed to synchronize profile data.'
            });
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadStudentData(), fetchMyEnrollments()]);
        setRefreshing(false);
    };

    const performLogout = async () => {
        await clearAllStorage();
        router.replace('/');
    };

    const handleLogout = async () => {
        setStatusAlert({
            visible: true,
            type: 'warning',
            title: 'Terminate Session',
            message: 'Are you sure you want to exit the premium portal?',
            onConfirm: performLogout
        });
    };

    const handleEditProfile = () => {
        setEditProfileVisible(true);
    };

    const openEnrollmentModal = async () => {
        setEnrollModalVisible(true);
        await fetchEnrollmentOptions();
    };

    const fetchEnrollmentOptions = async () => {
        try {
            const token = Platform.OS === 'web'
                ? localStorage.getItem('studentToken')
                : await SecureStore.getItemAsync('studentToken');

            if (!token) return;

            const [sessionRes, classRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/academic-sessions`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/classes`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const sessionData = await sessionRes.json();
            const classData = await classRes.json();

            if (sessionData.success) {
                setSessions(sessionData.data);
                if (sessionData.data.length > 0) {
                    setSelectedSession(sessionData.data[0].year_label || sessionData.data[0].session_name);
                }
            }
            if (classData.success) {
                setClasses(classData.data);
            }
        } catch (error) {
            setEnrollError('Failed to load enrollment protocols. Check connection.');
        }
    };

    const handleSelfEnroll = async () => {
        if (!selectedSession || !selectedClassId) {
            setEnrollError('Select session and class to proceed.');
            return;
        }

        setEnrollLoading(true);
        setEnrollError(null);
        try {
            const token = Platform.OS === 'web'
                ? localStorage.getItem('studentToken')
                : await SecureStore.getItemAsync('studentToken');

            const response = await fetch(`${API_BASE_URL}/api/students/self-enroll`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    academicSession: selectedSession,
                    classId: selectedClassId
                })
            });

            const data = await response.json();

            if (data.success) {
                setEnrollSuccess(true);
                setEnrollError(null);
                onRefresh();
            } else {
                setEnrollError(data.error || data.message || 'Enrollment Sequence Failed');
            }
        } catch (error) {
            setEnrollError('Fatal Network Interruption');
        } finally {
            setEnrollLoading(false);
        }
    };

    const handleViewGrades = (enrollment: any) => {
        const enrollmentId = enrollment.enrollment_id || enrollment.id;
        const sessionId = enrollment.session_id || enrollment.academic_session_id;
        router.push(`/(student)/grades?enrollmentId=${enrollmentId}&sessionId=${sessionId}`);
    };

    const handlePrintReport = async (enrollment: any) => {
        try {
            const enrollmentId = enrollment.enrollment_id || enrollment.id;
            const sessionId = enrollment.session_id || enrollment.academic_session_id;



            const token = Platform.OS === 'web'
                ? localStorage.getItem('studentToken')
                : await SecureStore.getItemAsync('studentToken');

            const url = `${API_BASE_URL}/api/students/me/enrollments/${sessionId}/report?enrollmentId=${enrollmentId}&accessToken=${encodeURIComponent(token || '')}`;
            await Linking.openURL(url);
        } catch (error) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Report Error',
                message: 'Unable to retrieve printable document.'
            });
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.accent.gold} />
                <Text style={styles.loadingText}>Syncing portal data...</Text>
            </View>
        );
    }

    if (!student) return null;

    return (
        <View style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {statusAlert.visible && (
                    <CustomAlert
                        type={statusAlert.type}
                        title={statusAlert.title}
                        message={statusAlert.message}
                        onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
                        onConfirm={statusAlert.onConfirm}
                        style={{ marginHorizontal: 24, marginVertical: 10 }}
                    />
                )}
                {/* Hero Header */}
                <ImageBackground
                    source={{ uri: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070' }}
                    style={styles.heroHeader}
                    imageStyle={{ borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
                >
                    <LinearGradient
                        colors={C.isDark ? ['rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.95)'] : ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.95)']}
                        style={styles.heroOverlay}
                    >
                        <View style={styles.topRow}>
                            <View style={styles.logoBadge}>
                                <Ionicons name="school" size={18} color="#FACC15" />
                                <Text style={styles.logoText}>PREMIUM PORTAL</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity style={styles.settingsFab} onPress={() => router.push('/(student)/preferences' as any)}>
                                    <Ionicons name="settings-outline" size={20} color={Colors.accent.gold} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.logoutFab} onPress={handleLogout}>
                                    <Ionicons name="power" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.welcomeInfo}>
                            <Text style={styles.greeting}>ACCESS GRANTED</Text>
                            <Text style={styles.studentName}>{student.first_name} {student.last_name}</Text>
                            <View style={styles.regBadge}>
                                <Text style={styles.regText}>{student.registration_number}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </ImageBackground>

                {/* Profile Snapshot */}
                <View style={[styles.section, { marginTop: -25 }]}>
                    <View style={styles.glassCard}>
                        <View style={styles.profileSummary}>
                            <View style={styles.avatarLarge}>
                                {student.photo ? (
                                    <Image source={{ uri: student.photo }} style={styles.avatarImg} />
                                ) : (
                                    <View style={styles.avatarLargePlaceholder}>
                                        <Text style={styles.avatarLargeText}>
                                            {student.first_name[0]}{student.last_name[0]}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.onlineSignal} />
                            </View>

                            <View style={styles.idInfo}>
                                <Text style={styles.idTitle}>ACADEMIC IDENTITY</Text>
                                <Text style={styles.idValue}>{student.school_name || 'Global Academy'}</Text>
                                <TouchableOpacity style={styles.editProfileBtn} onPress={handleEditProfile}>
                                    <Ionicons name="pencil-sharp" size={14} color="#FACC15" />
                                    <Text style={styles.editProfileText}>UPDATE PROFILE</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.miniStats}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>ENROLLMENTS</Text>
                                <Text style={styles.statValue}>{enrollments.length}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>GENDER</Text>
                                <Text style={styles.statValue}>{student.gender || 'N/A'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Grid Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>OPERATIONS CENTER</Text>
                    <View style={styles.actionGrid}>
                        <CompactActionCard
                            icon="add-circle"
                            label="ENROLL"
                            color="#FACC15"
                            onPress={openEnrollmentModal}
                        />
                        <CompactActionCard
                            icon="analytics"
                            label="REPORTS"
                            color="#3B82F6"
                            onPress={() => router.push('/(student)/grades')}
                        />
                    </View>
                </View>

                {/* Enrollment Registry */}
                <View style={[styles.section, { marginBottom: 0 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>ACADEMIC REGISTRY</Text>
                        <TouchableOpacity onPress={onRefresh}>
                            <Ionicons name="reload" size={16} color="#475569" />
                        </TouchableOpacity>
                    </View>

                    {enrollments.length === 0 ? (
                        <View style={styles.emptyRegistry}>
                            <Ionicons name="file-tray-outline" size={40} color="#334155" />
                            <Text style={styles.emptyTitle}>NO ACTIVE REGISTRATIONS</Text>
                            <Text style={styles.emptyDesc}>Initialize your academic journey using the Self Enroll tool.</Text>
                        </View>
                    ) : (
                        enrollments.map((item, idx) => (
                            <View key={idx} style={[styles.registryItem, idx === enrollments.length - 1 && { marginBottom: 0 }]}>
                                <View style={styles.registryIcon}>
                                    <Ionicons name="ribbon" size={24} color="#FACC15" />
                                </View>
                                <View style={styles.registryInfo}>
                                    <Text style={styles.regSession}>{item.session_name || item.year_label}</Text>
                                    <Text style={styles.regClass}>{item.class_name || item.display_name}</Text>
                                    <View style={styles.regActions}>
                                        <TouchableOpacity style={styles.regBtn} onPress={() => handleViewGrades(item)}>
                                            <Ionicons name="eye" size={14} color="#FACC15" />
                                            <Text style={styles.regBtnText}>VIEW GRADES</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Flexible spacer to push footer to bottom if screen is short, but keeps it close otherwise */}
                <View style={{ flex: 1 }} />
                <View style={{ paddingBottom: 20, paddingTop: 10 }}>
                    <Footer onLogout={handleLogout} />
                </View>
            </ScrollView>

            {/* Premium Enrollment Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={enrollModalVisible}
                onRequestClose={() => setEnrollModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[styles.modalContent, { backgroundColor: C.modalBg }]}
                    >
                        <View style={styles.modalIndictor} />
                        
                        {enrollSuccess ? (
                            <View style={styles.successContainer}>
                                <View style={styles.successIconCircle}>
                                    <Ionicons name="checkmark-done-circle" size={80} color="#10B981" />
                                </View>
                                <Text style={styles.successTitle}>PROTOCOL FINALIZED</Text>
                                <Text style={styles.successDesc}>Your academic enrollment has been securely registered in the registry.</Text>
                                
                                <TouchableOpacity 
                                    style={styles.doneBtn} 
                                    onPress={() => setEnrollModalVisible(false)}
                                >
                                    <Text style={styles.doneBtnText}>CLOSE & REFRESH</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>SELF ENROLLMENT</Text>
                                    <TouchableOpacity onPress={() => setEnrollModalVisible(false)} style={styles.closeBtn}>
                                        <Ionicons name="close" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                {enrollError && (
                                    <View style={styles.errorBanner}>
                                        <Ionicons name="alert-circle" size={20} color="#fff" />
                                        <Text style={styles.errorBannerText}>{enrollError}</Text>
                                        <TouchableOpacity onPress={() => setEnrollError(null)}>
                                            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={styles.formLabel}>ACADEMIC SESSION</Text>
                                        <TouchableOpacity 
                                            style={styles.inputSelector} 
                                            onPress={() => setShowSessionSelector(!showSessionSelector)}
                                        >
                                            <Text style={styles.selectorText}>
                                                {selectedSession || 'Select Session'}
                                            </Text>
                                            <Ionicons name={showSessionSelector ? "chevron-up" : "chevron-down"} size={20} color="#FACC15" />
                                        </TouchableOpacity>

                                        {showSessionSelector && (
                                            <View style={styles.selectorList}>
                                                <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                                    {sessions.map((s, i) => (
                                                        <TouchableOpacity
                                                            key={i}
                                                            style={[styles.selectorItem, selectedSession === (s.year_label || s.session_name) && styles.selectorItemActive]}
                                                            onPress={() => {
                                                                setSelectedSession(s.year_label || s.session_name);
                                                                setShowSessionSelector(false);
                                                            }}
                                                        >
                                                            <Text style={[styles.selectorItemText, selectedSession === (s.year_label || s.session_name) && styles.selectorItemTextActive]}>
                                                                {s.year_label || s.session_name}
                                                            </Text>
                                                            {selectedSession === (s.year_label || s.session_name) && (
                                                                <Ionicons name="checkmark-circle" size={18} color="#FACC15" />
                                                            )}
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>

                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={styles.formLabel}>TARGET ACADEMIC CLASS</Text>
                                        <TouchableOpacity 
                                            style={styles.inputSelector} 
                                            onPress={() => setShowClassSelector(!showClassSelector)}
                                        >
                                            <Text style={styles.selectorText}>
                                                {classes.find((c: any) => c.id === selectedClassId)?.display_name || classes.find((c: any) => c.id === selectedClassId)?.class_name || 'Select Class'}
                                            </Text>
                                            <Ionicons name={showClassSelector ? "chevron-up" : "chevron-down"} size={20} color="#FACC15" />
                                        </TouchableOpacity>

                                        {showClassSelector && (
                                            <View style={styles.selectorList}>
                                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                                    {classes.map((c, i) => (
                                                        <TouchableOpacity
                                                            key={i}
                                                            style={[styles.selectorItem, selectedClassId === c.id && styles.selectorItemActive]}
                                                            onPress={() => {
                                                                setSelectedClassId(c.id);
                                                                setShowClassSelector(false);
                                                            }}
                                                        >
                                                            <Text style={[styles.selectorItemText, selectedClassId === c.id && styles.selectorItemTextActive]}>
                                                                {c.display_name || c.class_name}
                                                            </Text>
                                                            {selectedClassId === c.id && (
                                                                <Ionicons name="checkmark-circle" size={18} color="#FACC15" />
                                                            )}
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>


                                    <CustomButton
                                        title={enrollLoading ? "PROCESSING..." : "CONFIRM ENROLLMENT"}
                                        onPress={handleSelfEnroll}
                                        loading={enrollLoading}
                                        variant="premium"
                                        style={styles.modalSubmit}
                                    />
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            <EditProfileModal
                visible={editProfileVisible}
                onClose={() => setEditProfileVisible(false)}
                student={student}
                onUpdate={(updatedData) => setStudent(updatedData)}
            />
        </View>
    );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: C.background },
        loadingContainer: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },
        loadingText: { color: C.textSecondary, marginTop: 16, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
        scrollContent: { flexGrow: 1 },

        heroHeader: { height: 260, width: '100%', marginBottom: 0 },
        heroOverlay: { flex: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
        topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        logoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
        logoText: { color: '#FACC15', fontSize: 10, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
        logoutFab: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center' },
        settingsFab: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(250, 204, 21, 0.1)', justifyContent: 'center', alignItems: 'center' },

        welcomeInfo: { marginTop: 30 },
        greeting: { color: '#FACC15', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
        studentName: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 4 },
        regBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 10, marginBottom: 5 },
        regText: { color: '#94A3B8', fontSize: 12, fontWeight: '700', letterSpacing: 1 },

        section: { paddingHorizontal: 24, marginBottom: 30 },
        glassCard: { backgroundColor: C.card, borderRadius: 25, padding: 20, borderWidth: 1, borderColor: C.cardBorder },
        profileSummary: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
        avatarLarge: { position: 'relative' },
        avatarImg: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#FACC15' },
        avatarLargePlaceholder: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(250, 204, 21, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FACC15' },
        avatarLargeText: { color: '#FACC15', fontSize: 22, fontWeight: '900' },
        onlineSignal: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#1E293B' },
        idInfo: { marginLeft: 16, flex: 1 },
        idTitle: { color: C.textLabel, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
        idValue: { color: C.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
        editProfileBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
        editProfileText: { color: '#FACC15', fontSize: 10, fontWeight: '900', marginLeft: 6, letterSpacing: 1 },

        miniStats: { flexDirection: 'row', backgroundColor: C.actionItemBg, borderRadius: 15, padding: 15 },
        statItem: { flex: 1, alignItems: 'center' },
        statLabel: { color: C.textSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
        statValue: { color: C.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
        divider: { width: 1, height: '100%', backgroundColor: C.divider },

        sectionLabel: { color: C.textLabel, fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
        actionGrid: { flexDirection: 'row', gap: 15 },
        compactCard: { flex: 1, alignItems: 'center', backgroundColor: C.actionItemBg, paddingVertical: 15, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder },
        compactIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
        compactLabel: { color: C.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

        sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
        registryItem: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.cardBorder },
        registryIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(250, 204, 21, 0.05)', justifyContent: 'center', alignItems: 'center' },
        registryInfo: { flex: 1, marginLeft: 16 },
        regSession: { color: C.text, fontSize: 14, fontWeight: '800' },
        regClass: { color: C.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 2 },
        regActions: { flexDirection: 'row', marginTop: 12 },
        regBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.actionIconWrap, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder },
        regBtnText: { color: '#FACC15', fontSize: 9, fontWeight: '900', marginLeft: 6, letterSpacing: 1 },

        emptyRegistry: { alignItems: 'center', padding: 40, backgroundColor: C.actionItemBg, borderRadius: 25, borderStyle: 'dashed', borderWidth: 2, borderColor: C.cardBorder },
        emptyTitle: { color: C.textLabel, fontSize: 12, fontWeight: '900', marginTop: 15, letterSpacing: 1 },
        emptyDesc: { color: C.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 6, fontWeight: '600' },

        modalOverlay: { flex: 1, backgroundColor: C.modalOverlay, justifyContent: 'flex-end' },
        modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, height: '85%', overflow: 'hidden' },
        modalIndictor: { width: 40, height: 5, backgroundColor: C.divider, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
        modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
        modalTitle: { color: C.text, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
        closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.actionIconWrap, justifyContent: 'center', alignItems: 'center' },

        inputSelector: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: C.inputBg,
            borderRadius: 16,
            paddingHorizontal: 20,
            height: 56,
            borderWidth: 1,
            borderColor: C.inputBorder,
        },
        selectorText: { color: C.inputText, fontSize: 14, fontWeight: '700' },
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
            paddingVertical: 12,
            borderRadius: 12,
        },
        selectorItemActive: { backgroundColor: 'rgba(250, 204, 21, 0.1)' },
        selectorItemText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
        selectorItemTextActive: { color: '#FACC15', fontWeight: '800' },
        modalSubmit: { marginTop: 30, height: 60, borderRadius: 18 },
        errorBanner: {
            backgroundColor: '#EF4444',
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderRadius: 16,
            marginBottom: 24,
            gap: 12,
        },
        errorBannerText: {
            color: '#fff',
            fontSize: 13,
            fontWeight: '800',
            flex: 1,
        },
        successContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
        },
        successIconCircle: {
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
        },
        successTitle: {
            color: C.text,
            fontSize: 22,
            fontWeight: '900',
            letterSpacing: 1,
            marginBottom: 12,
        },
        successDesc: {
            color: C.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 40,
            fontWeight: '600',
        },
        doneBtn: {
            backgroundColor: '#10B981',
            paddingHorizontal: 40,
            paddingVertical: 18,
            borderRadius: 20,
            width: '100%',
            alignItems: 'center',
        },
        doneBtnText: {
            color: '#fff',
            fontSize: 15,
            fontWeight: '900',
            letterSpacing: 1,
        },
    });
}
