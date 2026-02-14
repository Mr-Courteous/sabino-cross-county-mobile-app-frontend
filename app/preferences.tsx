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
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';

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
  const [logoFile, setLogoFile] = useState<any>(null);
  const [stampFile, setStampFile] = useState<any>(null);

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

  const handlePickDocument = async (type: 'logo' | 'stamp') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log(`📁 ${type} file picked:`, {
          name: file.name,
          uri: file.uri,
          mimeType: file.mimeType,
          size: file.size
        });

        if (type === 'logo') {
          setLogoFile(file);
          // Show preview immediately
          setPrefs(prev => ({ ...prev, logo_url: file.uri }));
        } else {
          setStampFile(file);
          setPrefs(prev => ({ ...prev, stamp_url: file.uri }));
        }
      }
    } catch (err) {
      console.log('Document Picker Error:', err);
      Alert.alert('Error', 'Failed to pick file: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { token, schoolId } = await getAuthData();

      console.log('🚀 Starting save process...');
      console.log('Logo file:', logoFile);
      console.log('Stamp file:', stampFile);
      console.log('Platform:', Platform.OS);

      const formData = new FormData();

      // Text fields
      formData.append('theme_color', prefs.theme_color);
      formData.append('header_text', prefs.report_footer_text);
      formData.append('show_attendance', String(prefs.show_attendance));

      // Handle Logo - Convert uri to Blob for upload
      if (logoFile) {
        console.log('📸 Preparing logo for upload...');
        const fileName = logoFile.name || 'logo.png';
        const mimeType = logoFile.mimeType || 'image/png';

        try {
          if (Platform.OS === 'web') {
            // On web: fetch the uri and convert to Blob
            console.log('Web: Fetching logo from uri...', logoFile.uri);
            console.log('File size from picker:', logoFile.size, 'bytes');
            
            const response = await fetch(logoFile.uri);
            if (!response.ok) {
              throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
            }
            
            const blob = await response.blob();
            console.log('Web: Logo blob created, size:', blob.size, 'bytes');
            
            if (blob.size === 0) {
              throw new Error('Logo file is empty. Please try again.');
            }
            
            // Create a proper File object
            const file = new File([blob], fileName, { type: mimeType });
            console.log('Logo File object:', { name: file.name, size: file.size, type: file.type });
            formData.append('logo', file);
          } else {
            // On native: Use uri-based format that React Native FormData understands
            const logoToUpload: any = {
              uri: Platform.OS === 'ios' ? logoFile.uri.replace('file://', '') : logoFile.uri,
              name: fileName,
              type: mimeType,
            };
            console.log('Native: Logo upload object:', logoToUpload);
            formData.append('logo', logoToUpload);
          }
        } catch (fileErr) {
          console.error('Error processing logo file:', fileErr);
          Alert.alert("Error", "Failed to process logo file: " + (fileErr instanceof Error ? fileErr.message : ''));
          setSaving(false);
          return;
        }
      } else if (prefs.logo_url && !logoFile) {
        console.log('📝 Using existing logo URL:', prefs.logo_url);
        formData.append('logo_url', prefs.logo_url);
      }

      // Handle Stamp - Convert uri to Blob for upload
      if (stampFile) {
        console.log('📸 Preparing stamp for upload...');
        const fileName = stampFile.name || 'stamp.png';
        const mimeType = stampFile.mimeType || 'image/png';

        try {
          if (Platform.OS === 'web') {
            // On web: fetch the uri and convert to Blob
            console.log('Web: Fetching stamp from uri...', stampFile.uri);
            console.log('File size from picker:', stampFile.size, 'bytes');
            
            const response = await fetch(stampFile.uri);
            if (!response.ok) {
              throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
            }
            
            const blob = await response.blob();
            console.log('Web: Stamp blob created, size:', blob.size, 'bytes');
            
            if (blob.size === 0) {
              throw new Error('Stamp file is empty. Please try again.');
            }
            
            // Create a proper File object
            const file = new File([blob], fileName, { type: mimeType });
            console.log('Stamp File object:', { name: file.name, size: file.size, type: file.type });
            formData.append('stamp', file);
          } else {
            // On native: Use uri-based format
            const stampToUpload: any = {
              uri: Platform.OS === 'ios' ? stampFile.uri.replace('file://', '') : stampFile.uri,
              name: fileName,
              type: mimeType,
            };
            console.log('Native: Stamp upload object:', stampToUpload);
            formData.append('stamp', stampToUpload);
          }
        } catch (fileErr) {
          console.error('Error processing stamp file:', fileErr);
          Alert.alert("Error", "Failed to process stamp file: " + (fileErr instanceof Error ? fileErr.message : ''));
          setSaving(false);
          return;
        }
      } else if (prefs.stamp_url && !stampFile) {
        console.log('📝 Using existing stamp URL:', prefs.stamp_url);
        formData.append('stamp_url', prefs.stamp_url);
      }

      console.log('📤 Sending request to:', `${API_BASE_URL}/api/preferences/${schoolId}`);
      console.log('FormData keys:', Array.from(formData.entries()).map(([k]) => k));

      const response = await fetch(`${API_BASE_URL}/api/preferences/${schoolId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Do NOT set Content-Type - let fetch set it with multipart/form-data boundary
        },
        body: formData,
      });

      console.log('📨 Response status:', response.status);
      const data = await response.json();
      console.log('📨 Response data:', data);

      if (response.ok && data.success) {
        console.log('✅ Upload successful, returned URLs:', {
          logo_url: data.data.logo_url,
          stamp_url: data.data.stamp_url
        });
        await loadThemeFromPreferences();
        Alert.alert("Success", "Branding updated successfully!");
        setLogoFile(null);
        setStampFile(null);
        // Reload preferences to show updated URLs
        await new Promise(resolve => setTimeout(resolve, 500));
        fetchPreferences();
      } else {
        console.error('❌ Update failed:', data);
        Alert.alert("Update Failed", data.error || data.details || "Could not save changes.");
      }
    } catch (err) {
      console.error('❌ Save Error:', err);
      Alert.alert("Error", "An error occurred while saving: " + (err instanceof Error ? err.message : String(err)));
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
            <View style={styles.imageUploadRow}>
              {prefs.logo_url ? (
                <Image source={{ uri: prefs.logo_url }} style={styles.previewImage} contentFit="contain" />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="image-outline" size={32} color="#CBD5E1" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.cardLabel}>School Logo</Text>
                <Text style={styles.helperText}>Used on clear backgrounds</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={() => handlePickDocument('logo')}>
                  <Ionicons name="cloud-upload-outline" size={16} color="#475569" />
                  <Text style={styles.uploadButtonText}>Upload Logo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.imageUploadRow}>
              {prefs.stamp_url ? (
                <Image source={{ uri: prefs.stamp_url }} style={styles.previewImage} contentFit="contain" />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="ribbon-outline" size={32} color="#CBD5E1" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.cardLabel}>Official Stamp</Text>
                <Text style={styles.helperText}>Used on official reports</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={() => handlePickDocument('stamp')}>
                  <Ionicons name="cloud-upload-outline" size={16} color="#475569" />
                  <Text style={styles.uploadButtonText}>Upload Stamp</Text>
                </TouchableOpacity>
              </View>
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

  // Upload Styles
  imageUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeholderImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 6,
  },
});