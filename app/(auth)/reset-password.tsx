import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE_URL } from '@/utils/api-service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { validatePassword } from '@/utils/password-validator';

export default function SchoolResetPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!email) {
            router.replace('/(auth)/forgot-password');
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
            const response = await fetch(`${API_BASE_URL}/api/schools/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to reset password');
            }

            Alert.alert('Success', 'School administrator password reset successfully.', [
                {
                    text: 'OK',
                    onPress: async () => {
                        // Clear old session tokens if any to ensure clean landing
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
        <ThemedView style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#0F172A' }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                <View style={{ marginBottom: 40, alignItems: 'center' }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(26, 115, 232, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                        <Ionicons name="lock-closed" size={40} color="#1a73e8" />
                    </View>
                    <ThemedText type="title" style={{ color: '#fff', marginBottom: 8 }}>New Password</ThemedText>
                    <Text style={{ fontSize: 16, color: '#94A3B8', textAlign: 'center' }}>Set a new administrator password</Text>
                </View>

                <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 }}>New Password *</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 16 }}>
                            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={{ marginRight: 12 }} />
                            <TextInput
                                style={{ flex: 1, color: '#fff', fontSize: 16, paddingVertical: 16 }}
                                placeholder="Enter new password"
                                placeholderTextColor="#64748B"
                                value={password}
                                onChangeText={(v) => { setPassword(v); setError(''); }}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 }}>Confirm Password *</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 16 }}>
                            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={{ marginRight: 12 }} />
                            <TextInput
                                style={{ flex: 1, color: '#fff', fontSize: 16, paddingVertical: 16 }}
                                placeholder="Confirm new password"
                                placeholderTextColor="#64748B"
                                value={confirmPassword}
                                onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                                secureTextEntry={!showPassword}
                            />
                        </View>
                    </View>

                    {error ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                            <Ionicons name="alert-circle" size={20} color="#EF4444" />
                            <Text style={{ color: '#EF4444', marginLeft: 8, flex: 1, fontSize: 14 }}>{error}</Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        style={{ backgroundColor: '#1a73e8', borderRadius: 12, paddingVertical: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
                        onPress={handleResetPassword}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>RESET PASSWORD</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ThemedView>
    );
}
