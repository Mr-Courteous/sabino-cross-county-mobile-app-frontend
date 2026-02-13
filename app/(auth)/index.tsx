import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Platform
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { getUserTypeFromToken, decodeToken } from '@/utils/jwt-decoder';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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

            console.log('📥 School Login Response:', {
                status: response.status,
                success: data.success,
                hasToken: !!data.data?.token,
                user: data.data?.user,
            });

            if (response.ok && data.success && data.data?.token) {
                const { token, user } = data.data;

                // Decode and verify token
                const userType = getUserTypeFromToken(token);
                const decodedToken = decodeToken(token);

                console.log('🔐 School Login Successful:');
                console.log('  School:', user.name);
                console.log('  Token Type:', userType);
                console.log('  Token Decoded:', decodedToken);

                if (userType !== 'school') {
                    console.error('❌ Token type is not "school":', userType);
                    setError('Invalid credentials. Please try again.');
                    setIsLoading(false);
                    return;
                }

                const countryId = user?.countryId;

                console.log('✅ Login validated:');
                console.log('  Token: ✓ Present');
                console.log('  CountryId:', countryId || '⚠️ UNDEFINED');
                console.log('  SchoolId:', user.schoolId || user.id);

                if (!countryId) {
                    console.error('❌ CountryId missing from login response!');
                    setError('Server error: Country information missing. Please contact support.');
                    setIsLoading(false);
                    return;
                }

                try {
                    if (Platform.OS === 'web') {
                        console.log('💾 Saving to localStorage (Web)...');
                        localStorage.setItem('userToken', token);
                        localStorage.setItem('userData', JSON.stringify(user));
                        localStorage.setItem('countryId', countryId.toString());

                        console.log('✅ Web storage saved:');
                        console.log('  userToken:', localStorage.getItem('userToken') ? '✓' : '✗');
                        console.log('  userData:', localStorage.getItem('userData') ? '✓' : '✗');
                        console.log('  countryId:', localStorage.getItem('countryId'));
                    } else {
                        console.log('💾 Saving to SecureStore (Mobile)...');
                        await SecureStore.setItemAsync('userToken', token);
                        await SecureStore.setItemAsync('userData', JSON.stringify(user));
                        await SecureStore.setItemAsync('countryId', countryId.toString());

                        const verifyToken = await SecureStore.getItemAsync('userToken');
                        const verifyCountryId = await SecureStore.getItemAsync('countryId');

                        console.log('✅ Mobile storage saved:');
                        console.log('  userToken:', verifyToken ? '✓' : '✗');
                        console.log('  userData: ✓');
                        console.log('  countryId:', verifyCountryId);
                    }

                    console.log('🚀 Navigating to dashboard...');
                    // Root layout will automatically route based on decoded token type
                    router.replace('/dashboard');

                } catch (e) {
                    console.error('❌ Storage Error:', e);
                    setError('Could not save login session.');
                    setIsLoading(false);
                }
            } else {
                console.error('❌ Login failed:', data);
                // Display actual backend error message
                const errorMsg = data.error || data.message || 'Invalid email or password';
                setError(errorMsg);
                setIsLoading(false);
            }
        } catch (err) {
            console.error('❌ Login error:', err);
            const errorMsg = err instanceof Error ? err.message : 'Login failed. Please try again.';
            setError(errorMsg);
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>School Portal</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Admin Login</Text>

                <TextInput
                    placeholder="School Email"
                    style={styles.input}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    editable={!isLoading}
                    placeholderTextColor="#999"
                />

                <View style={{ position: 'relative' }}>
                    <TextInput
                        placeholder="Password"
                        secureTextEntry={!showPassword}
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        editable={!isLoading}
                        placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            right: 15,
                            top: 15,
                            padding: 5,
                        }}
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Text style={{ fontSize: 20 }}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                    </TouchableOpacity>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Login to Dashboard</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/(auth)/forgot-password')}
                    disabled={isLoading}
                    style={{ marginTop: 15, alignItems: 'center' }}
                >
                    <Text style={styles.link}>Forgot or Change Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/(auth)/register')}
                    disabled={isLoading}
                >
                    <Text style={styles.footer}>
                        Don't have an account?{' '}
                        <Text style={styles.link}>Register School</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
        textAlign: 'center',
        color: '#1a73e8',
    },
    card: {
        backgroundColor: '#fff',
        padding: 25,
        borderRadius: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        backgroundColor: '#f9f9f9',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#1a73e8',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    errorText: {
        color: '#d32f2f',
        marginBottom: 10,
        fontSize: 14,
    },
    footer: {
        marginTop: 20,
        textAlign: 'center',
        color: '#666',
        fontSize: 14,
    },
    link: {
        color: '#1a73e8',
        fontWeight: 'bold',
    },
});