import { useRouter } from 'expo-router';
import React from 'react';
import {
    View,
    ScrollView,
    ImageBackground,
    StyleSheet,
    Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedView } from '@/components/themed-view';
import {
    Colors,
    Spacing,
    BorderRadius,
} from '@/constants/design-system';

export default function RegisterScreen() {
    const router = useRouter();

    return (
        <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1523050853064-8504f2f495d7?q=80&w=2070' }}
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
                            <Text style={styles.title}>Registration</Text>
                            <View style={styles.goldBar} />
                            <Text style={styles.subtitle}>Join the Gold Standard of Reporting</Text>
                        </View>

                        <View style={styles.card}>
                            <CustomAlert
                                type="info"
                                title="3-STEP ENROLLMENT"
                                message="Verify email, set OTP, and complete school profile."
                                style={{ marginBottom: 30 }}
                            />

                            <View style={styles.featureList}>
                                <FeatureItem icon="shield-checkmark" text="Secure Session Encryption" />
                                <FeatureItem icon="cloud-done" text="Instant Data Sync" />
                                <FeatureItem icon="color-palette" text="Custom Portal Branding" />
                            </View>

                            <CustomButton
                                title="START REGISTRATION"
                                onPress={() => router.push('/(auth)/verify-email')}
                                variant="premium"
                                style={styles.ctaButton}
                            />

                            <View style={styles.divider} />

                            <View style={styles.loginSection}>
                                <Text style={styles.loginLabel}>Already have an account?</Text>
                                <CustomButton
                                    title="BACK TO LOGIN"
                                    onPress={() => router.push('/(auth)/verify-email')}
                                    variant="outline"
                                    style={styles.outlineButton}
                                    textStyle={{ color: '#fff', fontWeight: '800' }}
                                />
                            </View>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>SECURE SCHOOL ADMINISTRATION SYSTEM</Text>
                        </View>
                    </ScrollView>
                </LinearGradient>
            </ImageBackground>
        </ThemedView>
    );
}

function FeatureItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap, text: string }) {
    return (
        <View style={styles.featureItem}>
            <Ionicons name={icon} size={20} color="#2563EB" />
            <Text style={styles.featureText}>{text}</Text>
        </View>
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
    featureList: { marginBottom: 30 },
    featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    featureText: { color: '#E2E8F0', marginLeft: 12, fontSize: 14, fontWeight: '500' },
    
    ctaButton: { height: 60, borderRadius: 15 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 30 },
    
    loginSection: { alignItems: 'center' },
    loginLabel: { color: '#2563EB', fontSize: 13, marginBottom: 15, fontWeight: '600' },
    outlineButton: { borderColor: '#2563EB', borderWidth: 2, borderRadius: 15, width: '100%' },
    
    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});