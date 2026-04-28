import React, { createContext, ReactNode, useCallback, useEffect, useState, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform, AppState } from 'react-native';
import { authApi, User, schoolApi } from '@/utils/api-calls-new';
import { apiService } from '@/utils/api-service';
import { clearAllStorage } from '@/utils/storage';
import { configurePurchases, identifyUser, resetUser } from '@/utils/revenuecat';
import Purchases, { CustomerInfo } from 'react-native-purchases';

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
  recordActivity: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    apiService.setToken(null);
    
    // 🔴 REVENUECAT: Reset on logout
    if (Platform.OS !== 'web') {
      await resetUser();
    }
    
    await clearAllStorage();
  }, []);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const checkInactivity = useCallback(async () => {
    // Only check if user is signed in
    const storedToken = Platform.OS !== 'web' 
      ? await SecureStore.getItemAsync('userToken')
      : localStorage.getItem('userToken');
      
    if (!storedToken) return;

    const now = Date.now();
    const diff = now - lastActivityRef.current;
    if (diff >= 3600000) { // 1 hour in ms
      console.log('🚪 [Auth] Inactivity timeout reached. Logging out...');
      await logout();
    }
  }, [logout]);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        let savedToken = null;
        let savedUser = null;

        if (Platform.OS !== 'web') {
          try {
            savedToken = await SecureStore.getItemAsync('userToken');
            savedUser = await SecureStore.getItemAsync('userData');
          } catch (secureStoreErr) {
          }
        } else {
          try {
            savedToken = localStorage.getItem('userToken');
            savedUser = localStorage.getItem('userData');
          } catch (storageErr) {
          }
        }

        if (savedToken) {
          setToken(savedToken);
          apiService.setToken(savedToken);
        }
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);

            if (parsedUser.schoolId && Platform.OS !== 'web') {
              await configurePurchases(parsedUser.schoolId.toString());
            }
          } catch (e) {
          }
        }
      } catch (e) {
      } finally {
        setIsLoading(false);
      }
    };
    bootstrapAsync();
  }, []);

  useEffect(() => {
    // Check periodically for inactivity
    const interval = setInterval(checkInactivity, 60000); // Check every minute

    // Check when app state changes (e.g. comes back from background)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkInactivity();
      } else if (nextAppState === 'background') {
        // Record timestamp when going to background to ensure we can check it on resume
        recordActivity();
      }
    });

    // 🌐 WEB: Add global activity listeners
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    if (Platform.OS === 'web') {
      activityEvents.forEach(ev => {
        window.addEventListener(ev, recordActivity);
      });
    }

    return () => {
      clearInterval(interval);
      subscription.remove();
      if (Platform.OS === 'web') {
        activityEvents.forEach(ev => {
          window.removeEventListener(ev, recordActivity);
        });
      }
    };
  }, [checkInactivity, recordActivity]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(email, password);

      if (response.success && response.data?.token) {
        const userToken = response.data.token;
        const userData = response.data.user;

        setToken(userToken);
        setUser(userData as any);

        if (Platform.OS !== 'web') {
          try {
            await SecureStore.setItemAsync('userToken', userToken);
            await SecureStore.setItemAsync('userData', JSON.stringify(userData));
          } catch (secureStoreErr) {
            try {
              localStorage.setItem('userToken', userToken);
              localStorage.setItem('userData', JSON.stringify(userData));
            } catch (e) {
            }
          }
        } else {
          try {
            localStorage.setItem('userToken', userToken);
            localStorage.setItem('userData', JSON.stringify(userData));
          } catch (e) {
          }
        }

        apiService.setToken(userToken);
        recordActivity();

        if (userData.schoolId && Platform.OS !== 'web') {
          await configurePurchases(userData.schoolId.toString());
          await identifyUser(userData.schoolId.toString());
        }

        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [recordActivity]);

  const sendOTP = useCallback(async (email: string) => {
    try {
      setIsLoading(true);
      const response = await schoolApi.sendOTP(email);

      return {
        success: response.success,
        message: response.data?.message || 'OTP sent to your email'
      };
    } catch (error: any) {
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
      setIsLoading(true);
      const response = await schoolApi.completeRegistration(data);

      if (response.success && response.token) {
        const userToken = response.token;
        const userData = {
          schoolId: response.data?.school?.id,
          email: response.data?.school?.email,
          name: response.data?.school?.name,
          type: 'school'
        };

        setToken(userToken);
        setUser(userData as any);

        if (Platform.OS !== 'web') {
          try {
            await SecureStore.setItemAsync('userToken', userToken);
            await SecureStore.setItemAsync('userData', JSON.stringify(userData));
          } catch (secureStoreErr) {
            try {
              localStorage.setItem('userToken', userToken);
              localStorage.setItem('userData', JSON.stringify(userData));
            } catch (e) {
            }
          }
        } else {
          try {
            localStorage.setItem('userToken', userToken);
            localStorage.setItem('userData', JSON.stringify(userData));
          } catch (e) {
          }
        }

        apiService.setToken(userToken);
        recordActivity();

        return { success: true, message: response.message || 'Registration successful!' };
      }

      return { success: false, message: response.message || 'Registration failed' };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'A network error occurred';
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [recordActivity]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isSignedIn: !!user,
    login,
    sendOTP,
    completeRegistration,
    logout,
    recordActivity,
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