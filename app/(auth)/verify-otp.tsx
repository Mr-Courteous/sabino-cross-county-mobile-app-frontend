import { View, ActivityIndicator, Alert, ScrollView, ImageBackground, StyleSheet, Text, TouchableOpacity } from 'react-native';
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

export default function VerifyOTPScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(600);
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        if (timeLeft <= 0) {
            setError('OTP has expired. Please request a new one.');
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleVerifyOTP = async () => {
        if (!otp.trim()) {
            setError('Please enter the OTP');
            return;
        }

        if (otp.length !== 6 || !/^\d+$/.test(otp)) {
            setError('OTP must be 6 digits');
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

    const handleRequestNewOTP = () => {
        router.back();
    };

    const isExpired = timeLeft <= 0;
    const isAlmostExpired = timeLeft <= 60;

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
                            <Text style={styles.title}>Email Verification</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>SECURE ACCESS CODE REQUIRED</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="mail-open" size={32} color="#FACC15" />
                            </View>

                            <View style={styles.infoBox}>
                                <Text style={styles.infoLabel}>CODE SENT TO:</Text>
                                <Text style={styles.infoValue}>{email}</Text>
                            </View>

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
                                label="6-Digit Verification Code *"
                                placeholder="000000"
                                value={otp}
                                onChangeText={(text) => {
                                    const digitsOnly = text.replace(/\D/g, '').slice(0, 6);
                                    setOtp(digitsOnly);
                                    setError('');
                                }}
                                keyboardType="numeric"
                                maxLength={6}
                                editable={!isExpired && !verifying}
                                inputStyle={styles.otpInput}
                                containerStyle={styles.inputContainer}
                            />

                            <Text style={[styles.timerText, isAlmostExpired && { color: '#EF4444' }]}>
                                {isExpired ? '⏰ Code expired' : `⏱ Code expires in ${formatTime(timeLeft)}`}
                            </Text>

                            <CustomButton
                                title={verifying ? "VERIFYING..." : "ACTIVATE & CONTINUE"}
                                onPress={handleVerifyOTP}
                                disabled={isExpired || verifying}
                                loading={verifying}
                                variant="premium"
                                style={styles.ctaButton}
                            />

                            <TouchableOpacity style={styles.resendButton} onPress={handleRequestNewOTP} disabled={verifying}>
                                <Text style={styles.resendText}>REQUEST NEW CODE</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>ENCRYPTED HANDSHAKE ESTABLISHED</Text>
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
    infoBox: {
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        padding: 15,
        borderRadius: 15,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center'
    },
    infoLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
    infoValue: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
    
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
