import { View, ActivityIndicator, ScrollView, ImageBackground, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '@/utils/api-service';
import { CustomButton } from '@/components/custom-button';
import { CustomInput } from '@/components/custom-input';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedView } from '@/components/themed-view';
import {
    Colors,
    Spacing,
} from '@/constants/design-system';

export default function SchoolForgotPasswordScreen() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOTP = async () => {
        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid school email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/schools/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                router.push({
                    pathname: '/(auth)/verify-reset-otp',
                    params: { email: email.trim() }
                });
            } else {
                setError(result.message || result.error || 'Failed to send reset code');
            }
        } catch (err) {
            setError('An unexpected error occurred');
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
                            <View style={styles.logoBadge}>
                                <Ionicons name="ribbon" size={24} color="#FACC15" />
                                <Text style={styles.logoText}>SABINO PORTAL</Text>
                            </View>
                            <Text style={styles.title}>Reset Security</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>Recover Your Administrator Access</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="key" size={32} color="#FACC15" />
                            </View>

                            {error && (
                                <CustomAlert
                                    type="error"
                                    title="Security Error"
                                    message={error}
                                    onClose={() => setError('')}
                                    style={{ marginBottom: 20 }}
                                />
                            )}

                            <CustomInput
                                label="Administrator Email *"
                                placeholder="enter@email.com"
                                keyboardType="email-address"
                                value={email}
                                onChangeText={(text) => { setEmail(text); setError(''); }}
                                editable={!loading}
                                containerStyle={styles.inputContainer}
                            />

                            <CustomButton
                                title={loading ? "SENDING..." : "SEND RESET CODE"}
                                onPress={handleSendOTP}
                                disabled={loading}
                                loading={loading}
                                variant="premium"
                                style={styles.ctaButton}
                            />

                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <Text style={styles.backText}>← RETURN TO LOGIN</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>SECURE ACCESS VERIFICATION SYSTEM</Text>
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
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
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
        marginBottom: 20,
    },
    ctaButton: { height: 60, borderRadius: 15 },
    backButton: { marginTop: 25, alignItems: 'center' },
    backText: { color: '#94A3B8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
    
    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
