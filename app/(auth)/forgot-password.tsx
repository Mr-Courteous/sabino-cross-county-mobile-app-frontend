import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/utils/api-service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';

export default function SchoolForgotPasswordScreen() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOTP = async () => {
        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid school email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Navigate to OTP verification page for schools
                router.push({
                    pathname: '/(auth)/verify-reset-otp',
                    params: { email: email.trim() }
                });
            } else {
                setError(result.message || result.error || 'Failed to send reset code');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#0F172A' }}>
            <View style={{ marginBottom: 40, alignItems: 'center' }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(25, 115, 232, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                    <Ionicons name="key" size={40} color="#1a73e8" />
                </View>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 }}>
                    Reset Password
                </Text>
                <Text style={{ fontSize: 16, color: '#94A3B8', textAlign: 'center' }}>
                    Enter your school administrator email
                </Text>
            </View>

            <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 }}>
                        School Email Address *
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 16 }}>
                        <Ionicons name="mail-outline" size={20} color="#94A3B8" style={{ marginRight: 12 }} />
                        <TextInput
                            style={{ flex: 1, color: '#fff', fontSize: 16, paddingVertical: 16 }}
                            placeholder="admin@school.com"
                            placeholderTextColor="#64748B"
                            value={email}
                            onChangeText={(text) => { setEmail(text); setError(''); }}
                            editable={!loading}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {error ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                        <Ionicons name="alert-circle" size={20} color="#EF4444" />
                        <Text style={{ color: '#EF4444', marginLeft: 8, flex: 1, fontSize: 14 }}>{error}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={{
                        backgroundColor: '#1a73e8',
                        borderRadius: 12,
                        paddingVertical: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: loading ? 0.6 : 1,
                    }}
                    onPress={handleSendOTP}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginRight: 8 }}>
                                SEND RESET CODE
                            </Text>
                            <Ionicons name="send" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={{ marginTop: 32, alignItems: 'center' }}
                onPress={() => router.back()}
            >
                <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600' }}>← Back to Login</Text>
            </TouchableOpacity>
        </ThemedView>
    );
}
