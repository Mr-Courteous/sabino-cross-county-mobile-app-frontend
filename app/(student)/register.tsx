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
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { validatePassword } from '@/utils/password-validator';
import { CustomButton } from '@/components/custom-button';
import { CustomInput } from '@/components/custom-input';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/design-system';

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

    useEffect(() => {
        if (!email) {
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
                const storage = Platform.OS === 'web' ? localStorage : SecureStore;
                const setItem = Platform.OS === 'web' ? (k: string, v: string) => storage.setItem(k, v) : (k: string, v: string) => SecureStore.setItemAsync(k, v);

                await setItem('studentToken', token);
                await setItem('studentData', JSON.stringify(student));

                Alert.alert('Activation Successful!', 'Your student account is now active.', [
                    { text: 'ENTER DASHBOARD', onPress: () => router.replace('/(student)/dashboard' as any) },
                ]);
            }
        } catch (error: any) {
            setError(error.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?q=80&w=2070' }}
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
                                <Text style={styles.logoText}>PROFILE SETUP</Text>
                            </View>
                            <Text style={styles.title}>Complete Account</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>FINAL STEP TO ACTIVATE PORTAL</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="person-circle" size={40} color="#FACC15" />
                            </View>

                            <View style={styles.verifiedBox}>
                                <Ionicons name="shield-checkmark" size={18} color="#FACC15" />
                                <Text style={styles.verifiedText}>{email}</Text>
                            </View>

                            {error && (
                                <CustomAlert
                                    type="error"
                                    title="Information Error"
                                    message={error}
                                    onClose={() => setError('')}
                                    style={{ marginBottom: 20 }}
                                />
                            )}

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <CustomInput
                                        label="First Name *"
                                        placeholder="John"
                                        value={formData.firstName}
                                        onChangeText={(v) => updateField('firstName', v)}
                                        containerStyle={styles.inputContainer}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <CustomInput
                                        label="Last Name *"
                                        placeholder="Doe"
                                        value={formData.lastName}
                                        onChangeText={(v) => updateField('lastName', v)}
                                        containerStyle={styles.inputContainer}
                                    />
                                </View>
                            </View>

                            <CustomInput
                                label="School Reg. Code *"
                                placeholder="ASK ADMIN FOR CODE"
                                value={formData.registrationCode}
                                onChangeText={(v) => updateField('registrationCode', v)}
                                autoCapitalize="characters"
                                containerStyle={styles.inputContainer}
                            />

                            <CustomInput
                                label="Secure Password *"
                                placeholder="Min. 8 characters"
                                isPassword
                                value={formData.password}
                                onChangeText={(v) => updateField('password', v)}
                                containerStyle={styles.inputContainer}
                            />

                            <CustomInput
                                label="Confirm Password *"
                                placeholder="Must match above"
                                isPassword
                                value={formData.confirmPassword}
                                onChangeText={(v) => updateField('confirmPassword', v)}
                                containerStyle={styles.inputContainer}
                            />

                            <CustomButton
                                title={loading ? "ACTIVATING..." : "FINISH & ACTIVATE ACCOUNT"}
                                onPress={handleRegister}
                                loading={loading}
                                variant="premium"
                                style={styles.ctaButton}
                            />
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>SABINO ENCRYPTED HANDSHAKE ACTIVE</Text>
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
    goldBar: { width: 60, height: 4, backgroundColor: '#FACC15', borderRadius: 2, marginVertical: 15 },
    subtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '800', letterSpacing: 1 },

    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 35,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 20
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
    verifiedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 15,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    verifiedText: { color: '#FACC15', fontWeight: '800', marginLeft: 10, fontSize: 13 },

    row: { flexDirection: 'row' },
    inputContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 15
    },
    ctaButton: { height: 60, borderRadius: 15, marginTop: 15 },

    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
