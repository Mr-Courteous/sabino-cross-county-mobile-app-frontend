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

            router.push({
                pathname: '/(student)/verify-reset-otp',
                params: { email: email.trim().toLowerCase() }
            });
        } catch (error: any) {
            setError(error.message || 'Failed to send reset code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071' }}
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
                                <Ionicons name="ribbon" size={24} color="#FACC15" />
                                <Text style={styles.logoText}>SECURITY CENTER</Text>
                            </View>
                            <Text style={styles.title}>Reset Access</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>RECOVER YOUR STUDENT ACCOUNT</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="lock-open" size={40} color="#FACC15" />
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

                            <CustomInput
                                label="Registered Email Address"
                                placeholder="name@school.com"
                                value={email}
                                onChangeText={(text) => { setEmail(text); setError(''); }}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!loading}
                                containerStyle={styles.inputContainer}
                            />

                            <Text style={styles.infoText}>
                                We will send a secure verification code to this address.
                            </Text>

                            <CustomButton
                                title={loading ? "SENDING CODE..." : "GENERATE RESET CODE"}
                                onPress={handleSendOtp}
                                loading={loading}
                                variant="premium"
                                style={styles.ctaButton}
                            />
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>PASSPHRASE RECOVERY MECHANISM ACTIVE</Text>
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

    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
