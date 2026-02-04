import React, { createContext, ReactNode, useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { authApi, User, schoolApi } from '@/utils/api-calls-new';
import { apiService } from '@/utils/api-service';
import { clearAllStorage } from '@/utils/storage';

interface AuthResponse {
  success: boolean;
  message: string;
}

interface OTPResponse {
  success: boolean;
  message: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  // New school registration with OTP
  sendOTP: (email: string) => Promise<OTPResponse>;
  completeRegistration: (data: {
    email: string;
    otp: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    schoolName: string;
    schoolType?: string;
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null); // ✅ Added token state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      console.log('🔐 [AUTH-CONTEXT] Bootstrap starting...');
      try {
        let savedToken = null;
        let savedUser = null;

        // Only try SecureStore on mobile platforms
        if (Platform.OS !== 'web') {
          try {
            console.log('📱 [AUTH-CONTEXT] Attempting SecureStore restore...');
            savedToken = await SecureStore.getItemAsync('userToken');
            savedUser = await SecureStore.getItemAsync('userData');
            if (savedToken) {
              console.log('✅ [AUTH-CONTEXT] Token restored from SecureStore');
            } else {
              console.log('❌ [AUTH-CONTEXT] No token found in SecureStore');
            }
          } catch (secureStoreErr) {
            console.log('⚠️  [AUTH-CONTEXT] SecureStore restore failed:', (secureStoreErr as any)?.message);
          }
        } else {
          // Fallback to localStorage on web
          try {
            console.log('🌐 [AUTH-CONTEXT] Attempting localStorage restore (web)...');
            savedToken = localStorage.getItem('userToken');
            savedUser = localStorage.getItem('userData');
            if (savedToken) {
              console.log('✅ [AUTH-CONTEXT] Token restored from localStorage');
            } else {
              console.log('❌ [AUTH-CONTEXT] No token found in localStorage');
            }
          } catch (storageErr) {
            console.log('⚠️  [AUTH-CONTEXT] localStorage restore failed:', (storageErr as any)?.message);
          }
        }

        if (savedToken) {
          console.log(`🎯 [AUTH-CONTEXT] Setting token (${savedToken.substring(0, 20)}...)`);
          setToken(savedToken);
          apiService.setToken(savedToken);
        }
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            console.log(`👤 [AUTH-CONTEXT] Setting user: ${parsedUser.firstName}`);
            setUser(parsedUser);
          } catch (e) {
            console.error('❌ [AUTH-CONTEXT] Failed to parse saved user:', e);
          }
        }
        console.log('✅ [AUTH-CONTEXT] Bootstrap complete, isLoading = false');
      } catch (e) {
        console.error('❌ [AUTH-CONTEXT] Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrapAsync();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log(`🔐 [AUTH-CONTEXT] Login attempt for: ${email}`);
      setIsLoading(true);
      const response = await authApi.login(email, password);

      if (response.success && response.data?.token) {
        const userToken = response.data.token;
        const userData = response.data.user;

        console.log(`✅ [AUTH-CONTEXT] Login successful, received token (${userToken.substring(0, 20)}...)`);

        // Update state
        setToken(userToken);
        setUser(userData as any);

        // Store token securely based on platform
        if (Platform.OS !== 'web') {
          try {
            console.log('💾 [AUTH-CONTEXT] Saving to SecureStore...');
            await SecureStore.setItemAsync('userToken', userToken);
            await SecureStore.setItemAsync('userData', JSON.stringify(userData));
            console.log('✅ [AUTH-CONTEXT] Saved to SecureStore');
          } catch (secureStoreErr) {
            console.log('⚠️  SecureStore save failed, trying localStorage:', (secureStoreErr as any)?.message);
            try {
              localStorage.setItem('userToken', userToken);
              localStorage.setItem('userData', JSON.stringify(userData));
              console.log('✅ [AUTH-CONTEXT] Fallback to localStorage successful');
            } catch (e) {
              console.error('❌ Both storage methods failed:', e);
            }
          }
        } else {
          try {
            console.log('💾 [AUTH-CONTEXT] Saving to localStorage (web)...');
            localStorage.setItem('userToken', userToken);
            localStorage.setItem('userData', JSON.stringify(userData));
            console.log('✅ [AUTH-CONTEXT] Saved to localStorage');
          } catch (e) {
            console.error('❌ localStorage save failed:', e);
          }
        }

        apiService.setToken(userToken);
        return true;
      }
      console.log('❌ [AUTH-CONTEXT] Login failed:', response.error);
      return false;
    } catch (error) {
      console.error('❌ [AUTH-CONTEXT] Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendOTP = useCallback(async (email: string) => {
    try {
      console.log(`📧 [AUTH-CONTEXT] Sending OTP to: ${email}`);
      setIsLoading(true);
      const response = await schoolApi.sendOTP(email);

      console.log(`✅ [AUTH-CONTEXT] OTP sent successfully`);
      return {
        success: response.success,
        message: response.data?.message || 'OTP sent to your email'
      };
    } catch (error: any) {
      console.error('❌ [AUTH-CONTEXT] OTP error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send OTP';
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeRegistration = useCallback(async (data: {
    email: string;
    otp: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    schoolName: string;
    schoolType?: string;
  }) => {
    try {
      console.log(`🔐 [AUTH-CONTEXT] Completing registration for: ${data.schoolName}`);
      setIsLoading(true);
      const response = await schoolApi.completeRegistration(data);

      console.log(`📋 [AUTH-CONTEXT] Response:`, { success: response.success, message: response.message, hasToken: !!response.token });

      if (response.success && response.token) {
        const userToken = response.token;
        const userData = {
          schoolId: response.data?.school?.id,
          email: response.data?.school?.email,
          name: response.data?.school?.name,
          type: 'school'
        };

        console.log(`✅ [AUTH-CONTEXT] Registration successful, received token (${userToken.substring(0, 20)}...)`);

        // Update state
        setToken(userToken);
        setUser(userData as any);

        // Store token securely based on platform
        if (Platform.OS !== 'web') {
          try {
            console.log('💾 [AUTH-CONTEXT] Saving to SecureStore...');
            await SecureStore.setItemAsync('userToken', userToken);
            await SecureStore.setItemAsync('userData', JSON.stringify(userData));
            console.log('✅ [AUTH-CONTEXT] Saved to SecureStore');
          } catch (secureStoreErr) {
            console.log('⚠️  SecureStore save failed, trying localStorage:', (secureStoreErr as any)?.message);
            try {
              localStorage.setItem('userToken', userToken);
              localStorage.setItem('userData', JSON.stringify(userData));
              console.log('✅ [AUTH-CONTEXT] Fallback to localStorage successful');
            } catch (e) {
              console.error('❌ Both storage methods failed:', e);
            }
          }
        } else {
          try {
            console.log('💾 [AUTH-CONTEXT] Saving to localStorage (web)...');
            localStorage.setItem('userToken', userToken);
            localStorage.setItem('userData', JSON.stringify(userData));
            console.log('✅ [AUTH-CONTEXT] Saved to localStorage');
          } catch (e) {
            console.error('❌ localStorage save failed:', e);
          }
        }

        apiService.setToken(userToken);

        return { success: true, message: response.message || 'Registration successful!' };
      }

      console.log('❌ [AUTH-CONTEXT] Registration failed:', response.message);
      return { success: false, message: response.message || 'Registration failed' };
    } catch (error: any) {
      console.error('❌ [AUTH-CONTEXT] Registration error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'A network error occurred';
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    apiService.setToken(null);
    await clearAllStorage();
    console.log('✅ [AUTH-CONTEXT] Logged out and storage cleared');
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isSignedIn: !!user,
    login,
    sendOTP,
    completeRegistration,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};