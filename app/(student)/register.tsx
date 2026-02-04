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
    Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';

export default function StudentRegister() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
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

    // Registration Flow states
    const [step, setStep] = useState(1); // 1: Email/OTP, 2: Full Form
    const [isEmailVerified, setIsEmailVerified] = useState(false);

    // OTP Verification states
    const [isOtpModalVisible, setIsOtpModalVisible] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(''); // Clear error when user types
    };

    const validateEmail = () => {
        if (!formData.email) {
            setError('Email is required');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }
        return true;
    };

    const validateFullForm = () => {
        setError('');
        if (!formData.email || !formData.email.trim()) {
            setError('Email is missing. Please go back to step 1.');
            return false;
        }

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            setError('First and last name are required');
            return false;
        }

        if (!formData.password) {
            setError('Password is required');
            return false;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
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

    const handleSendOtp = async () => {
        if (!validateEmail()) return;

        setIsSendingOtp(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/students/otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to send verification code');
            }

            setIsOtpModalVisible(true);
        } catch (error: any) {
            console.error('OTP Send Error:', error);
            setError(error.message);
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otpCode.length !== 6) {
            Alert.alert('Error', 'Please enter the 6-digit code');
            return;
        }

        setIsVerifyingOtp(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/students/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, otp: otpCode }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Invalid or expired verification code');
            }

            setIsEmailVerified(true);
            setIsOtpModalVisible(false);
            setStep(2); // Move to profile setup
            Alert.alert('Email Verified', 'Great! Now please complete your profile details.');
        } catch (error: any) {
            Alert.alert('Verification Failed', error.message);
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleFinalRegister = async () => {
        if (!validateFullForm()) return;

        setLoading(true);
        setError('');

        try {
            const requestBody = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                registrationCode: formData.registrationCode.trim(),
                ...(formData.phone && { phone: formData.phone.trim() }),
                ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth.trim() }),
                ...(formData.gender && { gender: formData.gender.trim() }),
            };

            console.log('Final Registration Payload:', requestBody);

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

                Alert.alert('Success!', 'Your account has been created successfully.', [
                    { text: 'OK', onPress: () => router.replace('/(student)/dashboard' as any) },
                ]);
            }
        } catch (error: any) {
            console.error('Final Registration Error:', error);
            setError(error.message);
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
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                            disabled={loading}
                        >
                            <Ionicons name="arrow-back" size={24} color="#FACC15" />
                        </TouchableOpacity>
                        <View style={styles.iconContainer}>
                            <Ionicons name="person-add" size={48} color="#FACC15" />
                        </View>
                        <Text style={styles.title}>{step === 1 ? 'Verify Email' : 'Setup Profile'}</Text>
                        <Text style={styles.subtitle}>{step === 1 ? 'Step 1: Start representing your identity' : 'Step 2: Complete your registration'}</Text>
                    </View>

                    {/* Registration Form */}
                    <View style={styles.formContainer}>
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {step === 1 ? (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Email Address *</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="your.email@example.com"
                                            placeholderTextColor="#64748B"
                                            value={formData.email}
                                            onChangeText={(value) => updateField('email', value)}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            editable={!isSendingOtp}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.registerButton, isSendingOtp && styles.registerButtonDisabled]}
                                    onPress={handleSendOtp}
                                    disabled={isSendingOtp}
                                >
                                    {isSendingOtp ? (
                                        <ActivityIndicator color="#0F172A" />
                                    ) : (
                                        <>
                                            <Text style={styles.registerButtonText}>VERIFY EMAIL</Text>
                                            <Ionicons name="arrow-forward" size={20} color="#0F172A" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                    <Text style={styles.verifiedText}>{formData.email}</Text>
                                    <TouchableOpacity onPress={() => { setStep(1); setIsEmailVerified(false); }}>
                                        <Text style={styles.changeText}>Change</Text>
                                    </TouchableOpacity>
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
                                                onChangeText={(value) => updateField('firstName', value)}
                                                editable={!loading}
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
                                                onChangeText={(value) => updateField('lastName', value)}
                                                editable={!loading}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Registration Code *</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="business-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter school registration code"
                                            placeholderTextColor="#64748B"
                                            value={formData.registrationCode}
                                            onChangeText={(value) => updateField('registrationCode', value)}
                                            autoCapitalize="characters"
                                            editable={!loading}
                                        />
                                    </View>
                                    <Text style={styles.hint}>Enter the unique code provided by your school</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Password *</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { flex: 1 }]}
                                            placeholder="At least 6 characters"
                                            placeholderTextColor="#64748B"
                                            value={formData.password}
                                            onChangeText={(value) => updateField('password', value)}
                                            secureTextEntry={!showPassword}
                                            editable={!loading}
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
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
                                            placeholder="Re-enter password"
                                            placeholderTextColor="#64748B"
                                            value={formData.confirmPassword}
                                            onChangeText={(value) => updateField('confirmPassword', value)}
                                            secureTextEntry={!showConfirmPassword}
                                            editable={!loading}
                                        />
                                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                            <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#94A3B8" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.divider}>
                                    <View style={styles.dividerLine} /><Text style={styles.dividerText}>OPTIONAL</Text><View style={styles.dividerLine} />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Phone Number</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="call-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="+123..."
                                            placeholderTextColor="#64748B"
                                            value={formData.phone}
                                            onChangeText={(value) => updateField('phone', value)}
                                            keyboardType="phone-pad"
                                            editable={!loading}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                                    onPress={handleFinalRegister}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#0F172A" />
                                    ) : (
                                        <>
                                            <Text style={styles.registerButtonText}>COMPLETE REGISTRATION</Text>
                                            <Ionicons name="checkmark-circle" size={20} color="#0F172A" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Login Link */}
                        <View style={styles.loginLinkContainer}>
                            <Text style={styles.loginLinkText}>Already have an account? </Text>
                            <TouchableOpacity
                                onPress={() => router.push('/(student)' as any)}
                                disabled={loading}
                            >
                                <Text style={styles.loginLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>

            {/* OTP Verification Modal */}
            <Modal
                visible={isOtpModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsOtpModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconContainer}>
                                <Ionicons name="mail-open" size={32} color="#FACC15" />
                            </View>
                            <Text style={styles.modalTitle}>Verify Email</Text>
                            <Text style={styles.modalSubtitle}>
                                We've sent a 6-digit code to{'\n'}
                                <Text style={styles.modalEmailText}>{formData.email}</Text>
                            </Text>
                        </View>

                        <View style={styles.otpInputGroup}>
                            <TextInput
                                style={styles.otpInput}
                                placeholder="000000"
                                placeholderTextColor="#475569"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={otpCode}
                                onChangeText={setOtpCode}
                                autoFocus={true}
                            />
                            <Text style={styles.otpHint}>Check your inbox and spam folder</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.verifyButton, isVerifyingOtp && styles.verifyButtonDisabled]}
                            onPress={handleVerifyOtp}
                            disabled={isVerifyingOtp}
                        >
                            {isVerifyingOtp ? (
                                <ActivityIndicator color="#0F172A" />
                            ) : (
                                <Text style={styles.verifyButtonText}>VERIFY CODE</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resendButton}
                            onPress={handleSendOtp}
                            disabled={isSendingOtp || isVerifyingOtp}
                        >
                            <Text style={styles.resendButtonText}>
                                {isSendingOtp ? 'Resending...' : "Didn't receive code? Resend"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.closeModalButton}
                            onPress={() => setIsOtpModalVisible(false)}
                            disabled={isVerifyingOtp}
                        >
                            <Text style={styles.closeModalText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    backButton: {
        position: 'absolute',
        top: 0,
        left: 0,
        padding: 8,
        zIndex: 10,
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
        marginBottom: 24,
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
    row: {
        flexDirection: 'row',
        marginBottom: 0,
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
    hint: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        fontStyle: 'italic',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
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
    registerButtonDisabled: {
        opacity: 0.6,
    },
    registerButtonText: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
        marginRight: 8,
    },
    loginLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    loginLinkText: {
        color: '#94A3B8',
        fontSize: 14,
    },
    loginLink: {
        color: '#FACC15',
        fontSize: 14,
        fontWeight: '700',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    verifiedText: {
        color: '#10B981',
        fontWeight: '600',
        marginLeft: 8,
        flex: 1,
        fontSize: 14,
    },
    changeText: {
        color: '#FACC15',
        fontSize: 12,
        fontWeight: '700',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#1E293B',
        borderRadius: 32,
        padding: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    modalIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 24,
    },
    modalEmailText: {
        color: '#FACC15',
        fontWeight: '700',
    },
    otpInputGroup: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 32,
    },
    otpInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        width: '100%',
        borderRadius: 16,
        paddingVertical: 20,
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    otpHint: {
        color: '#64748B',
        fontSize: 12,
        marginTop: 12,
        fontStyle: 'italic',
    },
    verifyButton: {
        backgroundColor: '#FACC15',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#FACC15',
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
    verifyButtonDisabled: {
        opacity: 0.6,
    },
    verifyButtonText: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    resendButton: {
        padding: 12,
        marginBottom: 8,
    },
    resendButtonText: {
        color: '#FACC15',
        fontSize: 14,
        fontWeight: '600',
    },
    closeModalButton: {
        padding: 12,
    },
    closeModalText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '600',
    },
});
