import { View, ActivityIndicator, ScrollView, ImageBackground, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '@/utils/api-service';
import { CustomButton } from '@/components/custom-button';
import { CustomInput } from '@/components/custom-input';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedView } from '@/components/themed-view';
import {
    Colors,
    Spacing,
} from '@/constants/design-system';

export default function SchoolVerifyResetOTPScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(600);
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
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        if (!email) {
            router.replace('/(auth)/forgot-password');
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [email]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Input Required',
                message: 'Please enter the 6-digit code'
            });
            return;
        }

        setVerifying(true);
        setStatusAlert(prev => ({ ...prev, visible: false }));

        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });

            const data = await response.json();
            if (response.ok && data.success) {
                router.push({
                    pathname: '/(auth)/reset-password',
                    params: { email },
                });
            } else {
                setStatusAlert({
                    visible: true,
                    type: 'error',
                    title: 'Verification Failed',
                    message: data.message || 'OTP verification failed'
                });
            }
        } catch (err) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Connection Fault',
                message: 'Failed to verify OTP'
            });
        } finally {
            setVerifying(false);
        }
    };

    const handleResendOTP = async () => {
        setVerifying(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (response.ok) {
                setTimeLeft(600);
                setStatusAlert({
                    visible: true,
                    type: 'success',
                    title: 'Success',
                    message: 'A new reset code has been sent.'
                });
            }
        } catch (err) {
            setStatusAlert({
                visible: true,
                type: 'error',
                title: 'Dispatch Error',
                message: 'Failed to resend code'
            });
        } finally {
            setVerifying(false);
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
                            <Text style={styles.title}>Code Verification</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>SENT TO: {email}</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="shield-checkmark" size={32} color="#FACC15" />
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
                                label="6-Digit Code *"
                                placeholder="000000"
                                value={otp}
                                onChangeText={(text) => { setOtp(text.replace(/\D/g, '').slice(0, 6)); setStatusAlert({ ...statusAlert, visible: false }); }}
                                keyboardType="numeric"
                                maxLength={6}
                                editable={!verifying}
                                inputStyle={styles.otpInput}
                                containerStyle={styles.inputContainer}
                            />

                            <Text style={[styles.timerText, timeLeft <= 60 && { color: '#EF4444' }]}>
                                {timeLeft > 0 ? `⏱ Code expires in ${formatTime(timeLeft)}` : '⏰ Code expired'}
                            </Text>

                            <CustomButton
                                title={verifying ? "VERIFYING..." : "ACTIVATE RESET"}
                                onPress={handleVerifyOTP}
                                disabled={verifying || timeLeft === 0}
                                loading={verifying}
                                variant="premium"
                                style={styles.ctaButton}
                            />

                            <TouchableOpacity style={styles.resendButton} onPress={handleResendOTP} disabled={verifying}>
                                <Text style={styles.resendText}>RESEND NEW CODE</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>SECURE PROTOCOL ACTIVATED</Text>
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
    subtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '800', letterSpacing: 1 },

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
    },
    otpInput: { letterSpacing: 8, textAlign: 'center', fontSize: 24, fontWeight: '900' },
    timerText: { fontSize: 11, color: '#94A3B8', marginTop: 12, textAlign: 'center', fontWeight: '700' },
    
    ctaButton: { height: 60, borderRadius: 15, marginTop: 25 },
    resendButton: { marginTop: 20, alignItems: 'center' },
    resendText: { color: '#FACC15', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
    
    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
