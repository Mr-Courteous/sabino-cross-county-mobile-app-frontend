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
import { API_BASE_URL } from '@/utils/api-service';
import { CustomButton } from '@/components/custom-button';
import { CustomInput } from '@/components/custom-input';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/design-system';

export default function StudentVerifyEmail() {
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
            const response = await fetch(`${API_BASE_URL}/api/students/otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to send verification code');
            }

            router.push({
                pathname: '/(student)/verify-otp',
                params: { email: email.trim() }
            });
        } catch (error: any) {
            setError(error.message || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070' }}
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
                            <TouchableOpacity style={styles.backFab} onPress={() => router.back()}>
                                <Ionicons name="arrow-back" size={24} color="#FACC15" />
                            </TouchableOpacity>

                            <View style={styles.logoBadge}>
                                <Ionicons name="school" size={24} color="#FACC15" />
                                <Text style={styles.logoText}>ACADEMIA VERSE</Text>
                            </View>
                            <Text style={styles.title}>Student Entry</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>START YOUR ACADEMIC JOURNEY</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="id-card" size={40} color="#FACC15" />
                            </View>

                            {error && (
                                <CustomAlert
                                    type="error"
                                    title="Protocol Failure"
                                    message={error}
                                    onClose={() => setError('')}
                                    style={{ marginBottom: 20 }}
                                />
                            )}

                            <CustomInput
                                label="Official Email Address"
                                placeholder="student@school.edu"
                                value={email}
                                onChangeText={(text) => { setEmail(text); setError(''); }}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!loading}
                                containerStyle={styles.inputContainer}
                            />

                            <Text style={styles.infoText}>
                                A secure 6-digit handshake code will be sent to your inbox.
                            </Text>

                            <CustomButton
                                title={loading ? "VERIFYING..." : "GET SECURE OTP"}
                                onPress={handleSendOtp}
                                loading={loading}
                                variant="premium"
                                style={styles.ctaButton}
                            />

                            <TouchableOpacity
                                style={styles.loginLink}
                                onPress={() => router.push('/(student)')}
                            >
                                <Text style={styles.loginLinkText}>
                                    EXISTING STUDENT? <Text style={{ color: '#FACC15', fontWeight: '900' }}>SIGN IN</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>ENCRYPTED REGISTRATION HANDSHAKE ACTIVE</Text>
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
    backFab: {
        position: 'absolute',
        top: -20,
        left: 0,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
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
    inputContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderColor: 'rgba(255,255,255,0.1)',
    },
    infoText: { color: '#64748B', fontSize: 11, textAlign: 'center', marginTop: 10, marginBottom: 25, fontWeight: '600' },
    ctaButton: { height: 60, borderRadius: 15 },

    loginLink: { marginTop: 25, alignItems: 'center' },
    loginLinkText: { color: '#94A3B8', fontSize: 11, letterSpacing: 1, fontWeight: '700' },

    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
