import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Platform,
    ScrollView,
    ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { getUserTypeFromToken, decodeToken } from '@/utils/jwt-decoder';
import { CustomButton } from '@/components/custom-button';
import { CustomInput } from '@/components/custom-input';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/design-system';

export default function StudentLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Login failed');

            if (data.success) {
                const { student, token } = data.data;
                const userType = getUserTypeFromToken(token);

                if (userType !== 'student') {
                    setError('Invalid credentials for student portal.');
                    setLoading(false);
                    return;
                }

                const storage = Platform.OS === 'web' ? localStorage : SecureStore;
                const setItem = Platform.OS === 'web' ? (k: string, v: string) => storage.setItem(k, v) : (k: string, v: string) => SecureStore.setItemAsync(k, v);

                await setItem('userToken', token);
                await setItem('userData', JSON.stringify(student));
                await setItem('studentToken', token);
                await setItem('studentData', JSON.stringify(student));

                router.replace('/(student)/dashboard' as any);
            }
        } catch (error: any) {
            setError(error.message || 'An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1523240693567-520c80c8966e?q=80&w=2070' }}
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
                                <Text style={styles.logoText}>STUDENT PORTAL</Text>
                            </View>
                            <Text style={styles.title}>Welcome Back</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>ACCESS YOUR ACADEMIC PROGRESS</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="school" size={40} color="#FACC15" />
                            </View>

                            {error && (
                                <CustomAlert
                                    type="error"
                                    title="Access Denied"
                                    message={error}
                                    onClose={() => setError('')}
                                    style={{ marginBottom: 20 }}
                                />
                            )}

                            <CustomInput
                                label="Student Email"
                                placeholder="name@school.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!loading}
                                containerStyle={styles.inputContainer}
                            />

                            <CustomInput
                                label="Password"
                                placeholder="••••••••"
                                isPassword
                                value={password}
                                onChangeText={setPassword}
                                editable={!loading}
                                containerStyle={styles.inputContainer}
                            />

                            <TouchableOpacity
                                onPress={() => router.push('/(student)/forgot-password' as any)}
                                style={styles.forgotPass}
                            >
                                <Text style={styles.forgotText}>FORGOT PASSWORD?</Text>
                            </TouchableOpacity>

                            <CustomButton
                                title={loading ? "AUTHENTICATING..." : "SIGN IN TO PORTAL"}
                                onPress={handleLogin}
                                loading={loading}
                                variant="premium"
                                style={styles.ctaButton}
                            />

                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>OR</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <TouchableOpacity
                                style={styles.registerButton}
                                onPress={() => router.push('/(student)/verify-email' as any)}
                            >
                                <Text style={styles.registerText}>CREATE INDIVIDUAL ACCOUNT</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => router.back()}
                            >
                                <Text style={styles.backText}>← RETURN TO MAIN PAGE</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>SECURE STUDENT INFORMATION SYSTEM</Text>
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
    title: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
    goldBar: { width: 60, height: 4, backgroundColor: '#FACC15', borderRadius: 2, marginVertical: 15 },
    subtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '800', letterSpacing: 1 },

    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 35,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(250, 204, 21, 0.2)'
    },
    inputContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderColor: 'rgba(255,255,255,0.1)',
    },
    forgotPass: { alignSelf: 'flex-end', marginBottom: 25 },
    forgotText: { color: '#FACC15', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

    ctaButton: { height: 60, borderRadius: 15 },

    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
    dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    dividerText: { color: '#64748B', fontSize: 12, fontWeight: '800', marginHorizontal: 20 },

    registerButton: {
        height: 55,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#FACC15',
        alignItems: 'center',
        justifyContent: 'center'
    },
    registerText: { color: '#FACC15', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

    backButton: { marginTop: 25, alignItems: 'center' },
    backText: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
