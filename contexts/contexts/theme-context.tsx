import React, { createContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { Platform, useColorScheme, Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';

type ThemeMode = 'light' | 'dark' | 'system';
type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  // Theme color (school branding)
  themeColor: string;
  setThemeColor: (color: string) => void;
  loadThemeFromPreferences: () => Promise<void>;
  
  // Theme mode (light/dark)
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  effectiveColorScheme: ColorScheme;
  
  // Loading states
  isLoadingTheme: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  
  const [themeColor, setThemeColor] = useState('#2196F3');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

  // Determine effective color scheme based on mode and system preference
  const effectiveColorScheme: ColorScheme = 
    themeMode === 'system' 
      ? (systemColorScheme || 'dark')
      : themeMode;

  // Set theme mode and persist
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    
    // Persist to storage
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('themeMode', mode);
      } else {
        await SecureStore.setItemAsync('themeMode', mode);
      }
    } catch (err) {
    }
  }, []);

  // Load theme mode from storage on mount
  const loadThemeMode = useCallback(async () => {
    try {
      let savedMode: ThemeMode = 'system';
      
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem('themeMode');
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          savedMode = stored;
        }
      } else {
        const stored = await SecureStore.getItemAsync('themeMode');
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          savedMode = stored;
        }
      }
      
      setThemeModeState(savedMode);
    } catch (err) {
    }
  }, []);

  const loadThemeFromPreferences = useCallback(async () => {
    try {
      setIsLoadingTheme(true);
      
      const token = Platform.OS !== 'web'
        ? await SecureStore.getItemAsync('userToken')
        : localStorage.getItem('userToken');

      const userData = Platform.OS !== 'web'
        ? await SecureStore.getItemAsync('userData')
        : localStorage.getItem('userData');

      if (!token || !userData) {
        setThemeColor('#2196F3');
        return;
      }

      const schoolId = JSON.parse(userData).schoolId;

      const response = await fetch(`${API_BASE_URL}/api/preferences/${schoolId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.data?.theme_color) {
        const color = data.data.theme_color.trim();
        if (/^#[0-9A-F]{6}$/i.test(color)) {
          setThemeColor(color);
        } else {
          setThemeColor('#2196F3');
        }
      }
    } catch (err) {
      setThemeColor('#2196F3');
    } finally {
      setIsLoadingTheme(false);
    }
  }, []);

  // Load both theme color and mode on mount
  useEffect(() => {
    const initTheme = async () => {
      await loadThemeMode();
      await loadThemeFromPreferences();
    };
    initTheme();
  }, [loadThemeMode, loadThemeFromPreferences]);

  // Listen for system theme changes
  useEffect(() => {
    const listener = Appearance.addChangeListener(() => {
      // Force re-render when system theme changes
      setThemeColor(prev => prev);
    });
    
    return () => listener.remove();
  }, []);

  const value: ThemeContextType = {
    themeColor,
    setThemeColor,
    loadThemeFromPreferences,
    themeMode,
    setThemeMode,
    effectiveColorScheme,
    isLoadingTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use theme context
 */
export const useTheme = (): ThemeContextType => {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Hook to get current color scheme (light/dark)
 * This is a convenience hook for components that need to know the effective scheme
 */
export const useEffectiveColorScheme = (): ColorScheme => {
  const { effectiveColorScheme } = useTheme();
  return effectiveColorScheme;
};
