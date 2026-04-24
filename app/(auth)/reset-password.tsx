import { View, ActivityIndicator, Alert, ScrollView, Platform, ImageBackground, StyleSheet, Text, TouchableOpacity } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '@/utils/api-service';
import { validatePassword } from '@/utils/password-validator';
import { CustomButton } from '@/components/custom-button';
import { CustomInput } from '@/components/custom-input';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedView } from '@/components/themed-view';
import {
    Colors,
    Spacing,
} from '@/constants/design-system';

export default function SchoolResetPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
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

    useEffect(() => {
        if (!email) {
            router.replace('/(auth)/forgot-password');
        }
    }, [email]);

    const handleResetPassword = async () => {
        if (!password || !confirmPassword) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Validation Error',
                message: 'Please fill in all fields'
            });
            return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Security Policy',
                message: passwordValidation.errorMessage
            });
            return;
        }

        if (password !== confirmPassword) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Mismatch',
                message: 'Passwords do not match'
            });
            return;
        }

        setLoading(true);
        setStatusAlert({ ...statusAlert, visible: false });

        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to reset password');
            }

            setStatusAlert({
                visible: true,
                type: 'success',
                title: 'Success',
                message: 'Administrator password reset successfully.',
                onConfirm: async () => {
                    if (Platform.OS === 'web') {
                        localStorage.removeItem('userToken');
                        localStorage.removeItem('studentToken');
                    } else {
                        await SecureStore.deleteItemAsync('userToken');
                        await SecureStore.deleteItemAsync('studentToken');
                    }
                    router.replace('/');
                }
            });
        } catch (error: any) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Protocol Error',
                message: error.message || 'Failed to reset password'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070' }}
                style={styles.hero}
            >
                <LinearGradient
                    colors={['rgba(10, 15, 30, 0.8)', 'rgba(15, 23, 42, 0.98)']}
                    style={styles.overlay}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.header}>
                            <View style={styles.logoBadge}>
                                <Ionicons name="ribbon" size={24} color="#FACC15" />
                                <Text style={styles.logoText}>SABINO PORTAL</Text>
                            </View>
                            <Text style={styles.title}>New Password</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>SECURE ADMINISTRATOR ACCESS</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="lock-closed" size={32} color="#FACC15" />
                            </View>

                            {statusAlert.visible && (
                                <CustomAlert
                                    type={statusAlert.type}
                                    title={statusAlert.title}
                                    message={statusAlert.message}
                                    onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
                                    onConfirm={statusAlert.onConfirm}
                                    style={{ marginBottom: 20 }}
                                />
                            )}

                            <CustomInput
                                label="New Password *"
                                placeholder="Min. 8 characters"
                                isPassword
                                value={password}
                                onChangeText={(v) => { setPassword(v); setStatusAlert(prev => ({ ...prev, visible: false })); }}
                                containerStyle={styles.inputContainer}
                            />

                            <CustomInput
                                label="Confirm New Password *"
                                placeholder="Match password above"
                                isPassword
                                value={confirmPassword}
                                onChangeText={(v) => { setConfirmPassword(v); setStatusAlert(prev => ({ ...prev, visible: false })); }}
                                containerStyle={styles.inputContainer}
                            />

                            <CustomButton
                                title={loading ? "RESETTING..." : "CONFIRM NEW PASSWORD"}
                                onPress={handleResetPassword}
                                disabled={loading}
                                loading={loading}
                                variant="premium"
                                style={styles.ctaButton}
                            />
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>ENCRYPTED SECURITY LAYER ACTIVE</Text>
                        </View>
                    </ScrollView>
                </LinearGradient>
            </ImageBackground>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    hero: { flex: 1, width: '100%' },
    overlay: { flex: 1, paddingHorizontal: 24 },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingVertical: 60 },
    
    header: { alignItems: 'center', marginBottom: 40 },
    logoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    logoText: { color: '#FACC15', fontSize: 13, fontWeight: '900', marginLeft: 10, letterSpacing: 3 },
    title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1 },
    goldBar: { width: 50, height: 4, backgroundColor: '#FACC15', borderRadius: 2, marginVertical: 15 },
    subtitle: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },

    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 35,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(250, 204, 21, 0.2)'
    },
    inputContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 20,
    },
    ctaButton: { height: 60, borderRadius: 15, marginTop: 10 },
    
    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
