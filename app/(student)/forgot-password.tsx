import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/utils/api-service';

export default function StudentForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOtp = async () => {
        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid student email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/students/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to send reset code');
            }

            // Navigate to OTP verification page for password reset
            router.push({
                pathname: '/(student)/verify-reset-otp',
                params: { email: email.trim().toLowerCase() }
            });
        } catch (error: any) {
            console.error('Student Forgot Password Error:', error);
            setError(error.message || 'Failed to send reset code');
        } finally {
            setLoading(false);
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
                            <Ionicons name="lock-open-outline" size={48} color="#FACC15" />
                        </View>

                        <Text style={styles.title}>Forgot Password</Text>
                        <Text style={styles.subtitle}>Enter your email to receive a reset code</Text>
                    </View>

                    <View style={styles.formContainer}>
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your registered email"
                                    placeholderTextColor="#64748B"
                                    value={email}
                                    onChangeText={(text) => { setEmail(text); setError(''); }}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.actionButton, loading && styles.buttonDisabled]}
                            onPress={handleSendOtp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#0F172A" />
                            ) : (
                                <>
                                    <Text style={styles.actionButtonText}>SEND RESET CODE</Text>
                                    <Ionicons name="send-outline" size={20} color="#0F172A" />
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.infoText}>
                            We'll send a 6-digit code to your email to verify your identity.
                        </Text>
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
    input: { flex: 1, color: '#FFFFFF', fontSize: 16, paddingVertical: 16 },
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
    infoText: { color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 16, fontStyle: 'italic' }
});
