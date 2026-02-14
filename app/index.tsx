import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ImageBackground, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function HomePage() {
  const router = useRouter();

  return (
    <View style={styles.mainWrapper}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071' }}
          style={styles.hero}
        >
          <LinearGradient
            colors={['rgba(10, 15, 30, 0.8)', 'rgba(15, 23, 42, 0.98)']}
            style={styles.overlay}
          >
            <View style={styles.logoBadge}>
              <Ionicons name="ribbon" size={22} color="#FACC15" />
              <Text style={styles.logoText}>SABINO SCHOOL</Text>
            </View>

            {/* ULTRA BOLD HEADER */}
            <Text style={styles.title}>EXCELLENCE{'\n'}IN EVERY{'\n'}RESULT</Text>
            <View style={styles.goldBar} />

            <Text style={styles.tagline}>
              Empowering schools with precision tracking and professional digital identity.
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.ctaButton}
                onPress={() => router.push('/(auth)/verify-email')}
              >
                <Text style={styles.ctaButtonText}>CREATE NEW ACCOUNT</Text>
                <Ionicons name="arrow-forward-circle" size={24} color="#fff" style={{ marginLeft: 10 }} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.studentLoginButton}
                onPress={() => router.push('/(student)' as any)}
              >
                <Ionicons name="person-outline" size={20} color="#2563EB" style={{ marginRight: 8 }} />
                <Text style={styles.studentLoginText}>STUDENTS' LOGIN</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.content}>
          <Text style={styles.sectionLabel}>CORE FEATURES</Text>
          <Text style={styles.sectionTitle}>Precision Tools for Educators</Text>

          <View style={styles.featureGrid}>
            <FeatureCard icon="stats-chart" title="Smart Analytics" desc="Instant ranking & class positions." />
            <FeatureCard icon="color-wand" title="Custom Branding" desc="Personalized logos & digital stamps." />
            <FeatureCard icon="notifications" title="Quick Alerts" desc="Keep parents informed instantly." />
            <FeatureCard icon="lock-closed" title="Secure Access" desc="1-hour encrypted sessions." />
          </View>

          <TouchableOpacity style={styles.loginOutline} onPress={() => router.push('/(auth)')}>
            <Text style={styles.loginOutlineText}>ALREADY REGISTERED? SIGN IN</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>SABINO SCHOOL</Text>
          <Text style={styles.footerCopyright}>THE GOLD STANDARD FOR ACADEMIC REPORTING</Text>
          <View style={styles.footerDivider} />
          <Text style={styles.footerYear}>© 2026 SABINO SYSTEMS GLOBAL</Text>
        </View>

      </ScrollView>
    </View>
  );
}

interface FeatureCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}

function FeatureCard({ icon, title, desc }: FeatureCardProps) {
  return (
    <View style={styles.fCard}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={24} color="#1E293B" />
      </View>
      <Text style={styles.fTitle}>{title}</Text>
      <Text style={styles.fDesc}>{desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#0F172A' },
  scrollContainer: { flexGrow: 1 },

  hero: { width: '100%', height: 550 },
  overlay: { flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center' },

  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  logoText: { color: '#FACC15', fontSize: 13, fontWeight: '900', marginLeft: 10, letterSpacing: 3 },

  // BOLDER TITLE STYLES
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -1
  },
  goldBar: { width: 80, height: 6, backgroundColor: '#FACC15', borderRadius: 3, marginVertical: 20 },

  tagline: { fontSize: 16, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 10, lineHeight: 26, fontWeight: '500' },

  ctaButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    paddingVertical: 20,
    paddingHorizontal: 45,
    borderRadius: 15,
    marginTop: 35,
    shadowColor: '#2563EB',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10
  },
  ctaButtonText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    marginTop: 35,
    flexWrap: 'wrap',
  },

  studentLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5
  },
  studentLoginText: { color: '#2563EB', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

  content: {
    padding: 24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 45,
    borderTopRightRadius: 45,
    marginTop: -45,
    paddingBottom: 50
  },
  sectionLabel: { color: '#2563EB', fontSize: 12, fontWeight: '900', letterSpacing: 2.5, textAlign: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 26, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 35, letterSpacing: -0.5 },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  fCard: {
    width: (width - 64) / 2,
    backgroundColor: '#F8FAFC',
    padding: 24,
    borderRadius: 30,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9'
  },
  iconCircle: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 2 },
  fTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: -0.3 },
  fDesc: { fontSize: 13, color: '#64748B', marginTop: 8, lineHeight: 20, fontWeight: '500' },

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

  footer: { backgroundColor: '#0F172A', padding: 60, alignItems: 'center' },
  footerBrand: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 6 },
  footerCopyright: { color: '#475569', fontSize: 10, fontWeight: '800', marginTop: 15, letterSpacing: 1 },
  footerDivider: { width: 50, height: 2, backgroundColor: '#FACC15', marginVertical: 25 },
  footerYear: { color: '#334155', fontSize: 10, fontWeight: 'bold' }
});