import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Platform,
  ImageBackground, RefreshControl, Modal, useWindowDimensions
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { API_BASE_URL } from '@/utils/api-service';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/design-system';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';


const SWATCHES = [
  '#1E40AF', '#2563EB', '#0EA5E9', '#059669',
  '#10B981', '#D97706', '#EF4444', '#EC4899',
  '#8B5CF6', '#1E293B', '#475569', '#FACC15',
];

export default function SchoolPreferencesScreen() {
  const router = useRouter();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);
  const { themeColor, loadThemeFromPreferences, themeMode, setThemeMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerColor, setPickerColor] = useState('#2563EB');
  


  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth > 768;
  const contentWidth = isLargeScreen ? 700 : windowWidth;

  const [statusAlert, setStatusAlert] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });


  const [prefs, setPrefs] = useState({
    theme_color: '#2563EB',
    logo_url: '',
    stamp_url: '',
    report_footer_text: '',
    show_attendance: false,
  });

  const [logoFile, setLogoFile] = useState<any>(null);
  const [stampFile, setStampFile] = useState<any>(null);

  const getAuthData = async () => {
    const token = Platform.OS === 'web'
      ? localStorage.getItem('userToken')
      : await SecureStore.getItemAsync('userToken');
    const userDataStr = Platform.OS === 'web'
      ? localStorage.getItem('userData')
      : await SecureStore.getItemAsync('userData');

    const schoolId = JSON.parse(userDataStr || '{}').schoolId;
    return { token, schoolId };
  };

  const fetchPreferences = useCallback(async () => {
    try {
      const { token, schoolId } = await getAuthData();
      if (!token || !schoolId) return;

      const response = await fetch(`${API_BASE_URL}/api/preferences/${schoolId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();
      if (data.success) {
        const color = data.data.theme_color || '#2563EB';
        setPrefs({
          theme_color: color,
          logo_url: data.data.logo_url || '',
          stamp_url: data.data.stamp_url || '',
          report_footer_text: data.data.report_footer_text || '',
          show_attendance: data.data.show_attendance || false,
        });
        setPickerColor(color);
      }
    } catch (err) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Fetch Error',
        message: 'Unable to retrieve school branding profiles.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPreferences();
  };

  const handlePickDocument = async (type: 'logo' | 'stamp') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (type === 'logo') {
          setLogoFile(file);
          setPrefs(prev => ({ ...prev, logo_url: file.uri }));
        } else {
          setStampFile(file);
          setPrefs(prev => ({ ...prev, stamp_url: file.uri }));
        }
      }
    } catch (err) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Selection Error',
        message: 'Failed to acquire asset from secure storage.'
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { token, schoolId } = await getAuthData();
      const formData = new FormData();

      formData.append('theme_color', prefs.theme_color);
      formData.append('header_text', prefs.report_footer_text);
      formData.append('show_attendance', String(prefs.show_attendance));

      if (logoFile) {
        const logoData: any = {
          uri: Platform.OS === 'ios' ? logoFile.uri.replace('file://', '') : logoFile.uri,
          name: logoFile.name || 'logo.png',
          type: logoFile.mimeType || 'image/png',
        };
        formData.append('logo', logoData);
      } else if (prefs.logo_url) {
        formData.append('logo_url', prefs.logo_url);
      }

      if (stampFile) {
        const stampData: any = {
          uri: Platform.OS === 'ios' ? stampFile.uri.replace('file://', '') : stampFile.uri,
          name: stampFile.name || 'stamp.png',
          type: stampFile.mimeType || 'image/png',
        };
        formData.append('stamp', stampData);
      } else if (prefs.stamp_url) {
        formData.append('stamp_url', prefs.stamp_url);
      }

      const response = await fetch(`${API_BASE_URL}/api/preferences/${schoolId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        await loadThemeFromPreferences();
        setStatusAlert({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'School branding has been updated and propagated.'
        });
        setLogoFile(null);
        setStampFile(null);
        fetchPreferences();
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (err: any) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Application Error',
        message: err.message || 'Failed to synchronize branding changes.'
      });
    } finally {
      setSaving(false);
    }
  };

  const selectColor = (hex: string) => {
    setPickerColor(hex);
    setPrefs(prev => ({ ...prev, theme_color: hex }));
    setShowColorPicker(false);
  };

  // Internal Sub-components to keep styles in scope
  function AssetUploader({ title, subtitle, url, onUpload, icon }: any) {
    return (
      <View style={styles.assetRow}>
        <View style={styles.assetPreview}>
          {url ? (
            <Image source={{ uri: url }} style={styles.assetImage} contentFit="contain" />
          ) : (
            <View style={styles.assetPlaceholder}>
              <Ionicons name={icon} size={28} color={C.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
            </View>
          )}
        </View>
        <View style={styles.assetInfo}>
          <ThemedText style={styles.assetTitle}>{title}</ThemedText>
          <ThemedText style={styles.assetSubtitle}>{subtitle}</ThemedText>
          <TouchableOpacity style={styles.uploadBtn} onPress={onUpload}>
            <Ionicons name="cloud-upload" size={14} color={Colors.accent.gold} />
            <ThemedText style={styles.uploadBtnText}>Select File</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function ThemeModeButton({ icon, label, subtitle, isActive, onPress }: any) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.themeModeBtn,
          {
            backgroundColor: isActive ? 'rgba(37,99,235,0.12)' : C.actionItemBg,
            borderColor: isActive ? '#2563EB' : C.cardBorder,
            borderWidth: isActive ? 2 : 1,
          }
        ]}
        activeOpacity={0.85}
      >
        <Ionicons name={icon} size={22} color={isActive ? '#2563EB' : C.textSecondary} />
        <ThemedText style={[styles.themeModeLabel, { color: isActive ? '#2563EB' : C.textSecondary }]}>{label}</ThemedText>
        {!!subtitle && <ThemedText style={styles.themeModeSubtitle}>{subtitle}</ThemedText>}
      </TouchableOpacity>
    );
  }

  if (loading) return (
    <ThemedView style={styles.loader}>
      <ActivityIndicator size="large" color={Colors.accent.gold} />
      <ThemedText style={styles.loadingText}>SYNCHRONIZING ASSETS...</ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.mainWrapper}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=2074&auto=format&fit=crop' }}
        style={[styles.hero, { height: isLargeScreen ? 350 : 250 }]}
      >
        <LinearGradient
          colors={[C.isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)', C.background]}
          style={styles.heroOverlay}
        >
          <View style={[styles.header, { maxWidth: 1200, alignSelf: 'center', width: '100%', marginBottom: isLargeScreen ? 60 : 20 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={C.text} />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>System Branding</ThemedText>
            <View style={{ width: 44 }} />
          </View>

          <View style={[styles.heroContent, { maxWidth: contentWidth, alignSelf: 'center', width: '100%', marginBottom: isLargeScreen ? 60 : 30 }]}>
            <ThemedText style={styles.heroSubtitle}>VISUAL IDENTITY</ThemedText>
            <ThemedText style={styles.heroMainTitle}>Portal Customization</ThemedText>
          </View>
        </LinearGradient>
      </ImageBackground>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: contentWidth, alignSelf: 'center', width: '100%' }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent.gold} />}
      >
        {statusAlert.visible && (
          <CustomAlert
            type={statusAlert.type}
            title={statusAlert.title}
            message={statusAlert.message}
            onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
            style={styles.alert}
          />
        )}


        {/* ── Theme Color ── */}
        <View style={styles.card}>
          <ThemedText style={styles.cardLabel}>THEME SPECIFICATION</ThemedText>
          <ThemedText style={styles.helperText}>Choose a primary color to define the portal's visual accent.</ThemedText>

          <TouchableOpacity
            style={[styles.colorTrigger, { borderColor: prefs.theme_color }]}
            onPress={() => {
              setPickerColor(prefs.theme_color);
              setShowColorPicker(true);
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.colorDot, { backgroundColor: prefs.theme_color }]} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText style={styles.colorTriggerLabel} numberOfLines={1}>Active Theme Color</ThemedText>
              <ThemedText style={styles.colorTriggerValue} adjustsFontSizeToFit numberOfLines={1}>{prefs.theme_color.toUpperCase()}</ThemedText>
            </View>
            <View style={[styles.colorTriggerChip, { backgroundColor: prefs.theme_color }]}>
              <Ionicons name="color-palette-outline" size={windowWidth < 360 ? 16 : 18} color="#FFFFFF" />
              {windowWidth >= 360 && <ThemedText style={styles.colorTriggerChipText}>Change</ThemedText>}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Theme Mode ── */}
        <View style={styles.card}>
          <ThemedText style={styles.cardLabel}>DISPLAY MODE</ThemedText>
          <ThemedText style={styles.helperText}>Choose how the portal appears across all devices.</ThemedText>

          <View style={styles.themeModeContainer}>
            <ThemeModeButton
              icon="sunny"
              label="Light"
              isActive={themeMode === 'light'}
              onPress={() => setThemeMode('light')}
            />
            <ThemeModeButton
              icon="moon"
              label="Dark"
              isActive={themeMode === 'dark'}
              onPress={() => setThemeMode('dark')}
            />
            <ThemeModeButton
              icon="phone-portrait"
              label="System"
              isActive={themeMode === 'system'}
              onPress={() => setThemeMode('system')}
              subtitle="Auto"
            />
          </View>
        </View>

        {/* ── Identity Assets ── */}
        <View style={styles.card}>
          <ThemedText style={styles.cardLabel}>IDENTITY ASSETS</ThemedText>

          <AssetUploader
            title="School Emblem"
            subtitle="High-resolution PNG/JPG"
            url={prefs.logo_url}
            onUpload={() => handlePickDocument('logo')}
            icon="image-outline"
          />

          <View style={styles.divider} />

          <AssetUploader
            title="Official Stamp"
            subtitle="Transparent background recommended"
            url={prefs.stamp_url}
            onUpload={() => handlePickDocument('stamp')}
            icon="ribbon-outline"
          />
        </View>

        {/* ── Report Config ── */}
        <View style={styles.card}>
          <ThemedText style={styles.cardLabel}>REPORT CONFIGURATION</ThemedText>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Dynamic Footer Text</ThemedText>
            <TextInput
              style={styles.textArea}
              value={prefs.report_footer_text}
              onChangeText={(txt) => setPrefs({ ...prefs, report_footer_text: txt })}
              placeholder="Enter validation disclaimer or school motto..."
              placeholderTextColor={C.textMuted}
              multiline
            />
            <ThemedText style={styles.helperText}>This text will appear at the base of all generated result certificates.</ThemedText>
          </View>
        </View>

        <View style={styles.actionRow}>
          <CustomButton
            title={saving ? "Propagating Changes..." : "Secure & Apply Branding"}
            onPress={handleSave}
            loading={saving}
            variant="premium"
          />
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <ThemedText style={styles.cancelText}>Discard Changes</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Simple Color Picker Modal ── */}
      <Modal
        visible={showColorPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={[styles.pickerOverlay, isLargeScreen && styles.pickerOverlayLarge]}>
          <View style={[
            styles.pickerSheet,
            isLargeScreen && { width: 500, borderRadius: 32, marginBottom: 0, alignSelf: 'center' }
          ]}>
            {/* Header */}
            <View style={styles.pickerHeader}>
              <ThemedText style={styles.pickerTitle}>Select Theme Color</ThemedText>
              <TouchableOpacity onPress={() => setShowColorPicker(false)} style={styles.pickerClose}>
                <Ionicons name="close" size={22} color={Colors.accent.gold} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
              {SWATCHES.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => selectColor(color)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: color,
                    borderWidth: prefs.theme_color === color ? 3 : 0,
                    borderColor: C.text,
                    justifyContent: 'center',
                    alignItems: 'center',
                    elevation: 2,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                  activeOpacity={0.8}
                >
                  {prefs.theme_color === color && <Ionicons name="checkmark" size={28} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
  return StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: C.background },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
    loadingText: { color: Colors.accent.gold, marginTop: 15, fontSize: 12, fontWeight: '800', letterSpacing: 2 },

    hero: { height: 280, width: '100%' },
    heroOverlay: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 },
    backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.backButton, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: C.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

    heroContent: { marginTop: 'auto', marginBottom: 30 },
    heroSubtitle: { color: Colors.accent.gold, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
    heroMainTitle: { color: C.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 },

    scrollView: { flex: 1, marginTop: -30 },
    scrollContent: { padding: 20, paddingBottom: 60 },
    alert: { marginBottom: 20 },

    card: { backgroundColor: C.card, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 24 },
    cardLabel: { color: Colors.accent.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 16 },
    helperText: { color: C.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 12 },
    
    themeModeBtn: { flex: 1, alignItems: 'center', padding: 12, marginHorizontal: 4, borderRadius: 12 },
    themeModeLabel: { fontWeight: 'bold', marginTop: 4 },
    themeModeSubtitle: { color: C.textMuted, fontSize: 10 },
    themeModeContainer: { flexDirection: 'row', gap: 8, marginTop: 4 },

    colorTrigger: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: C.actionItemBg, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: C.cardBorder },
    colorDot: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: C.divider },
    colorTriggerLabel: { color: C.textLabel, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
    colorTriggerValue: { color: C.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    colorTriggerChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    colorTriggerChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

    pickerOverlay: { flex: 1, backgroundColor: C.modalOverlay, justifyContent: 'flex-end' },
    pickerOverlayLarge: { justifyContent: 'center', padding: 40 },
    pickerSheet: { backgroundColor: C.modalBg, borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingBottom: 40, borderTopWidth: 1, borderColor: C.cardBorder, maxHeight: '90%' },

    pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
    pickerTitle: { color: C.text, fontSize: 20, fontWeight: '900' },
    pickerClose: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.actionIconWrap, justifyContent: 'center', alignItems: 'center' },

    colorPicker: { paddingHorizontal: 20 },
    pickerPanel: { borderRadius: 20, height: 220, marginBottom: 20 },

    slidersBlock: { gap: 12, marginBottom: 20 },
    sliderLabel: { color: C.textLabel, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
    slider: { borderRadius: 12, height: 28 },

    hexBlock: { marginBottom: 20 },
    pickerHexText: { color: C.text, fontSize: 14, fontWeight: '800' },

    swatchesLabel: { color: C.textLabel, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, paddingHorizontal: 20 },
    swatchesContainer: { paddingHorizontal: 20, marginBottom: 8 },
    swatch: { borderRadius: 12, height: 36, width: 36 },

    pickerFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.divider, marginTop: 8 },
    pickerPreview: { flex: 1, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    pickerPreviewText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.accent.gold, paddingHorizontal: 24, borderRadius: 16 },
    confirmBtnText: { color: Colors.accent.navy, fontSize: 14, fontWeight: '900' },

    assetRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    assetPreview: { width: 80, height: 80, borderRadius: 20, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder, overflow: 'hidden' },
    assetImage: { width: '100%', height: '100%' },
    assetPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    assetInfo: { flex: 1, gap: 4 },
    assetTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
    assetSubtitle: { color: C.textMuted, fontSize: 12, fontWeight: '600' },
    uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    uploadBtnText: { color: Colors.accent.gold, fontSize: 12, fontWeight: '800' },
    
    resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
    resetBtnText: { color: Colors.accent.gold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

    divider: { height: 1, backgroundColor: C.divider, marginVertical: 20 },

    inputGroup: { gap: 12 },
    inputLabel: { color: C.textSecondary, fontSize: 13, fontWeight: '700' },
    textArea: { backgroundColor: C.inputBg, borderRadius: 20, padding: 16, color: C.inputText, fontSize: 14, height: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: C.inputBorder },

    actionRow: { gap: 16, marginTop: 20 },
    cancelBtn: { alignItems: 'center', paddingVertical: 12 },
    cancelText: { color: C.textMuted, fontSize: 14, fontWeight: '700' },
  });
}