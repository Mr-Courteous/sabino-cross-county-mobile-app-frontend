import { TouchableOpacity, View, Platform } from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/utils/api-service';
import { Colors } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';

/**
 * "Free trial - N days left - Subscribe now" banner.
 * Only shows while the school is on its free trial and has NOT paid yet. A school can
 * subscribe at any point during the trial; the paid plan starts at that moment.
 */
export function TrialBanner() {
  const router = useRouter();
  const [info, setInfo] = useState<{ isTrial: boolean; daysLeft: number; hoursLeft: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const token = Platform.OS !== 'web' ? await SecureStore.getItemAsync('userToken') : localStorage.getItem('userToken');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/schools/subscription-info`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => null);
      setInfo(res.ok && json?.success ? json.data : null);
    } catch {
      setInfo(null); // a banner must never get in the way
    }
  }, []);

  // reload whenever the dashboard comes back into view (e.g. after paying)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!info?.isTrial) return null;

  const lastDay = info.hoursLeft < 24;
  const left = lastDay
    ? `${Math.max(info.hoursLeft, 1)} hour${info.hoursLeft === 1 ? '' : 's'} left`
    : `${info.daysLeft} day${info.daysLeft === 1 ? '' : 's'} left`;
  const color = lastDay ? '#EF4444' : Colors.accent.gold;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push('/subscription' as any)}
      accessibilityRole="button"
      accessibilityLabel="View subscription details"
      style={{
        marginTop: 15, marginHorizontal: 0, padding: 14, borderRadius: 18,
        borderWidth: 1.5, borderColor: color, backgroundColor: `${color}18`,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}
    >
      <Ionicons name="time-outline" size={26} color={color} />
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontWeight: '900', fontSize: 14, color }}>Free trial • {left}</ThemedText>
        <ThemedText style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>
          Review your subscription details and renew whenever you are ready.
        </ThemedText>
      </View>
      <View style={{ backgroundColor: color, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
        <ThemedText style={{ color: '#0F172A', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 }}>VIEW DETAILS</ThemedText>
      </View>
    </TouchableOpacity>
  );
}
