import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const getStorageItem = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

export const setStorageItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

export const clearAllStorage = async () => {
  const keys = [
    'userToken',
    'userData',
    'countryId',
    'studentToken',
    'studentData',
    'activeSessionId',
    'activeSession',
    'studentSession'
  ];

  if (Platform.OS === 'web') {
    keys.forEach(key => localStorage.removeItem(key));
  } else {
    for (const key of keys) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (e) {
        console.warn(`Failed to delete storage key: ${key}`);
      }
    }
  }
};