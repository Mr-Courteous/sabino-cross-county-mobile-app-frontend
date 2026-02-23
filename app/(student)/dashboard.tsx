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
    AlertIOS
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { clearAllStorage } from '@/utils/storage';
import Footer from '../components/Footer';

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
                // No student data found, redirect to login
                router.replace('/(student)');
            }
        } catch (error) {
            console.error('Error loading student data:', error);
            Alert.alert('Error', 'Failed to load your profile');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadStudentData();
        setRefreshing(false);
    };

    const performLogout = async () => {
        try {
            // Primary clear via shared helper
            await clearAllStorage();

            // Defensive: attempt direct removals for common keys
            try {
                if (Platform.OS === 'web') {
                    localStorage.removeItem('userToken');
                    localStorage.removeItem('userData');
                    localStorage.removeItem('studentToken');
                    localStorage.removeItem('studentData');
                    localStorage.removeItem('countryId');
                    localStorage.removeItem('activeSessionId');
                } else {
                    await SecureStore.deleteItemAsync('userToken');
                    await SecureStore.deleteItemAsync('userData');
                    await SecureStore.deleteItemAsync('studentToken');
                    await SecureStore.deleteItemAsync('studentData');
                    await SecureStore.deleteItemAsync('countryId');
                    await SecureStore.deleteItemAsync('activeSessionId');
                }
            } catch (e) {
                console.warn('Defensive storage clear failed', e);
            }

            // Navigate to home (root) so app routing can take over
            router.replace('/');
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback navigation even on error
            try { router.replace('/'); } catch (e) { /* swallow */ }
        }
    };

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            try {
                const ok = window.confirm('Are you sure you want to logout?');
                if (ok) await performLogout();
            } catch (e) {
                Alert.alert(
                    'Logout',
                    'Are you sure you want to logout?',
                    [
                        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                        { text: 'Logout', onPress: async () => { await performLogout(); }, style: 'destructive' }
                    ]
                );
            }
            return;
        }

        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                {
                    text: 'Logout',
                    onPress: async () => {
                        await performLogout();
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    const handleEditProfile = () => {
        Alert.alert(
            'Coming Soon',
            'Profile editing feature will be available soon!',
            [{ text: 'OK' }]
        );
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

            // Fetch Sessions
            const sessionRes = await fetch(`${API_BASE_URL}/api/academic-sessions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const sessionData = await sessionRes.json();
            if (sessionData.success) {
                setSessions(sessionData.data);
                // Pre-select first one if available
                if (sessionData.data.length > 0) {
                    setSelectedSession(sessionData.data[0].year_label || sessionData.data[0].session_name);
                }
            }

            // Fetch Classes (Global Templates for Country)
            const classRes = await fetch(`${API_BASE_URL}/api/classes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const classData = await classRes.json();
            if (classData.success) {
                setClasses(classData.data);
            }

        } catch (error) {
            console.error('Fetch options error:', error);
            setEnrollError('Failed to load enrollment options');
        }
    };

    const handleSelfEnroll = async () => {
        setEnrollError('');
        if (!selectedSession || !selectedClassId) {
            setEnrollError('Please select both an academic session and a class.');
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
                Alert.alert('Success', data.message);
                setEnrollModalVisible(false);
                onRefresh(); // Refresh dashboard data
            } else {
                setEnrollError(data.error || data.message || 'Enrollment failed');
            }

        } catch (error) {
            setEnrollError('An error occurred during enrollment. Please try again.');
        } finally {
            setEnrollLoading(false);
        }
    };

    const handleViewGrades = (enrollment: any) => {
        const enrollmentId = enrollment.enrollment_id || enrollment.id;
        const sessionId = enrollment.session_id || enrollment.academic_session_id || enrollment.sessionId;
        // Navigate to grades page with params
        router.push(`/(student)/grades?enrollmentId=${enrollmentId}&sessionId=${sessionId}`);
    };

    const handlePrintReport = async (enrollment: any) => {
        try {
            const enrollmentId = enrollment.enrollment_id || enrollment.id;
            const sessionId = enrollment.session_id || enrollment.academic_session_id || enrollment.sessionId;

            const token = Platform.OS === 'web'
                ? localStorage.getItem('studentToken')
                : await SecureStore.getItemAsync('studentToken');

            // Construct a printable report URL. Server should accept token via query or provide a printable link.
            const url = `${API_BASE_URL}/api/students/me/enrollments/${sessionId}/report?enrollmentId=${enrollmentId}&accessToken=${encodeURIComponent(token || '')}`;

            // Open in browser or external link
            await Linking.openURL(url);
        } catch (error) {
            console.error('Failed to open report:', error);
            Alert.alert('Error', 'Unable to open report.');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FACC15" />
                <Text style={styles.loadingText}>Loading your dashboard...</Text>
            </View>
        );
    }

    if (!student) {
        return null;
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', '#1E293B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#FACC15"
                            colors={['#FACC15']}
                        />
                    }
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTop}>
                            <View>
                                <Text style={styles.greeting}>Welcome back,</Text>
                                <Text style={styles.studentName}>{student.first_name}!</Text>
                            </View>
                            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                                <Text style={styles.logoutText}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <LinearGradient
                            colors={['rgba(250, 204, 21, 0.1)', 'rgba(250, 204, 21, 0.05)']}
                            style={styles.profileGradient}
                        >
                            <View style={styles.profileHeader}>
                                <View style={styles.avatarContainer}>
                                    {student.photo ? (
                                        <Image source={{ uri: student.photo }} style={styles.avatar} />
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Text style={styles.avatarText}>
                                                {student.first_name[0]}{student.last_name[0]}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.statusBadge}>
                                        <View style={styles.statusDot} />
                                    </View>
                                </View>

                                <View style={styles.profileInfo}>
                                    <Text style={styles.profileName}>
                                        {student.first_name} {student.last_name}
                                    </Text>
                                    <Text style={styles.profileEmail}>{student.email}</Text>
                                    <View style={styles.regNumberContainer}>
                                        <Ionicons name="card-outline" size={14} color="#FACC15" />
                                        <Text style={styles.regNumber}>{student.registration_number}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                                    <Ionicons name="create-outline" size={20} color="#FACC15" />
                                </TouchableOpacity>
                            </View>

                            {/* Student Details */}
                            <View style={styles.detailsGrid}>
                                {student.school_name && (
                                    <View style={styles.detailItem}>
                                        <Ionicons name="school-outline" size={18} color="#94A3B8" />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={styles.detailLabel}>School</Text>
                                            <Text style={styles.detailValue}>{student.school_name}</Text>
                                        </View>
                                    </View>
                                )}

                                {student.phone && (
                                    <View style={styles.detailItem}>
                                        <Ionicons name="call-outline" size={18} color="#94A3B8" />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={styles.detailLabel}>Phone</Text>
                                            <Text style={styles.detailValue}>{student.phone}</Text>
                                        </View>
                                    </View>
                                )}

                                {student.date_of_birth && (
                                    <View style={styles.detailItem}>
                                        <Ionicons name="calendar-outline" size={18} color="#94A3B8" />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={styles.detailLabel}>Date of Birth</Text>
                                            <Text style={styles.detailValue}>{student.date_of_birth}</Text>
                                        </View>
                                    </View>
                                )}

                                {student.gender && (
                                    <View style={styles.detailItem}>
                                        <Ionicons name="person-outline" size={18} color="#94A3B8" />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={styles.detailLabel}>Gender</Text>
                                            <Text style={styles.detailValue}>{student.gender}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <View style={styles.actionsGrid}>
                            <ActionCard
                                icon="school-outline"
                                title="Self Enroll"
                                description="Register for a new class"
                                color="#FACC15"
                                onPress={openEnrollmentModal}
                            />
                            <ActionCard
                                icon="book-outline"
                                title="My Courses"
                                description="View enrolled courses"
                                color="#3B82F6"
                                onPress={() => Alert.alert('Coming Soon', 'Course view will be available soon!')}
                            />
                            <ActionCard
                                icon="stats-chart-outline"
                                title="My Grades"
                                description="Check your scores"
                                color="#10B981"
                                onPress={() => router.push('/(student)/grades')}
                            />
                            <ActionCard
                                icon="document-text-outline"
                                title="Assignments"
                                description="View assignments"
                                color="#F59E0B"
                                onPress={() => Alert.alert('Coming Soon', 'Assignments will be available soon!')}
                            />
                            <ActionCard
                                icon="calendar-outline"
                                title="Schedule"
                                description="View class schedule"
                                color="#8B5CF6"
                                onPress={() => Alert.alert('Coming Soon', 'Schedule will be available soon!')}
                            />
                        </View>
                    </View>

                    {/* Enrollments */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Enrollments</Text>
                        <View style={styles.activityCard}>
                            {enrollments.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="document-outline" size={48} color="#64748B" />
                                    <Text style={styles.emptyStateText}>No enrollments found</Text>
                                    <Text style={styles.emptyStateSubtext}>
                                        Enroll in a session to view classes and reports
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={enrollments}
                                    keyExtractor={(item) => String(item.enrollment_id || item.id)}
                                    renderItem={({ item }) => (
                                        <View style={{ marginBottom: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                                            <Text style={{ color: '#E2E8F0', fontWeight: '700' }}>{item.session_name || item.year_label || item.academic_session}</Text>
                                            <Text style={{ color: '#94A3B8', marginTop: 4 }}>{item.class_name || item.display_name || item.class_name}</Text>
                                            <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                                <TouchableOpacity style={[styles.submitButton, { paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 }]} onPress={() => handleViewGrades(item)}>
                                                    <Text style={styles.submitButtonText}>View Grades</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 12 }]} onPress={() => handlePrintReport(item)}>
                                                    <Text style={[styles.submitButtonText, { color: '#fff' }]}>Print Report</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                />
                            )}
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>

            {/* Enrollment Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={enrollModalVisible}
                onRequestClose={() => setEnrollModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Self Enrollment</Text>
                            <TouchableOpacity onPress={() => setEnrollModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.inputLabel}>Academic Session</Text>
                            <View style={styles.selectionContainer}>
                                {sessions.map((session) => (
                                    <TouchableOpacity
                                        key={session.id}
                                        style={[
                                            styles.selectionOption,
                                            selectedSession === (session.year_label || session.session_name) && styles.selectionOptionActive
                                        ]}
                                        onPress={() => setSelectedSession(session.year_label || session.session_name)}
                                    >
                                        <Text style={[
                                            styles.selectionText,
                                            selectedSession === (session.year_label || session.session_name) && styles.selectionTextActive
                                        ]}>
                                            {session.year_label || session.session_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>Select Class</Text>
                            <View style={styles.selectionContainer}>
                                {classes.map((cls) => (
                                    <TouchableOpacity
                                        key={cls.id}
                                        style={[
                                            styles.selectionOption,
                                            selectedClassId === cls.id && styles.selectionOptionActive
                                        ]}
                                        onPress={() => {
                                            setSelectedClassId(cls.id);
                                            setEnrollError('');
                                        }}
                                    >
                                        <Text style={[
                                            styles.selectionText,
                                            selectedClassId === cls.id && styles.selectionTextActive
                                        ]}>
                                            {cls.display_name || cls.class_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {classes.length === 0 && (
                                    <Text style={styles.emptyText}>No classes available</Text>
                                )}
                            </View>

                            {enrollError ? (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                    <Text style={styles.errorText}>{enrollError}</Text>
                                </View>
                            ) : null}

                            <TouchableOpacity
                                style={[styles.submitButton, enrollLoading && styles.disabledButton]}
                                onPress={handleSelfEnroll}
                                disabled={enrollLoading}
                            >
                                {enrollLoading ? (
                                    <ActivityIndicator color="#0F172A" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Confirm Enrollment</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Footer onLogout={handleLogout} />

        </View >
    );
}

interface ActionCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    color: string;
    onPress: () => void;
}

function ActionCard({ icon, title, description, color, onPress }: ActionCardProps) {
    return (
        <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.actionIconContainer, { backgroundColor: `${color}20` }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionDescription}>{description}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    gradient: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#94A3B8',
        marginTop: 16,
        fontSize: 16,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    greeting: {
        fontSize: 16,
        color: '#94A3B8',
        marginBottom: 4,
    },
    studentName: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
    },
    logoutText: {
        color: '#EF4444',
        marginLeft: 8,
        fontWeight: '700',
    },
    profileCard: {
        marginBottom: 32,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(250, 204, 21, 0.2)',
    },
    profileGradient: {
        padding: 20,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    avatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FACC15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
    },
    statusBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 6,
    },
    regNumberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    regNumber: {
        fontSize: 12,
        color: '#FACC15',
        fontWeight: '700',
        marginLeft: 4,
    },
    editButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
    },
    detailsGrid: {
        gap: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 12,
        borderRadius: 12,
    },
    detailTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 14,
        color: '#E2E8F0',
        fontWeight: '600',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    actionCard: {
        width: '48%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    actionDescription: {
        fontSize: 12,
        color: '#94A3B8',
    },
    activityCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: 12,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
        textAlign: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    modalBody: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94A3B8',
        marginBottom: 12,
        marginTop: 8,
    },
    selectionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    selectionOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    selectionOptionActive: {
        backgroundColor: 'rgba(250, 204, 21, 0.2)',
        borderColor: '#FACC15',
    },
    selectionText: {
        fontSize: 14,
        color: '#E2E8F0',
        fontWeight: '600',
    },
    selectionTextActive: {
        color: '#FACC15',
    },
    emptyText: {
        color: '#64748B',
        fontStyle: 'italic',
    },
    submitButton: {
        backgroundColor: '#FACC15',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 30, // Bottom padding for scroll
    },
    disabledButton: {
        opacity: 0.7,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    errorText: {
        color: '#EF4444',
        marginLeft: 8,
        flex: 1,
        fontSize: 14,
    },
});
