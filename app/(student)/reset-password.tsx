import React, { useState, useEffect, useMemo } from 'react';
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
    useWindowDimensions,
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
    const { width } = useWindowDimensions();
    const styles = useMemo(() => makeStyles(width), [width]);
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { if (!email) router.replace('/(student)/forgot-password'); }, [email]);

    const handleResetPassword = async () => {
        if (!password || !confirmPassword) return;
        const validation = validatePassword(password);
        if (!validation.isValid) { setError(validation.errorMessage); return; }
        if (password !== confirmPassword) { setError('Passwords mismatch'); return; }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/students/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!response.ok) throw new Error('Reset failed');
            
            Alert.alert('Success', 'Access updated.', [
                {
                    text: 'OK',
                    onPress: async () => {
                        if (Platform.OS === 'web') { localStorage.removeItem('studentToken'); }
                        else { await SecureStore.deleteItemAsync('studentToken'); }
                        router.replace('/');
                    }
                }
            ]);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    const isTiny = width < 300;

    return (
        <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
            <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070' }} style={styles.hero}>
                <LinearGradient colors={['rgba(10, 15, 30, 0.8)', 'rgba(15, 23, 42, 0.98)']} style={styles.overlay}>
                    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                        <View style={styles.header}>
                            <View style={styles.logoBadge}><Ionicons name="key" size={20} color="#FACC15" /><Text style={styles.logoText}>IDENTITY SYNC</Text></View>
                            <Text style={styles.title}>Secure Reset</Text>
                            <View style={styles.goldBar} />
                        </View>

                        <View style={styles.card}>
                            {!isTiny && <View style={styles.iconCircle}><Ionicons name="lock-closed" size={32} color="#FACC15" /></View>}
                            <View style={styles.verifiedBox}><Text style={styles.verifiedText}>{email}</Text></View>
                            {error ? <CustomAlert type="error" title="Error" message={error} onClose={() => setError('')} style={{ marginBottom: 16 }} /> : null}
                            <CustomInput label="New Password" placeholder="••••••••" isPassword value={password} onChangeText={setPassword} editable={!loading} />
                            <CustomInput label="Confirm Password" placeholder="••••••••" isPassword value={confirmPassword} onChangeText={setConfirmPassword} editable={!loading} />
                            <CustomButton title={loading ? "SYNCING..." : "UPDATE"} onPress={handleResetPassword} loading={loading} variant="premium" style={styles.ctaButton} />
                        </View>
                        <View style={styles.footer}><Text style={styles.footerText}>ENCRYPTED EXCHANGE ACTIVE</Text></View>
                    </ScrollView>
                </LinearGradient>
            </ImageBackground>
        </ThemedView>
    );
}

function makeStyles(width: number) {
    const isTiny = width < 300;
    return StyleSheet.create({
        hero: { flex: 1, width: '100%' },
        overlay: { flex: 1, paddingHorizontal: isTiny ? 16 : 24 },
        scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingVertical: isTiny ? 40 : 60 },
        header: { alignItems: 'center', marginBottom: isTiny ? 24 : 32 },
        logoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
        logoText: { color: '#FACC15', fontSize: 11, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
        title: { fontSize: isTiny ? 26 : 30, fontWeight: '900', color: '#fff', letterSpacing: -1 },
        goldBar: { width: 40, height: 3, backgroundColor: '#FACC15', borderRadius: 2, marginVertical: 12 },
        card: { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 28, padding: isTiny ? 20 : 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
        iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(250, 204, 21, 0.1)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.2)' },
        verifiedBox: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12, marginBottom: 20, alignItems: 'center' },
        verifiedText: { color: '#FACC15', fontWeight: '800', fontSize: 11 },
        ctaButton: { height: 52, borderRadius: 12, marginTop: 10 },
        footer: { marginTop: 30, alignItems: 'center' },
        footerText: { color: '#334155', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    });
}
