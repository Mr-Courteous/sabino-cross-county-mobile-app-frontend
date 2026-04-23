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

export default function StudentResetPassword() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

            Alert.alert('Protocol Success', 'Your access credentials have been updated.', [
                {
                    text: 'BACK TO GATEWAY',
                    onPress: async () => {
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
        <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070' }}
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
                                <Ionicons name="key" size={20} color="#FACC15" />
                                <Text style={styles.logoText}>IDENTITY SYNC</Text>
                            </View>
                            <Text style={styles.title}>Secure Reset</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>ESTABLISHING NEW ACCESS PROTOCOL</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="lock-closed" size={40} color="#FACC15" />
                            </View>

                            <View style={styles.verifiedBox}>
                                <Ionicons name="shield-checkmark" size={18} color="#FACC15" />
                                <Text style={styles.verifiedText}>{email}</Text>
                            </View>

                            {error && (
                                <CustomAlert
                                    type="error"
                                    title="System Exception"
                                    message={error}
                                    onClose={() => setError('')}
                                    style={{ marginBottom: 20 }}
                                />
                            )}

                            <CustomInput
                                label="New Secure Password"
                                placeholder="Min. 8 characters"
                                isPassword
                                value={password}
                                onChangeText={(v) => { setPassword(v); setError(''); }}
                                editable={!loading}
                                containerStyle={styles.inputContainer}
                            />

                            <CustomInput
                                label="Confirm Security Key"
                                placeholder="Re-enter password"
                                isPassword
                                value={confirmPassword}
                                onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                                editable={!loading}
                                containerStyle={styles.inputContainer}
                            />

                            <CustomButton
                                title={loading ? "SYNCING..." : "UPDATE SECURE ACCESS"}
                                onPress={handleResetPassword}
                                loading={loading}
                                variant="premium"
                                style={styles.ctaButton}
                            />
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>SABINO ENCRYPTED KEY EXCHANGE ACTIVE</Text>
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

    inputContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 15
    },
    ctaButton: { height: 60, borderRadius: 15, marginTop: 15 },

    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
