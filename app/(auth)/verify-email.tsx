import { View, ActivityIndicator, ScrollView, ImageBackground, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
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

export default function VerifyEmailScreen() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(600);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (otpSent && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft <= 0) {
            setError('OTP has expired. Please request a new one.');
        }
        return () => clearInterval(timer);
    }, [otpSent, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSendOTP = async () => {
        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid school email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();
            if (response.status === 409) {
                Alert.alert('Already Registered', 'This email is already registered. Go to login?', [
                    { text: 'Cancel' },
                    { text: 'Login', onPress: () => router.replace('/(auth)') }
                ]);
                return;
            }

            if (response.ok && result.success) {
                setOtpSent(true);
                setTimeLeft(600);
            } else {
                setError(result.message || result.error || 'Failed to send OTP');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }

        setVerifying(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });

            const data = await response.json();
            if (response.ok && data.success) {
                router.push({
                    pathname: '/(auth)/complete-registration',
                    params: { email },
                });
            } else {
                setError(data.message || 'OTP verification failed');
            }
        } catch (err) {
            setError('Failed to verify OTP');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070' }}
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
                            <Text style={styles.title}>Verification</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>Step 1: Authenticate Secondary Contact</Text>
                        </View>

                        <View style={styles.card}>
                            {error && (
                                <CustomAlert
                                    type="error"
                                    title="Security Error"
                                    message={error}
                                    onClose={() => setError('')}
                                    style={{ marginBottom: 20 }}
                                />
                            )}

                            <CustomInput
                                label="School Email Address *"
                                placeholder="admin@school.com"
                                value={email}
                                onChangeText={(text) => { setEmail(text); setError(''); }}
                                editable={!loading && !otpSent}
                                keyboardType="email-address"
                                containerStyle={styles.inputContainer}
                            />
                            
                            {otpSent && (
                                <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); }} style={styles.changeEmail}>
                                    <Text style={styles.changeEmailText}>CHANGE EMAIL</Text>
                                </TouchableOpacity>
                            )}

                            {otpSent && (
                                <View style={{ marginTop: 20 }}>
                                    <CustomInput
                                        label="Verification Code *"
                                        placeholder="000000"
                                        value={otp}
                                        onChangeText={(text) => { setOtp(text.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                        editable={!verifying}
                                        keyboardType="numeric"
                                        maxLength={6}
                                        inputStyle={styles.otpInput}
                                        containerStyle={styles.inputContainer}
                                    />
                                    <Text style={[styles.timerText, timeLeft <= 60 && { color: '#EF4444' }]}>
                                        {timeLeft > 0 ? `⏱ Code expires in ${formatTime(timeLeft)}` : '⏰ Code expired'}
                                    </Text>
                                </View>
                            )}

                            <CustomButton
                                title={loading || verifying ? "PROCESSING..." : (otpSent ? 'VERIFY CODE' : 'GET OTP')}
                                onPress={otpSent ? handleVerifyOTP : handleSendOTP}
                                disabled={loading || verifying}
                                loading={loading || verifying}
                                variant="premium"
                                style={styles.ctaButton}
                            />

                            {otpSent && (
                                <TouchableOpacity
                                    style={styles.resendButton}
                                    onPress={handleSendOTP}
                                    disabled={loading || verifying}
                                >
                                    <Text style={styles.resendText}>
                                        {loading ? 'RESENDING...' : "RESEND CODE"}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <View style={styles.divider} />

                            <TouchableOpacity onPress={() => router.replace('/(auth)')} style={styles.loginLink}>
                                <Text style={styles.loginLinkText}>ALREADY REGISTERED? LOGIN</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>SECURE MULTI-FACTOR AUTHENTICATION</Text>
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
    inputContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderColor: 'rgba(255,255,255,0.1)',
    },
    changeEmail: { marginTop: 8, alignSelf: 'flex-end' },
    changeEmailText: { color: '#FACC15', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    
    otpInput: { letterSpacing: 8, textAlign: 'center', fontSize: 24, fontWeight: '900' },
    timerText: { fontSize: 11, color: '#94A3B8', marginTop: 10, textAlign: 'center', fontWeight: '700' },
    
    ctaButton: { height: 60, borderRadius: 15, marginTop: 25 },
    resendButton: { marginTop: 20, alignItems: 'center' },
    resendText: { color: '#FACC15', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
    
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 25 },
    
    loginLink: { alignItems: 'center' },
    loginLinkText: { color: '#94A3B8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
    
    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
