import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, ImageBackground, useWindowDimensions, Image, Platform } from 'react-native';
import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppColors } from '@/hooks/use-app-colors';
import { Colors } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomePage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C, width), [C.scheme, width]);

  const isExtraTiny = width < 280;
  const isTiny = width < 340;
  const isDesktop = width >= 1024;
  const ctaIconSize = isExtraTiny ? 16 : isTiny ? 18 : isDesktop ? 22 : 20;
  const studentIconSize = isExtraTiny ? 15 : isTiny ? 17 : isDesktop ? 20 : 18;
  const fIconSize = isExtraTiny ? 18 : isTiny ? 20 : isDesktop ? 24 : 22;

  function FeatureCard({ icon, title, desc }: any) {
    return (
      <View style={styles.fCard}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={fIconSize} color={C.isDark ? "#fff" : "#2563EB"} />
        </View>
        <ThemedText style={styles.fTitle} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </ThemedText>
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
              <Image source={require('../assets/images/sabino.jpeg')} style={{ width: width < 300 ? 32 : 40, height: width < 300 ? 32 : 40, borderRadius: 20 }} />
              <ThemedText style={styles.logoText}>SABINO EDU</ThemedText>
            </View>

            {/* ULTRA BOLD HEADER */}
            <ThemedText style={styles.title}>EXCELLENCE{'\n'}IN EVERY{'\n'}RESULT</ThemedText>
            <View style={styles.goldBar} />

            <ThemedText style={styles.tagline}>
              Empowering schools with precision tracking and professional digital identity.
            </ThemedText>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.ctaButton}
                onPress={() => router.push('/(auth)/verify-email')}
                accessibilityRole="button"
                accessibilityLabel="Create Account"
              >
                <ThemedText style={styles.ctaButtonText} numberOfLines={1} adjustsFontSizeToFit>
                  CREATE ACCOUNT
                </ThemedText>
                <Ionicons name="arrow-forward-circle" size={ctaIconSize} color="#fff" style={styles.ctaIcon} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.studentLoginButton}
                onPress={() => router.push('/(student)' as any)}
                accessibilityRole="button"
                accessibilityLabel="Students Login"
              >
                <Ionicons
                  name="person-outline"
                  size={studentIconSize}
                  color={C.isDark ? "#fff" : "#2563EB"}
                  style={styles.studentIcon}
                />
                <ThemedText style={styles.studentLoginText} numberOfLines={1} adjustsFontSizeToFit>
                  STUDENTS' LOGIN
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.studentLoginButton}
                onPress={() => router.push('/(parent)' as any)}
                accessibilityRole="button"
                accessibilityLabel="Parents Login"
              >
                <Ionicons
                  name="people-outline"
                  size={studentIconSize}
                  color={C.isDark ? "#fff" : "#2563EB"}
                  style={styles.studentIcon}
                />
                <ThemedText style={styles.studentLoginText} numberOfLines={1} adjustsFontSizeToFit>
                  PARENTS' LOGIN
                </ThemedText>
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
          <ThemedText style={styles.footerBrand}>SABINO EDU</ThemedText>
          <ThemedText style={styles.footerCopyright}>THE GOLD STANDARD FOR ACADEMIC REPORTING</ThemedText>
          <View style={styles.footerDivider} />
          <ThemedText style={styles.footerYear}>© {new Date().getFullYear()} SABINO EDU. ALL RIGHTS RESERVED.</ThemedText>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>, width: number) {
  const isExtraTiny = width < 280; // 250px to 279px
  const isTiny = width < 340;      // 280px to 339px
  const isSmall = width < 420;     // 340px to 419px
  const isWide = width >= 600;     // Tablet and desktop row layout
  const isDesktop = width >= 1024; // Large desktop screens

  // Responsive Grid Calculations for Feature Cards
  const contentMaxWidth = 1080;
  const containerWidth = Math.min(width, contentMaxWidth);
  const contentPaddingH = isDesktop ? 32 : isExtraTiny ? 10 : isTiny ? 14 : 20;
  const gridAvailableWidth = containerWidth - (contentPaddingH * 2);

  let numColumns = 1;
  if (width >= 920) {
    numColumns = 4;
  } else if (width >= 350) {
    numColumns = 2;
  } else {
    numColumns = 1;
  }

  const gridGap = isDesktop ? 18 : numColumns === 4 ? 14 : isTiny ? 10 : 14;
  const cardWidth = numColumns === 1
    ? '100%'
    : Math.floor((gridAvailableWidth - (gridGap * (numColumns - 1))) / numColumns);

  return StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: C.background },
    scrollContainer: { flexGrow: 1 },

    hero: {
      width: '100%',
      minHeight: isExtraTiny ? 520 : isSmall ? 600 : isDesktop ? 740 : 700,
      paddingBottom: isExtraTiny ? 20 : isTiny ? 25 : 45
    },
    overlay: {
      flex: 1,
      paddingHorizontal: isExtraTiny ? 10 : isTiny ? 14 : 20,
      paddingVertical: isExtraTiny ? 30 : isTiny ? 40 : isDesktop ? 70 : 60,
      justifyContent: 'center',
      alignItems: 'center'
    },

    logoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      paddingHorizontal: isExtraTiny ? 8 : isTiny ? 10 : 16,
      paddingVertical: isExtraTiny ? 5 : isTiny ? 6 : 10,
      borderRadius: 12,
      marginBottom: isExtraTiny ? 12 : isTiny ? 15 : 25,
      borderWidth: 1,
      borderColor: C.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
    },
    logoText: { color: Colors.accent.gold, fontSize: isTiny ? 10 : 11, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },

    title: {
      fontSize: isExtraTiny ? 24 : isTiny ? 28 : isSmall ? 32 : isDesktop ? 44 : 38,
      fontWeight: '700',
      color: C.isDark ? '#fff' : Colors.accent.navy,
      textAlign: 'center',
      lineHeight: isExtraTiny ? 30 : isTiny ? 35 : isSmall ? 40 : isDesktop ? 52 : 46,
      letterSpacing: -1
    },
    goldBar: {
      width: isExtraTiny ? 45 : 60,
      height: isExtraTiny ? 4 : 5,
      backgroundColor: Colors.accent.gold,
      borderRadius: 3,
      marginVertical: isExtraTiny ? 10 : isTiny ? 15 : 20
    },

    tagline: {
      fontSize: isExtraTiny ? 11 : isTiny ? 12 : isDesktop ? 16 : 14,
      color: C.textSecondary,
      textAlign: 'center',
      paddingHorizontal: isExtraTiny ? 4 : 10,
      lineHeight: isExtraTiny ? 17 : isTiny ? 20 : isDesktop ? 26 : 24,
      fontWeight: '500',
      maxWidth: isDesktop ? 620 : 480
    },

    // Three buttons now share the row on wide screens, so the row is a bit wider
    buttonContainer: {
      flexDirection: isWide ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isWide ? (isDesktop ? 18 : 14) : (isExtraTiny ? 8 : 12),
      marginTop: isExtraTiny ? 20 : isTiny ? 26 : isDesktop ? 42 : 34,
      width: '100%',
      maxWidth: isWide ? (isDesktop ? 920 : 720) : (isExtraTiny ? '100%' : 380),
      alignSelf: 'center',
    },

    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2563EB',
      borderRadius: isExtraTiny ? 12 : isTiny ? 14 : 16,
      paddingVertical: isExtraTiny ? 10 : isTiny ? 12 : isDesktop ? 16 : 14,
      paddingHorizontal: isExtraTiny ? 8 : isTiny ? 14 : isDesktop ? 24 : 20,
      minHeight: isExtraTiny ? 42 : isTiny ? 46 : isDesktop ? 56 : 50,
      width: isWide ? undefined : '100%',
      flex: isWide ? 1 : undefined,
      maxWidth: isWide ? 300 : '100%',
      shadowColor: '#2563EB',
      shadowOpacity: 0.45,
      shadowRadius: isDesktop ? 22 : 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 7,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
    },
    ctaButtonText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: isExtraTiny ? 10.5 : isTiny ? 11.5 : isDesktop ? 14 : 13,
      letterSpacing: isExtraTiny ? 0.2 : isDesktop ? 0.8 : 0.5,
      textAlign: 'center',
    },
    ctaIcon: {
      marginLeft: isExtraTiny ? 5 : 8,
    },

    studentLoginButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.isDark ? 'rgba(255,255,255,0.08)' : '#fff',
      borderRadius: isExtraTiny ? 12 : isTiny ? 14 : 16,
      borderWidth: 1.5,
      borderColor: C.isDark ? 'rgba(255,255,255,0.18)' : '#CBD5E1',
      paddingVertical: isExtraTiny ? 10 : isTiny ? 12 : isDesktop ? 16 : 14,
      paddingHorizontal: isExtraTiny ? 8 : isTiny ? 14 : isDesktop ? 24 : 20,
      minHeight: isExtraTiny ? 42 : isTiny ? 46 : isDesktop ? 56 : 50,
      width: isWide ? undefined : '100%',
      flex: isWide ? 1 : undefined,
      maxWidth: isWide ? 300 : '100%',
      shadowColor: '#000',
      shadowOpacity: C.isDark ? 0.2 : 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
    },
    studentLoginText: {
      color: C.isDark ? '#fff' : '#2563EB',
      fontWeight: '900',
      fontSize: isExtraTiny ? 10.5 : isTiny ? 11.5 : isDesktop ? 13.5 : 12.5,
      letterSpacing: isExtraTiny ? 0.2 : isDesktop ? 0.8 : 0.5,
      textAlign: 'center',
    },
    studentIcon: {
      marginRight: isExtraTiny ? 5 : 8,
    },

    // Backward compatibility styles
    buttonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    secondaryButtonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    pricingButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(250, 204, 21, 0.1)',
      paddingVertical: isTiny ? 14 : 16,
      paddingHorizontal: isTiny ? 15 : 25,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: '#FACC15',
    },
    pricingButtonText: { color: '#FACC15', fontWeight: '900', fontSize: isTiny ? 12 : 13, letterSpacing: 0.5 },

    content: {
      paddingHorizontal: contentPaddingH,
      paddingTop: isExtraTiny ? 20 : isTiny ? 24 : isDesktop ? 40 : 32,
      paddingBottom: isExtraTiny ? 30 : 50,
      backgroundColor: C.background,
      borderTopLeftRadius: isExtraTiny ? 25 : 45,
      borderTopRightRadius: isExtraTiny ? 25 : 45,
      marginTop: isExtraTiny ? -25 : -45,
      maxWidth: contentMaxWidth,
      width: '100%',
      alignSelf: 'center',
    },
    sectionLabel: {
      color: '#2563EB',
      fontSize: isExtraTiny ? 9 : 10,
      fontWeight: '900',
      letterSpacing: 2,
      textAlign: 'center',
      marginBottom: isExtraTiny ? 4 : 8,
    },
    sectionTitle: {
      fontSize: isExtraTiny ? 18 : isTiny ? 20 : isDesktop ? 28 : 24,
      fontWeight: '900',
      color: C.text,
      textAlign: 'center',
      marginBottom: isExtraTiny ? 18 : isTiny ? 22 : isDesktop ? 36 : 28,
      letterSpacing: -0.5,
    },

    featureGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: numColumns === 1 ? 'center' : 'space-between',
      gap: gridGap,
      width: '100%',
    },
    fCard: {
      width: cardWidth,
      backgroundColor: C.card,
      padding: isExtraTiny ? 12 : isTiny ? 14 : isDesktop ? 22 : 18,
      borderRadius: isExtraTiny ? 16 : isTiny ? 18 : 22,
      borderWidth: 1.5,
      borderColor: C.cardBorder,
      minHeight: isExtraTiny ? 105 : isTiny ? 120 : isDesktop ? 175 : 145,
      shadowColor: C.isDark ? '#000' : '#2563EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: C.isDark ? 0.25 : 0.06,
      shadowRadius: 12,
      elevation: 3,
      ...(Platform.OS === 'web' ? {
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'default',
      } as any : {}),
    },
    iconCircle: {
      width: isExtraTiny ? 36 : isTiny ? 40 : isDesktop ? 48 : 44,
      height: isExtraTiny ? 36 : isTiny ? 40 : isDesktop ? 48 : 44,
      borderRadius: isExtraTiny ? 12 : isTiny ? 14 : 16,
      backgroundColor: C.isDark ? '#1e293b' : '#EFF6FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isExtraTiny ? 8 : 12,
      borderWidth: 1,
      borderColor: C.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(37,99,235,0.1)',
      elevation: 2,
    },
    fTitle: {
      fontSize: isExtraTiny ? 12 : isTiny ? 12.5 : isDesktop ? 15 : 14,
      fontWeight: '900',
      color: C.text,
      letterSpacing: -0.3,
      marginBottom: isExtraTiny ? 3 : 6,
    },
    fDesc: {
      fontSize: isExtraTiny ? 10 : isTiny ? 10.5 : isDesktop ? 12 : 11.5,
      color: C.textSecondary,
      lineHeight: isExtraTiny ? 15 : isTiny ? 16 : isDesktop ? 19 : 17,
      fontWeight: '500',
    },

    loginOutline: {
      backgroundColor: '#2563EB',
      marginTop: isTiny ? 15 : 25,
      padding: isExtraTiny ? 12 : isTiny ? 16 : 18,
      borderRadius: 15,
      alignItems: 'center',
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
      width: '100%',
      maxWidth: isWide ? 440 : undefined,
      alignSelf: 'center',
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
    },
    loginOutlineText: { color: '#fff', fontWeight: '900', fontSize: isExtraTiny ? 11 : isTiny ? 12 : 13, letterSpacing: 0.8 },

    footer: { backgroundColor: C.isDark ? '#0F172A' : '#F1F5F9', paddingVertical: isTiny ? 40 : 60, paddingHorizontal: 20, alignItems: 'center' },
    footerBrand: { color: C.text, fontSize: isTiny ? 18 : 22, fontWeight: '900', letterSpacing: 4 },
    footerCopyright: { color: C.textMuted, fontSize: 8, fontWeight: '800', marginTop: 12, letterSpacing: 0.5, textAlign: 'center' },
    footerInfo: { color: C.textMuted, fontSize: 8, fontWeight: '600', marginTop: 4, letterSpacing: 0.5 },
    footerContact: { color: C.textMuted, fontSize: 8, fontWeight: '600', marginTop: 4 },
    footerDivider: { width: 40, height: 2, backgroundColor: Colors.accent.gold, marginVertical: 20 },
    footerYear: { color: C.textLabel, fontSize: 9, fontWeight: 'bold' }
  });
}
