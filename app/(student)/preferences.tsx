import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/design-system';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-app-colors';

export default function StudentPreferences() {
  const router = useRouter();
  const { themeMode, setThemeMode } = useTheme();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);

  return (
    <ThemedView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=2074&auto=format&fit=crop' }}
        style={styles.hero}
      >
        <LinearGradient
          colors={[C.isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)', C.background]}
          style={styles.heroOverlay}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={C.text} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>PREFERENCES</ThemedText>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroSubtitle}>PERSONALIZATION</Text>
            <Text style={styles.heroTitle}>App Appearance</Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THEME MODE</Text>
          <View style={styles.themeGrid}>
            <ThemeModeButton
              icon="moon"
              label="Dark"
              subtitle="OLED Optimized"
              isActive={themeMode === 'dark'}
              onPress={() => setThemeMode('dark')}
              C={C}
              styles={styles}
            />
            <ThemeModeButton
              icon="sunny"
              label="Light"
              subtitle="High Contrast"
              isActive={themeMode === 'light'}
              onPress={() => setThemeMode('light')}
              C={C}
              styles={styles}
            />
            <ThemeModeButton
              icon="settings"
              label="System"
              subtitle="Auto-adapt"
              isActive={themeMode === 'system'}
              onPress={() => setThemeMode('system')}
              C={C}
              styles={styles}
            />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.accent.gold} />
          <Text style={styles.infoText}>
            These settings are saved locally to your device and will be applied every time you open the portal.
          </Text>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function ThemeModeButton({ icon, label, subtitle, isActive, onPress, C, styles }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.themeButton,
        isActive && { borderColor: Colors.accent.gold, backgroundColor: Colors.accent.gold + '10' }
      ]}
    >
      <View style={[styles.themeIconWrap, isActive && { backgroundColor: Colors.accent.gold }]}>
        <Ionicons name={icon as any} size={20} color={isActive ? Colors.accent.navy : C.textSecondary} />
      </View>
      <View style={styles.themeInfo}>
        <Text style={[styles.themeLabel, isActive && { color: C.text }]}>{label}</Text>
        <Text style={styles.themeSubtitle}>{subtitle}</Text>
      </View>
      {isActive && <Ionicons name="checkmark-circle" size={20} color={Colors.accent.gold} />}
    </TouchableOpacity>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    hero: { width: '100%', height: 260 },
    heroOverlay: { flex: 1, paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 },
    backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 2, color: C.text },
    
    heroContent: { marginTop: 'auto', marginBottom: 30 },
    heroSubtitle: { color: Colors.accent.gold, fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
    heroTitle: { color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 },

    content: { flex: 1, marginTop: -30, borderTopLeftRadius: 35, borderTopRightRadius: 35, backgroundColor: C.background, paddingHorizontal: 24, paddingTop: 30 },
    section: { marginBottom: 32 },
    sectionLabel: { color: C.textLabel, fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 20 },
    
    themeGrid: { gap: 12 },
    themeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: C.cardBorder,
    },
    themeIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: C.actionIconWrap,
      justifyContent: 'center',
      alignItems: 'center',
    },
    themeInfo: { flex: 1, marginLeft: 16 },
    themeLabel: { color: C.textSecondary, fontSize: 16, fontWeight: '800' },
    themeSubtitle: { color: C.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },

    infoCard: {
      flexDirection: 'row',
      backgroundColor: C.isDark ? 'rgba(250, 204, 21, 0.05)' : '#FEFCE8',
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.isDark ? 'rgba(250, 204, 21, 0.1)' : '#FEF9C3',
      alignItems: 'center',
      gap: 12,
    },
    infoText: { flex: 1, color: C.isDark ? '#94A3B8' : '#71717A', fontSize: 12, lineHeight: 18, fontWeight: '500' },
  });
}
