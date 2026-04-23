import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    View,
    ActivityIndicator,
    Platform,
    ScrollView,
    Text,
    ImageBackground,
    StyleSheet,
    Dimensions,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '@/utils/api-service';
import { getUserTypeFromToken, decodeToken } from '@/utils/jwt-decoder';
import { CustomButton } from '@/components/custom-button';
import { CustomInput } from '@/components/custom-input';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import {
    Colors,
    Typography,
    Spacing,
    BorderRadius,
    Shadows,
} from '@/constants/design-system';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter email and password');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok && data.success && data.data?.token) {
                const { token, user } = data.data;
                const userType = getUserTypeFromToken(token);

                if (userType !== 'school') {
                    setError('Invalid credentials. Please try again.');
                    setIsLoading(false);
                    return;
                }

                const countryId = user?.countryId;
                if (!countryId) {
                    setError('Server error: Country information missing.');
                    setIsLoading(false);
                    return;
                }

                if (Platform.OS === 'web') {
                    localStorage.setItem('userToken', token);
                    localStorage.setItem('userData', JSON.stringify(user));
                    localStorage.setItem('countryId', countryId.toString());
                } else {
                    await SecureStore.setItemAsync('userToken', token);
                    await SecureStore.setItemAsync('userData', JSON.stringify(user));
                    await SecureStore.setItemAsync('countryId', countryId.toString());
                }

                router.replace('/dashboard');
            } else {
                setError(data.error || data.message || 'Invalid email or password');
                setIsLoading(false);
            }
        } catch (err) {
            setError('Login failed. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071' }}
                style={styles.hero}
            >
                <LinearGradient
                    colors={['rgba(10, 15, 30, 0.7)', 'rgba(15, 23, 42, 0.95)']}
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
                            <Text style={styles.title}>School Login</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>Secure Access to Academic Management</Text>
                        </View>

                        <View style={styles.card}>
                            {/* Error Alert */}
                            {error && (
                                <CustomAlert
                                    type="error"
                                    title="Access Denied"
                                    message={error}
                                    onClose={() => setError('')}
                                    style={{ marginBottom: Spacing.xl }}
                                />
                            )}

                            <CustomInput
                                label="School Email"
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                value={email}
                                onChangeText={setEmail}
                                editable={!isLoading}
                                containerStyle={styles.inputContainer}
                            />

                            <CustomInput
                                label="Password"
                                placeholder="Enter your password"
                                isPassword
                                value={password}
                                onChangeText={setPassword}
                                editable={!isLoading}
                                containerStyle={styles.inputContainer}
                            />

                            <CustomButton
                                title={isLoading ? "AUTHENTICATING..." : "LOGIN TO DASHBOARD"}
                                onPress={handleLogin}
                                disabled={isLoading}
                                loading={isLoading}
                                variant="premium"
                                style={styles.loginButton}
                            />

                            <CustomButton
                                title="FORGOT PASSWORD?"
                                onPress={() => router.push('/(auth)/forgot-password')}
                                disabled={isLoading}
                                variant="ghost"
                                textStyle={styles.forgotText}
                            />

                            <View style={styles.divider} />

                            <View style={styles.registerSection}>
                                <Text style={styles.registerLabel}>Don't have an account?</Text>
                                <CustomButton
                                    title="REGISTER YOUR SCHOOL"
                                    onPress={() => router.push('/(auth)/register')}
                                    disabled={isLoading}
                                    variant="outline"
                                    style={styles.registerButton}
                                    textStyle={{ color: '#fff', fontWeight: '800' }}
                                />
                            </View>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>© 2026 SABINO SYSTEMS GLOBAL</Text>
                            <Text style={styles.footerSubtext}>THE GOLD STANDARD FOR ACADEMIC REPORTING</Text>
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
    subtitle: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },

    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 35,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    inputContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 15,
    },
    loginButton: {
        marginTop: 10,
        backgroundColor: '#2563EB',
        borderRadius: 15,
        height: 60,
    },
    forgotText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 25,
    },
    registerSection: { alignItems: 'center' },
    registerLabel: { color: '#64748B', fontSize: 13, marginBottom: 15, fontWeight: '600' },
    registerButton: {
        borderColor: '#2563EB',
        borderWidth: 2,
        borderRadius: 15,
        width: '100%',
    },
    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    footerSubtext: { color: '#1E293B', fontSize: 9, fontWeight: '900', marginTop: 5 }
});