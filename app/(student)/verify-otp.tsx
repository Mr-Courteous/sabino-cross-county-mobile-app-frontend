import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/utils/api-service';

export default function StudentVerifyOtp() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
    const [verifying, setVerifying] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!email) {
            router.replace('/(student)/verify-email');
        }
    }, [email]);

    useEffect(() => {
        let timer: any;
        if (timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else {
            setError('Verification code expired. Please request a new one.');
        }
        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }

        if (timeLeft <= 0) {
            setError('Code expired. Please resend a new one.');
            return;
        }

        setVerifying(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/students/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Invalid or expired verification code');
            }

            // Navigate to profile setup (the original register.tsx)
            router.push({
                pathname: '/(student)/register',
                params: { email }
            });
        } catch (error: any) {
            setError(error.message || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleResendOtp = async () => {
        setResending(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/students/otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to resend code');
            }

            setTimeLeft(600);
            Alert.alert('Success', 'A new verification code has been sent to your email.');
        } catch (error: any) {
            setError(error.message || 'Failed to resend code');
        } finally {
            setResending(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={['#0F172A', '#1E293B', '#334155']}
                style={styles.gradient}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#FACC15" />
                        </TouchableOpacity>

                        <View style={styles.iconContainer}>
                            <Ionicons name="key" size={48} color="#FACC15" />
                        </View>

                        <Text style={styles.title}>Confirm OTP</Text>
                        <Text style={styles.subtitle}>Step 2: Enter the 6-digit code sent to</Text>
                        <Text style={styles.emailText}>{email}</Text>
                    </View>

                    <View style={styles.formContainer}>
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Verification Code *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="shield-checkmark-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { fontSize: 24, letterSpacing: 8, fontWeight: '900' }]}
                                    placeholder="000000"
                                    placeholderTextColor="#64748B"
                                    value={otp}
                                    onChangeText={(text) => {
                                        setOtp(text.replace(/\D/g, '').slice(0, 6));
                                        setError('');
                                    }}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    editable={!verifying}
                                />
                            </View>
                            <Text style={[styles.timer, timeLeft <= 60 && { color: '#EF4444' }]}>
                                {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : 'Code expired'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.actionButton, (verifying || timeLeft <= 0) && styles.buttonDisabled]}
                            onPress={handleVerifyOtp}
                            disabled={verifying || timeLeft <= 0}
                        >
                            {verifying ? (
                                <ActivityIndicator color="#0F172A" />
                            ) : (
                                <>
                                    <Text style={styles.actionButtonText}>VERIFY CODE</Text>
                                    <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.resendButton, resending && { opacity: 0.5 }]}
                            onPress={handleResendOtp}
                            disabled={resending || verifying}
                        >
                            <Text style={styles.resendButtonText}>
                                {resending ? 'Sending...' : "Didn't receive code? Resend"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 40 },
    backButton: { position: 'absolute', top: 0, left: 0, padding: 8 },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20
    },
    title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#94A3B8', textAlign: 'center' },
    emailText: { fontSize: 16, color: '#FACC15', fontWeight: 'bold', marginTop: 4 },
    formContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)'
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    errorText: { color: '#EF4444', marginLeft: 8, flex: 1, fontSize: 14 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: '#FFFFFF', paddingVertical: 16 },
    timer: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
    actionButton: {
        backgroundColor: '#FACC15',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8
    },
    buttonDisabled: { opacity: 0.6 },
    actionButtonText: { color: '#0F172A', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginRight: 8 },
    resendButton: { marginTop: 24, alignItems: 'center' },
    resendButtonText: { color: '#FACC15', fontSize: 14, fontWeight: '600' }
});
