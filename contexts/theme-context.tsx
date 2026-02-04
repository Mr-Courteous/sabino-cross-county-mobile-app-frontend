import React, { createContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';

interface ThemeContextType {
  themeColor: string;
  setThemeColor: (color: string) => void;
  loadThemeFromPreferences: () => Promise<void>;
  isLoadingTheme: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeColor, setThemeColor] = useState('#2196F3');
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

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
        // Validate hex color format
        const color = data.data.theme_color.trim();
        if (/^#[0-9A-F]{6}$/i.test(color)) {
          setThemeColor(color);
        } else {
          setThemeColor('#2196F3');
        }
      }
    } catch (err) {
      console.error('Theme Load Error:', err);
      setThemeColor('#2196F3');
    } finally {
      setIsLoadingTheme(false);
    }
  }, []);

  // Load theme on mount
  useEffect(() => {
    loadThemeFromPreferences();
  }, [loadThemeFromPreferences]);

  const value: ThemeContextType = {
    themeColor,
    setThemeColor,
    loadThemeFromPreferences,
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
