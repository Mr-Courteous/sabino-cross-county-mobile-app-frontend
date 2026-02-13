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
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { validatePassword } from '@/utils/password-validator';

export default function StudentResetPassword() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!email) {
            router.replace('/(student)/forgot-password');
        }
    }, [email]);

    const handleResetPassword = async () => {
        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setError(passwordValidation.errorMessage);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/students/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to reset password');
            }

            Alert.alert('Success', 'Your password has been reset successfully. You can now login with your new password.', [
                {
                    text: 'OK',
                    onPress: async () => {
                        // Clear old session tokens if any to ensure clean landing
                        if (Platform.OS === 'web') {
                            localStorage.removeItem('userToken');
                            localStorage.removeItem('studentToken');
                        } else {
                            await SecureStore.deleteItemAsync('userToken');
                            await SecureStore.deleteItemAsync('studentToken');
                        }
                        router.replace('/');
                    }
                }
            ]);
        } catch (error: any) {
            setError(error.message || 'Failed to reset password');
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
                        <View style={styles.iconContainer}>
                            <Ionicons name="shield-checkmark-outline" size={48} color="#FACC15" />
                        </View>
                        <Text style={styles.title}>New Password</Text>
                        <Text style={styles.subtitle}>Set a strong password for your account</Text>
                    </View>

                    <View style={styles.formContainer}>
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>New Password *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter new password"
                                    placeholderTextColor="#64748B"
                                    value={password}
                                    onChangeText={(v) => { setPassword(v); setError(''); }}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm New Password *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm new password"
                                    placeholderTextColor="#64748B"
                                    value={confirmPassword}
                                    onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.actionButton, loading && styles.buttonDisabled]}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#0F172A" />
                            ) : (
                                <>
                                    <Text style={styles.actionButtonText}>RESET PASSWORD</Text>
                                    <Ionicons name="checkmark-done" size={20} color="#0F172A" />
                                </>
                            )}
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
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20
    },
    buttonDisabled: { opacity: 0.6 },
    actionButtonText: { color: '#0F172A', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginRight: 8 }
});
