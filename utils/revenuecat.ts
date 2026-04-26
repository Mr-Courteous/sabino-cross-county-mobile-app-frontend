import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const API_KEYS = {
  apple: 'goog_vvcxnjbgcwackuao', // Placeholders - user should replace with real ones
  google: 'goog_vvcxnjbgcwackuao', // Placeholder
};

export const configurePurchases = async (userId?: string) => {
  if (Platform.OS === 'web') return;

  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

  if (Platform.OS === 'ios') {
    // Purchases.configure({ apiKey: API_KEYS.apple, appUserID: userId });
  } else if (Platform.OS === 'android') {
    Purchases.configure({ apiKey: API_KEYS.google, appUserID: userId });
  }
};

export const identifyUser = async (userId: string) => {
  if (Platform.OS === 'web') return;
  await Purchases.logIn(userId);
};

export const resetUser = async () => {
  if (Platform.OS === 'web') return;
  await Purchases.logOut();
};
