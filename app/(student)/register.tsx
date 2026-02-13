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

export default function StudentRegisterProfile() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        registrationCode: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (!email) {
            // If someone navigates here directly without email, send them back to the start
            router.replace('/(student)/verify-email');
        }
    }, [email]);

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const validateForm = () => {
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            setError('First and last name are required');
            return false;
        }

        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
            setError(passwordValidation.errorMessage);
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        if (!formData.registrationCode.trim()) {
            setError('School Registration Code is required');
            return false;
        }

        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            const requestBody = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: email.trim().toLowerCase(),
                password: formData.password,
                registrationCode: formData.registrationCode.trim(),
                ...(formData.phone && { phone: formData.phone.trim() }),
                ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth.trim() }),
                ...(formData.gender && { gender: formData.gender.trim() }),
            };

            const response = await fetch(`${API_BASE_URL}/api/students/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Registration failed');
            }

            if (data.success) {
                const { student, token } = data.data;
                if (Platform.OS === 'web') {
                    localStorage.setItem('studentToken', token);
                    localStorage.setItem('studentData', JSON.stringify(student));
                } else {
                    await SecureStore.setItemAsync('studentToken', token);
                    await SecureStore.setItemAsync('studentData', JSON.stringify(student));
                }

                Alert.alert('Success!', 'Your student account has been created.', [
                    { text: 'OK', onPress: () => router.replace('/(student)/dashboard' as any) },
                ]);
            }
        } catch (error: any) {
            setError(error.message || 'Registration failed');
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
                            <Ionicons name="person-add" size={48} color="#FACC15" />
                        </View>
                        <Text style={styles.title}>Setup Profile</Text>
                        <Text style={styles.subtitle}>Final Step: Complete your account details</Text>
                    </View>

                    <View style={styles.formContainer}>
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.verifiedText}>{email}</Text>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>First Name *</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="John"
                                        placeholderTextColor="#64748B"
                                        value={formData.firstName}
                                        onChangeText={(v) => updateField('firstName', v)}
                                    />
                                </View>
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Last Name *</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Doe"
                                        placeholderTextColor="#64748B"
                                        value={formData.lastName}
                                        onChangeText={(v) => updateField('lastName', v)}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>School Registration Code *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="business-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter school code"
                                    placeholderTextColor="#64748B"
                                    value={formData.registrationCode}
                                    onChangeText={(v) => updateField('registrationCode', v)}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Password"
                                    placeholderTextColor="#64748B"
                                    value={formData.password}
                                    onChangeText={(v) => updateField('password', v)}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm Password *</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Confirm Password"
                                    placeholderTextColor="#64748B"
                                    value={formData.confirmPassword}
                                    onChangeText={(v) => updateField('confirmPassword', v)}
                                    secureTextEntry={!showConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 8 }}>
                                    <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.actionButton, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#0F172A" />
                            ) : (
                                <>
                                    <Text style={styles.actionButtonText}>FINISH REGISTRATION</Text>
                                    <Ionicons name="checkmark-done-circle" size={20} color="#0F172A" />
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
    scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60 },
    header: { alignItems: 'center', marginBottom: 32 },
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
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 24
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
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)'
    },
    verifiedText: { color: '#10B981', fontWeight: 'bold', marginLeft: 10 },
    row: { flexDirection: 'row', marginBottom: 0 },
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
