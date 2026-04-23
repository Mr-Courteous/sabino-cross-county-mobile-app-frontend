import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Platform,
    ScrollView,
    Alert,
    ImageBackground,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/utils/api-service';
import { CustomButton } from '@/components/custom-button';
import { CustomInput } from '@/components/custom-input';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/design-system';

export default function StudentVerifyOtp() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(600);
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
            Alert.alert('Protocol Success', 'A fresh handshake code has been dispatched to your email.');
        } catch (error: any) {
            setError(error.message || 'Failed to resend code');
        } finally {
            setResending(false);
        }
    };

    return (
        <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?q=80&w=2069' }}
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
                            <TouchableOpacity style={styles.backFab} onPress={() => router.back()}>
                                <Ionicons name="arrow-back" size={24} color="#FACC15" />
                            </TouchableOpacity>

                            <View style={styles.logoBadge}>
                                <Ionicons name="shield-checkmark" size={24} color="#FACC15" />
                                <Text style={styles.logoText}>IDENTITY VERIFICATION</Text>
                            </View>
                            <Text style={styles.title}>Secure Access</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>SENT TO {email?.toUpperCase()}</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="keypad" size={40} color="#FACC15" />
                            </View>

                            {error && (
                                <CustomAlert
                                    type="error"
                                    title="Handshake Error"
                                    message={error}
                                    onClose={() => setError('')}
                                    style={{ marginBottom: 20 }}
                                />
                            )}

                            <Text style={styles.otpLabel}>ENTER 6-DIGIT CODE</Text>
                            <CustomInput
                                placeholder="000 000"
                                value={otp}
                                onChangeText={(text) => {
                                    setOtp(text.replace(/\D/g, '').slice(0, 6));
                                    setError('');
                                }}
                                keyboardType="number-pad"
                                editable={!verifying}
                                style={styles.otpInput}
                                containerStyle={styles.inputContainer}
                            />

                            <View style={styles.timerBox}>
                                <Ionicons name="timer-outline" size={16} color={timeLeft <= 60 ? "#EF4444" : "#94A3B8"} />
                                <Text style={[styles.timerText, timeLeft <= 60 && { color: '#EF4444' }]}>
                                    {timeLeft > 0 ? `SESSION EXPIRES IN ${formatTime(timeLeft)}` : 'PROTOCOL EXPIRED'}
                                </Text>
                            </View>

                            <CustomButton
                                title={verifying ? "VERIFYING..." : "CONFIRM HANDSHAKE"}
                                onPress={handleVerifyOtp}
                                loading={verifying}
                                variant="premium"
                                style={styles.ctaButton}
                            />

                            <TouchableOpacity
                                style={[styles.resendLink, resending && { opacity: 0.5 }]}
                                onPress={handleResendOtp}
                                disabled={resending || verifying}
                            >
                                <Text style={styles.resendText}>
                                    {resending ? 'RESENDING...' : "DIDN'T RECEIVE CODE? DISPATCH AGAIN"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>PASSPHRASE CHALLENGE PROTOCOL ACTIVE</Text>
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
    backFab: {
        position: 'absolute',
        top: -20,
        left: 0,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
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
    goldBar: { width: 60, height: 4, backgroundColor: '#FACC15', borderRadius: 2, marginVertical: 15 },
    subtitle: { fontSize: 11, color: '#94A3B8', fontWeight: '800', letterSpacing: 1, textAlign: 'center' },

    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 35,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(250, 204, 21, 0.2)'
    },
    otpLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 15 },
    otpInput: { fontSize: 32, letterSpacing: 10, fontWeight: '900', textAlign: 'center' },
    inputContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        paddingHorizontal: 0
    },
    timerBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, marginBottom: 25 },
    timerText: { color: '#94A3B8', fontSize: 10, fontWeight: '800', marginLeft: 8, letterSpacing: 1 },

    ctaButton: { height: 60, borderRadius: 15 },
    resendLink: { marginTop: 25, alignItems: 'center' },
    resendText: { color: '#FACC15', fontSize: 11, letterSpacing: 1, fontWeight: '800' },

    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
