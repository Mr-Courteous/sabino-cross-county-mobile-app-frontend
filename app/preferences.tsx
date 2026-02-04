import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  StyleSheet, Alert, ActivityIndicator, Platform, SafeAreaView
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '@/utils/api-service';
import { useTheme } from '@/contexts/theme-context';
import { useRouter } from 'expo-router';

// Preset color palette
const PRESET_COLORS = [
  '#FF5252', '#FF6E40', '#FF9100', '#FFC400',
  '#FFEB3B', '#CDDC39', '#8BC34A', '#4CAF50',
  '#00BCD4', '#00ACC1', '#0097A7', '#0288D1',
  '#2196F3', '#1976D2', '#1565C0', '#6A1B9A',
  '#7B1FA2', '#512DA8', '#C2185B', '#E91E63',
  '#000000', '#424242', '#757575', '#BDBDBD',
];

export default function SchoolPreferencesScreen() {
  const router = useRouter();
  const { themeColor, loadThemeFromPreferences } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    theme_color: '#2196F3',
    logo_url: '',
    stamp_url: '',
    report_footer_text: '',
    show_attendance: false,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const getAuthData = async () => {
    if (Platform.OS === 'web') {
      return {
        token: localStorage.getItem('userToken'),
        schoolId: JSON.parse(localStorage.getItem('userData') || '{}').schoolId
      };
    } else {
      const token = await SecureStore.getItemAsync('userToken');
      const userData = await SecureStore.getItemAsync('userData');
      const schoolId = JSON.parse(userData || '{}').schoolId;
      return { token, schoolId };
    }
  };

  const fetchPreferences = async () => {
    try {
      const { token, schoolId } = await getAuthData();
      
      if (!token || !schoolId) {
        Alert.alert("Auth Error", "Please log in again.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/preferences/${schoolId}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Merge fetched data with state, providing defaults for null values
        setPrefs({
          theme_color: data.data.theme_color || '#2196F3',
          logo_url: data.data.logo_url || '',
          stamp_url: data.data.stamp_url || '',
          report_footer_text: data.data.report_footer_text || '',
          show_attendance: data.data.show_attendance || false,
        });
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      Alert.alert("Error", "Could not load school preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { token, schoolId } = await getAuthData();

      const response = await fetch(`${API_BASE_URL}/api/preferences/${schoolId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(prefs),
      });

      const data = await response.json();

      if (response.ok) {
        // Reload theme from preferences to update app colors
        await loadThemeFromPreferences();
        Alert.alert("Success", "Branding updated successfully!");
      } else {
        Alert.alert("Update Failed", data.error || "Could not save changes.");
      }
    } catch (err) {
      console.error('Save Error:', err);
      Alert.alert("Error", "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Ionicons name="color-palette" size={28} color={themeColor} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.headerTitle}>School Branding</Text>
              <Text style={styles.headerSubtitle}>Customize your school's look & feel</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Theme Color Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIndicator, { backgroundColor: themeColor }]} />
            <Text style={styles.sectionTitle}>Theme Color</Text>
          </View>

          {/* Color Palette Grid */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Choose from Popular Colors</Text>
            <View style={styles.colorPaletteContainer}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    prefs.theme_color === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setPrefs({ ...prefs, theme_color: color })}
                >
                  {prefs.theme_color === color && (
                    <Ionicons name="checkmark-done" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Hex Input for Custom Colors */}
            <View style={styles.hexInputContainer}>
              <Text style={styles.hexLabel}>Custom Hex:</Text>
              <TextInput
                style={styles.hexInput}
                value={prefs.theme_color}
                onChangeText={(txt) => setPrefs({ ...prefs, theme_color: txt })}
                placeholder="#2196F3"
                autoCapitalize="characters"
                maxLength={7}
              />
            </View>

            {/* Live Color Preview */}
            <View style={styles.previewContainer}>
              <View style={[styles.colorPreviewBox, { backgroundColor: prefs.theme_color }]}>
                <Text style={styles.previewText}>Preview</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Assets Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIndicator, { backgroundColor: themeColor }]} />
            <Text style={styles.sectionTitle}>Brand Assets</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="image" size={18} color={themeColor} />
                <Text style={styles.cardLabel}>School Logo</Text>
              </View>
              <TextInput
                style={styles.input}
                value={prefs.logo_url}
                onChangeText={(txt) => setPrefs({ ...prefs, logo_url: txt })}
                placeholder="https://..."
              />
              <Text style={styles.helperText}>URL to your school logo (PNG/JPG recommended)</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="ribbon" size={18} color={themeColor} />
                <Text style={styles.cardLabel}>Official Stamp/Seal</Text>
              </View>
              <TextInput
                style={styles.input}
                value={prefs.stamp_url}
                onChangeText={(txt) => setPrefs({ ...prefs, stamp_url: txt })}
                placeholder="https://..."
              />
              <Text style={styles.helperText}>URL to your official seal or stamp</Text>
            </View>
          </View>
        </View>

        {/* Footer Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIndicator, { backgroundColor: themeColor }]} />
            <Text style={styles.sectionTitle}>Report Footer</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="document-text" size={18} color={themeColor} />
                <Text style={styles.cardLabel}>Footer Text</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={prefs.report_footer_text}
                onChangeText={(txt) => setPrefs({ ...prefs, report_footer_text: txt })}
                placeholder="e.g. This result is valid only with the official seal."
                multiline
              />
              <Text style={styles.helperText}>Displayed at the bottom of all report cards</Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: prefs.theme_color }]} 
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save & Apply Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop: Platform.OS === 'android' ? 45 : 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
  },

  scrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },

  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIndicator: {
    width: 4,
    height: 18,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },

  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  inputGroup: {
    marginBottom: 16,
  },

  input: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 15,
    color: '#1E293B',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },

  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    fontStyle: 'italic',
  },

  colorPaletteContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 16,
    gap: 10,
  },
  colorOption: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  colorOptionSelected: {
    borderColor: '#fff',
    borderWidth: 4,
    elevation: 5,
    shadowOpacity: 0.3,
  },

  hexInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  hexLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    minWidth: 90,
  },
  hexInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#1E293B',
  },

  previewContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  colorPreviewBox: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  previewText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    marginTop: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
  },

  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
  },
});