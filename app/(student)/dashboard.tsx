import React, { useState, useEffect } from 'react';
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
    const [enrollError, setEnrollError] = useState('');
    const [editProfileVisible, setEditProfileVisible] = useState(false);

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
            Alert.alert('System Error', 'Failed to synchronize profile data.');
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
        Alert.alert(
            'Terminate Session',
            'Are you sure you want to exit the premium portal?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', onPress: performLogout, style: 'destructive' }
            ]
        );
    };

    const handleEditProfile = () => {
        setEditProfileVisible(true);
    };

    const openEnrollmentModal = async () => {
        setEnrollError('');
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
            setEnrollError('Failed to load enrollment protocols');
        }
    };

    const handleSelfEnroll = async () => {
        setEnrollError('');
        if (!selectedSession || !selectedClassId) {
            setEnrollError('Select session and class to proceed.');
            return;
        }

        setEnrollLoading(true);
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
                Alert.alert('Protocol Success', 'Your enrollment has been registered.');
                setEnrollModalVisible(false);
                onRefresh();
            } else {
                setEnrollError(data.error || data.message || 'Enrollment failed');
            }
        } catch (error) {
            setEnrollError('Network exception during enrollment.');
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
            Alert.alert('Report Error', 'Unable to retrieve printable document.');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FACC15" />
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
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FACC15" />
                }
            >
                {/* Hero Header */}
                <ImageBackground
                    source={{ uri: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe1?q=80&w=2070' }}
                    style={styles.heroHeader}
                    imageStyle={{ borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
                >
                    <LinearGradient
                        colors={['rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.95)']}
                        style={styles.heroOverlay}
                    >
                        <View style={styles.topRow}>
                            <View style={styles.logoBadge}>
                                <Ionicons name="school" size={18} color="#FACC15" />
                                <Text style={styles.logoText}>PREMIUM PORTAL</Text>
                            </View>
                            <TouchableOpacity style={styles.logoutFab} onPress={handleLogout}>
                                <Ionicons name="power" size={20} color="#EF4444" />
                            </TouchableOpacity>
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
                <View style={[styles.section, { marginTop: -40 }]}>
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
                            label="GRADES"
                            color="#3B82F6"
                            onPress={() => router.push('/(student)/grades')}
                        />
                        <CompactActionCard
                            icon="book"
                            label="COURSES"
                            color="#10B981"
                            onPress={() => Alert.alert('Notice', 'Course modules arriving soon.')}
                        />
                        <CompactActionCard
                            icon="document-attach"
                            label="TASKS"
                            color="#8B5CF6"
                            onPress={() => Alert.alert('Notice', 'Assignment dashboard pending.')}
                        />
                    </View>
                </View>

                {/* Enrollment Registry */}
                <View style={styles.section}>
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
                            <View key={idx} style={styles.registryItem}>
                                <View style={styles.registryIcon}>
                                    <Ionicons name="ribbon" size={24} color="#FACC15" />
                                </View>
                                <View style={styles.registryInfo}>
                                    <Text style={styles.regSession}>{item.session_name || item.year_label}</Text>
                                    <Text style={styles.regClass}>{item.class_name || item.display_name}</Text>
                                    <View style={styles.regActions}>
                                        <TouchableOpacity style={styles.regBtn} onPress={() => handleViewGrades(item)}>
                                            <Ionicons name="eye" size={14} color="#FACC15" />
                                            <Text style={styles.regBtnText}>GRADES</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.regBtn, { marginLeft: 12 }]} onPress={() => handlePrintReport(item)}>
                                            <Ionicons name="print" size={14} color="#3B82F6" />
                                            <Text style={[styles.regBtnText, { color: '#3B82F6' }]}>REPORT</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <Footer onLogout={handleLogout} />

            {/* Premium Enrollment Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={enrollModalVisible}
                onRequestClose={() => setEnrollModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <LinearGradient
                        colors={['#1E293B', '#0F172A']}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalIndictor} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>SELF ENROLLMENT</Text>
                            <TouchableOpacity onPress={() => setEnrollModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                            <Text style={styles.formLabel}>SELECT SESSION</Text>
                            <View style={styles.selectorGrid}>
                                {sessions.map((s, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.chip, selectedSession === (s.year_label || s.session_name) && styles.chipActive]}
                                        onPress={() => setSelectedSession(s.year_label || s.session_name)}
                                    >
                                        <Text style={[styles.chipText, selectedSession === (s.year_label || s.session_name) && styles.chipTextActive]}>
                                            {s.year_label || s.session_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.formLabel, { marginTop: 20 }]}>SELECT ACADEMIC CLASS</Text>
                            <View style={styles.listSelector}>
                                {classes.map((c, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.listItem, selectedClassId === c.id && styles.listItemActive]}
                                        onPress={() => setSelectedClassId(c.id)}
                                    >
                                        <Ionicons
                                            name={selectedClassId === c.id ? "radio-button-on" : "radio-button-off"}
                                            size={20}
                                            color={selectedClassId === c.id ? "#FACC15" : "#475569"}
                                        />
                                        <Text style={[styles.listText, selectedClassId === c.id && styles.listTextActive]}>
                                            {c.display_name || c.class_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {enrollError && (
                                <CustomAlert
                                    type="error"
                                    title="Protocol Alert"
                                    message={enrollError}
                                    onClose={() => setEnrollError('')}
                                    style={{ marginVertical: 20 }}
                                />
                            )}

                            <CustomButton
                                title={enrollLoading ? "PROCESSING..." : "CONFIRM ENROLLMENT"}
                                onPress={handleSelfEnroll}
                                loading={enrollLoading}
                                variant="premium"
                                style={styles.modalSubmit}
                            />
                        </ScrollView>
                    </LinearGradient>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0F1E' },
    loadingContainer: { flex: 1, backgroundColor: '#0A0F1E', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#64748B', marginTop: 16, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
    scrollContent: { flexGrow: 1 },

    heroHeader: { height: 260, width: '100%', marginBottom: 0 },
    heroOverlay: { flex: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    logoText: { color: '#FACC15', fontSize: 10, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
    logoutFab: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center' },

    welcomeInfo: { marginTop: 30 },
    greeting: { color: '#FACC15', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
    studentName: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 4 },
    regBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 10 },
    regText: { color: '#94A3B8', fontSize: 12, fontWeight: '700', letterSpacing: 1 },

    section: { paddingHorizontal: 24, marginBottom: 30 },
    glassCard: { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 25, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    profileSummary: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatarLarge: { position: 'relative' },
    avatarImg: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#FACC15' },
    avatarLargePlaceholder: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(250, 204, 21, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FACC15' },
    avatarLargeText: { color: '#FACC15', fontSize: 22, fontWeight: '900' },
    onlineSignal: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#1E293B' },
    idInfo: { marginLeft: 16, flex: 1 },
    idTitle: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    idValue: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 },
    editProfileBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    editProfileText: { color: '#FACC15', fontSize: 10, fontWeight: '900', marginLeft: 6, letterSpacing: 1 },

    miniStats: { flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: 15, padding: 15 },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    statValue: { color: '#E2E8F0', fontSize: 14, fontWeight: '800', marginTop: 4 },
    divider: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },

    sectionLabel: { color: '#475569', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
    actionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    compactCard: { width: '23%', alignItems: 'center' },
    compactIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    compactLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    registryItem: { flexDirection: 'row', backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    registryIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(250, 204, 21, 0.05)', justifyContent: 'center', alignItems: 'center' },
    registryInfo: { flex: 1, marginLeft: 16 },
    regSession: { color: '#E2E8F0', fontSize: 14, fontWeight: '800' },
    regClass: { color: '#64748B', fontSize: 12, fontWeight: '600', marginTop: 2 },
    regActions: { flexDirection: 'row', marginTop: 12 },
    regBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    regBtnText: { color: '#FACC15', fontSize: 9, fontWeight: '900', marginLeft: 6, letterSpacing: 1 },

    emptyRegistry: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(30, 41, 59, 0.2)', borderRadius: 25, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)' },
    emptyTitle: { color: '#475569', fontSize: 12, fontWeight: '900', marginTop: 15, letterSpacing: 1 },
    emptyDesc: { color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 6, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, height: '85%' },
    modalIndictor: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },

    formLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
    selectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    chipActive: { backgroundColor: 'rgba(250, 204, 21, 0.1)', borderColor: '#FACC15' },
    chipText: { color: '#94A3B8', fontSize: 12, fontWeight: '800' },
    chipTextActive: { color: '#FACC15' },

    listSelector: { gap: 10 },
    listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    listItemActive: { backgroundColor: 'rgba(250, 204, 21, 0.05)', borderColor: 'rgba(250, 204, 21, 0.2)' },
    listText: { color: '#64748B', fontSize: 14, fontWeight: '700', marginLeft: 12 },
    listTextActive: { color: '#E2E8F0' },
    modalSubmit: { marginTop: 30, height: 60, borderRadius: 18 },
});
