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
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { getUserTypeFromToken, decodeToken } from '@/utils/jwt-decoder';

export default function StudentLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/students/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            if (data.success) {
                const { student, token } = data.data;

                // Decode and verify token has user type
                const userType = getUserTypeFromToken(token);
                const decodedToken = decodeToken(token);

                console.log('🔐 Student Login Successful:');
                console.log('  Student:', student.first_name, student.last_name);
                console.log('  Token Type:', userType);
                console.log('  Token Decoded:', decodedToken);

                if (userType !== 'student') {
                    console.warn('⚠️ Token type is not "student":', userType);
                    setError('Invalid credentials. Please try again.');
                    setLoading(false);
                    return;
                }

                // Store token and student data (save under shared keys for root layout routing)
                if (Platform.OS === 'web') {
                    localStorage.setItem('userToken', token);
                    localStorage.setItem('userData', JSON.stringify(student));
                    localStorage.setItem('studentToken', token);
                    localStorage.setItem('studentData', JSON.stringify(student));
                } else {
                    await SecureStore.setItemAsync('userToken', token);
                    await SecureStore.setItemAsync('userData', JSON.stringify(student));
                    await SecureStore.setItemAsync('studentToken', token);
                    await SecureStore.setItemAsync('studentData', JSON.stringify(student));
                }

                console.log('✅ Token and user data stored');

                // Root layout will automatically route to /(student)/dashboard based on token type
                // Use router.replace to trigger the root layout's routing logic
                router.replace('/(student)/dashboard' as any);
            }
        } catch (error: any) {
            console.error('❌ Login Error:', error);
            const errorMsg = error.message || 'An error occurred during login';
            setError(errorMsg);
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
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="school" size={48} color="#FACC15" />
                        </View>
                        <Text style={styles.title}>Student Portal</Text>
                        <Text style={styles.subtitle}>Sign in to access your account</Text>
                    </View>

                    {/* Login Form */}
                    <View style={styles.formContainer}>
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Email Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="your.email@example.com"
                                    placeholderTextColor="#64748B"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#64748B"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                        size={20}
                                        color="#94A3B8"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#0F172A" />
                            ) : (
                                <>
                                    <Text style={styles.loginButtonText}>SIGN IN</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#0F172A" />
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/(student)/forgot-password' as any)}
                            disabled={loading}
                            style={{ marginTop: 15, alignItems: 'center' }}
                        >
                            <Text style={styles.registerButtonText}>FORGOT OR CHANGE PASSWORD?</Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Register Link */}
                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={() => {
                                console.log('➡️ Navigating to Student Registration...');
                                router.push('/(student)/verify-email' as any);
                            }}
                            disabled={loading}
                        >
                            <Text style={styles.registerButtonText}>CREATE NEW ACCOUNT</Text>
                        </TouchableOpacity>

                        {/* Back to Home */}
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                            disabled={loading}
                        >
                            <Ionicons name="arrow-back" size={16} color="#94A3B8" />
                            <Text style={styles.backButtonText}>Back to Home</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Having trouble? Contact your school administrator
                        </Text>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
    },
    formContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    errorText: {
        color: '#EF4444',
        marginLeft: 8,
        flex: 1,
        fontSize: 14,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E2E8F0',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        paddingVertical: 16,
    },
    eyeIcon: {
        padding: 8,
    },
    loginButton: {
        backgroundColor: '#FACC15',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#FACC15',
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
        marginRight: 8,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    dividerText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '600',
        marginHorizontal: 16,
        letterSpacing: 1,
    },
    registerButton: {
        borderWidth: 2,
        borderColor: '#FACC15',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    registerButtonText: {
        color: '#FACC15',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        paddingVertical: 12,
    },
    backButtonText: {
        color: '#94A3B8',
        fontSize: 14,
        marginLeft: 8,
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerText: {
        color: '#64748B',
        fontSize: 12,
        textAlign: 'center',
    },
});
