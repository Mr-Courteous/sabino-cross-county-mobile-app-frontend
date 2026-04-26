import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, ImageBackground, Dimensions } from 'react-native';
import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppColors } from '@/hooks/use-app-colors';
import { Colors } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const { width } = Dimensions.get('window');

export default function HomePage() {
  const router = useRouter();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);


  function FeatureCard({ icon, title, desc }: any) {
    return (
      <View style={styles.fCard}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={24} color={C.isDark ? "#fff" : "#2563EB"} />
        </View>
        <ThemedText style={styles.fTitle}>{title}</ThemedText>
        <ThemedText style={styles.fDesc}>{desc}</ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={styles.mainWrapper}>
      <StatusBar style={C.isDark ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071' }}
          style={styles.hero}
        >
          <LinearGradient
            colors={C.isDark ? ['rgba(10, 15, 30, 0.8)', 'rgba(15, 23, 42, 0.98)'] : ['rgba(255, 255, 255, 0.4)', 'rgba(248, 250, 252, 0.98)']}
            style={styles.overlay}
          >
            <View style={styles.logoBadge}>
              <Ionicons name="ribbon" size={22} color={Colors.accent.gold} />
              <ThemedText style={styles.logoText}>SABINO SCHOOL</ThemedText>
            </View>

            {/* ULTRA BOLD HEADER */}
            <ThemedText style={styles.title}>EXCELLENCE{'\n'}IN EVERY{'\n'}RESULT</ThemedText>
            <View style={styles.goldBar} />

            <ThemedText style={styles.tagline}>
              Empowering schools with precision tracking and professional digital identity.
            </ThemedText>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.ctaButton}
                onPress={() => router.push('/(auth)/verify-email')}
              >
                <ThemedText style={styles.ctaButtonText}>CREATE NEW ACCOUNT</ThemedText>
                <Ionicons name="arrow-forward-circle" size={24} color="#fff" style={{ marginLeft: 10 }} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.studentLoginButton}
                onPress={() => router.push('/(student)' as any)}
              >
                <Ionicons name="person-outline" size={20} color={C.isDark ? "#fff" : "#2563EB"} style={{ marginRight: 8 }} />
                <ThemedText style={styles.studentLoginText}>STUDENTS' LOGIN</ThemedText>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.content}>
          <ThemedText style={styles.sectionLabel}>CORE FEATURES</ThemedText>
          <ThemedText style={styles.sectionTitle}>Precision Tools for Educators</ThemedText>

          <View style={styles.featureGrid}>
            <FeatureCard icon="stats-chart" title="Smart Analytics" desc="Instant ranking & class positions." />
            <FeatureCard icon="color-wand" title="Custom Branding" desc="Personalized logos & digital stamps." />
            <FeatureCard icon="notifications" title="Quick Alerts" desc="Keep parents informed instantly." />
            <FeatureCard icon="lock-closed" title="Secure Access" desc="1-hour encrypted sessions." />
          </View>

          <TouchableOpacity style={styles.loginOutline} onPress={() => router.push('/(auth)')}>
            <ThemedText style={styles.loginOutlineText}>ALREADY REGISTERED? SIGN IN</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerBrand}>SABINO SCHOOL</ThemedText>
          <ThemedText style={styles.footerCopyright}>THE GOLD STANDARD FOR ACADEMIC REPORTING</ThemedText>
          <View style={styles.footerDivider} />
          <ThemedText style={styles.footerYear}>© 2026 SABINO SYSTEMS GLOBAL</ThemedText>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
  return StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: C.background },
    scrollContainer: { flexGrow: 1 },

    hero: { width: '100%', minHeight: 700, paddingBottom: 45 },
    overlay: { flex: 1, paddingHorizontal: 20, paddingVertical: 60, justifyContent: 'center', alignItems: 'center' },

    logoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 25,
      borderWidth: 1,
      borderColor: C.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
    },
    logoText: { color: Colors.accent.gold, fontSize: 13, fontWeight: '900', marginLeft: 10, letterSpacing: 3 },

    title: {
      fontSize: 40,
      fontWeight: '700',
      color: C.isDark ? '#fff' : Colors.accent.navy,
      textAlign: 'center',
      lineHeight: 48,
      letterSpacing: -1
    },
    goldBar: { width: 80, height: 6, backgroundColor: Colors.accent.gold, borderRadius: 3, marginVertical: 20 },

    tagline: { fontSize: 16, color: C.textSecondary, textAlign: 'center', paddingHorizontal: 10, lineHeight: 26, fontWeight: '500' },

    ctaButton: {
      flexDirection: 'row',
      backgroundColor: '#2563EB',
      paddingVertical: 18,
      paddingHorizontal: 25,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#2563EB',
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 8
    },
    ctaButtonText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },

    buttonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginTop: 40,
      flexWrap: 'wrap',
      width: '100%',
    },

    studentLoginButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.isDark ? 'rgba(255,255,255,0.1)' : '#fff',
      paddingVertical: 18,
      paddingHorizontal: 25,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: C.isDark ? 'rgba(255,255,255,0.2)' : '#2563EB',
      shadowColor: '#2563EB',
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4
    },
    studentLoginText: { color: C.isDark ? '#fff' : '#2563EB', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },

    content: {
      padding: 24,
      backgroundColor: C.background,
      borderTopLeftRadius: 45,
      borderTopRightRadius: 45,
      marginTop: -45,
      paddingBottom: 50
    },
    sectionLabel: { color: '#2563EB', fontSize: 12, fontWeight: '900', letterSpacing: 2.5, textAlign: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 26, fontWeight: '900', color: C.text, textAlign: 'center', marginBottom: 35, letterSpacing: -0.5 },

    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    fCard: {
      width: (width - 64) / 2,
      backgroundColor: C.card,
      padding: 24,
      borderRadius: 30,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: C.cardBorder
    },
    iconCircle: { width: 50, height: 50, borderRadius: 18, backgroundColor: C.isDark ? '#1e293b' : '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 2 },
    fTitle: { fontSize: 16, fontWeight: '900', color: C.text, letterSpacing: -0.3 },
    fDesc: { fontSize: 13, color: C.textSecondary, marginTop: 8, lineHeight: 20, fontWeight: '500' },

    loginOutline: {
      backgroundColor: '#2563EB',
      marginTop: 25,
      padding: 20,
      borderRadius: 15,
      alignItems: 'center',
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    loginOutlineText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 },

    footer: { backgroundColor: C.isDark ? '#0F172A' : '#F1F5F9', padding: 60, alignItems: 'center' },
    footerBrand: { color: C.text, fontSize: 24, fontWeight: '900', letterSpacing: 6 },
    footerCopyright: { color: C.textMuted, fontSize: 10, fontWeight: '800', marginTop: 15, letterSpacing: 1 },
    footerDivider: { width: 50, height: 2, backgroundColor: Colors.accent.gold, marginVertical: 25 },
    footerYear: { color: C.textLabel, fontSize: 10, fontWeight: 'bold' }
  });
}