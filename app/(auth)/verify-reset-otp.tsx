import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE_URL } from '@/utils/api-service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';

export default function SchoolVerifyResetOTPScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(600);
    const [error, setError] = useState('');
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
                    pathname: '/(auth)/reset-password',
                    params: { email },
                });
            } else {
                setError(data.message || 'OTP verification failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to verify OTP');
        } finally {
            setVerifying(false);
        }
    };

    const handleResendOTP = async () => {
        setVerifying(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (response.ok) {
                setTimeLeft(600);
                Alert.alert('Success', 'A new reset code has been sent.');
            }
        } catch (err) {
            setError('Failed to resend code');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <ThemedView style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#0F172A' }}>
            <View style={{ marginBottom: 40, alignItems: 'center' }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(26, 115, 232, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                    <Ionicons name="shield-checkmark" size={40} color="#1a73e8" />
                </View>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 }}>
                    Verify Code
                </Text>
                <Text style={{ fontSize: 16, color: '#94A3B8', textAlign: 'center' }}>
                    Enter the 6-digit code sent to {email}
                </Text>
            </View>

            <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <View style={{ marginBottom: 20 }}>
                    <TextInput
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: 24, paddingVertical: 16, textAlign: 'center', letterSpacing: 8, fontWeight: '900' }}
                        placeholder="000000"
                        placeholderTextColor="#64748B"
                        value={otp}
                        onChangeText={(text) => { setOtp(text.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                        keyboardType="numeric"
                        maxLength={6}
                        editable={!verifying}
                    />
                    <Text style={{ textAlign: 'center', marginTop: 12, color: timeLeft <= 60 ? '#EF4444' : '#94A3B8', fontSize: 12 }}>
                        {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : 'Code expired'}
                    </Text>
                </View>

                {error ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                        <Ionicons name="alert-circle" size={20} color="#EF4444" />
                        <Text style={{ color: '#EF4444', marginLeft: 8, flex: 1, fontSize: 14 }}>{error}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={{ backgroundColor: '#1a73e8', borderRadius: 12, paddingVertical: 16, alignItems: 'center', opacity: verifying || timeLeft === 0 ? 0.6 : 1 }}
                    onPress={handleVerifyOTP}
                    disabled={verifying || timeLeft === 0}
                >
                    {verifying ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>VERIFY CODE</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={handleResendOTP} disabled={verifying}>
                    <Text style={{ color: '#1a73e8', fontWeight: '600' }}>Resend Code</Text>
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}
