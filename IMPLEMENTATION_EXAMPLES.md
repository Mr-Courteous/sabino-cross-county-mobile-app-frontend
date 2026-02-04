# Frontend Integration - Implementation Examples

## Quick Implementation Guide for Remaining Screens

### 1. Students List Screen (`app/students_list.tsx`)

```typescript
import { useSchool } from '@/contexts/school-context';
import { studentApi } from '@/utils/api-calls';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useCallback, useState } from 'react';

export default function StudentsList() {
  const { selectedSchool } = useSchool();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (selectedSchool) {
        loadStudents();
      }
    }, [selectedSchool])
  );

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await studentApi.getAll(selectedSchool!.id);
      if (response.success && response.data) {
        setStudents(response.data.students);
        setFilteredStudents(response.data.students);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStudents();
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(
        (student) =>
          student.first_name.toLowerCase().includes(text.toLowerCase()) ||
          student.last_name.toLowerCase().includes(text.toLowerCase()) ||
          student.admission_number?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  };

  if (!selectedSchool) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Please select a school first</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Search by name or admission number..."
          style={styles.searchInput}
          value={searchText}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
      </View>

      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.studentCard}>
            <View style={styles.studentContent}>
              <View style={styles.initials}>
                <Text style={styles.initialsText}>
                  {item.first_name[0]}{item.last_name[0]}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>
                  {item.first_name} {item.last_name}
                </Text>
                {item.admission_number && (
                  <Text style={styles.admission}>{item.admission_number}</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Students</Text>
            <Text style={styles.emptyText}>
              No students registered yet for this school
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  studentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  initials: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  initialsText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#333' },
  admission: { fontSize: 12, color: '#999', marginTop: 4 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 15 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 10 },
});
```

---

### 2. Register Student Screen (`app/register_student.tsx`)

```typescript
import { useSchool } from '@/contexts/school-context';
import { classApi, studentApi } from '@/utils/api-calls';
import { Class } from '@/utils/api-calls';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Picker,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function RegisterStudentScreen() {
  const { selectedSchool } = useSchool();
  const [classes, setClasses] = useState<Class[]>([]);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [classId, setClassId] = useState<string>('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (selectedSchool) {
        loadClasses();
      }
    }, [selectedSchool])
  );

  const loadClasses = async () => {
    try {
      setClassesLoading(true);
      // Get current academic year first
      // For now, assuming yearId is 1 - you should fetch actual current year
      const response = await classApi.getByYear(selectedSchool!.id, 1);
      if (response.success && response.data) {
        setClasses(response.data.classes);
        if (response.data.classes.length > 0) {
          setClassId(response.data.classes[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setClassesLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !classId) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await studentApi.create(selectedSchool!.id, {
        classId: parseInt(classId),
        firstName,
        lastName,
        admissionNumber: admissionNumber || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        parentName: parentName || undefined,
        parentPhone: parentPhone || undefined,
        school_id: selectedSchool!.id,
        class_id: parseInt(classId),
      });

      if (response.success) {
        Alert.alert('Success', 'Student registered successfully');
        // Reset form
        setFirstName('');
        setLastName('');
        setAdmissionNumber('');
        setGender('');
        setDateOfBirth('');
        setParentName('');
        setParentPhone('');
      } else {
        Alert.alert('Error', response.error || 'Failed to register student');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedSchool) {
    return (
      <View style={styles.container}>
        <Text>Please select a school first</Text>
      </View>
    );
  }

  if (classesLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Student Information</Text>

      <TextInput
        placeholder="First Name *"
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        editable={!loading}
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Last Name *"
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        editable={!loading}
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Admission Number (Optional)"
        style={styles.input}
        value={admissionNumber}
        onChangeText={setAdmissionNumber}
        editable={!loading}
        placeholderTextColor="#999"
      />

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Select Class *</Text>
        <Picker
          selectedValue={classId}
          onValueChange={setClassId}
          enabled={!loading}
        >
          <Picker.Item label="Choose a class..." value="" />
          {classes.map((cls) => (
            <Picker.Item
              key={cls.id}
              label={cls.class_name}
              value={cls.id.toString()}
            />
          ))}
        </Picker>
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Gender</Text>
        <Picker selectedValue={gender} onValueChange={setGender} enabled={!loading}>
          <Picker.Item label="Select gender..." value="" />
          <Picker.Item label="Male" value="Male" />
          <Picker.Item label="Female" value="Female" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
      </View>

      <TextInput
        placeholder="Date of Birth (YYYY-MM-DD)"
        style={styles.input}
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        editable={!loading}
        placeholderTextColor="#999"
      />

      <Text style={styles.sectionTitle}>Parent Information</Text>

      <TextInput
        placeholder="Parent/Guardian Name (Optional)"
        style={styles.input}
        value={parentName}
        onChangeText={setParentName}
        editable={!loading}
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Parent Phone Number (Optional)"
        style={styles.input}
        keyboardType="phone-pad"
        value={parentPhone}
        onChangeText={setParentPhone}
        editable={!loading}
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register Student</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#1a73e8',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
```

---

### 3. School Preferences Screen (New)

Create `app/school_preferences.tsx`:

```typescript
import { useSchool } from '@/contexts/school-context';
import { preferencesApi } from '@/utils/api-calls';
import { useFocusEffect } from '@react-navigation/native';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function SchoolPreferencesScreen() {
  const { selectedSchool } = useSchool();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [themeColor, setThemeColor] = useState('#1a73e8');
  const [logoUrl, setLogoUrl] = useState('');
  const [stampUrl, setStampUrl] = useState('');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (selectedSchool) {
        loadPreferences();
      }
    }, [selectedSchool])
  );

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await preferencesApi.get(selectedSchool!.id);
      if (response.success && response.data) {
        const prefs = response.data;
        setThemeColor(prefs.theme_color || '#1a73e8');
        setLogoUrl(prefs.logo_url || '');
        setStampUrl(prefs.stamp_url || '');
        setHeaderText(prefs.header_text || '');
        setFooterText(prefs.footer_text || '');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await preferencesApi.update(selectedSchool!.id, {
        themeColor,
        logoUrl,
        stampUrl,
        headerText,
        footerText,
      });

      if (response.success) {
        Alert.alert('Success', 'School preferences updated');
      } else {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedSchool) {
    return <Text style={styles.container}>Please select a school first</Text>;
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>School Branding</Text>

      <View style={styles.colorPickerContainer}>
        <Text style={styles.label}>Theme Color</Text>
        <View style={styles.colorPicker}>
          <View style={[styles.colorPreview, { backgroundColor: themeColor }]} />
          <TextInput
            placeholder="#1a73e8"
            style={styles.colorInput}
            value={themeColor}
            onChangeText={setThemeColor}
            editable={!saving}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <Text style={styles.label}>Logo URL</Text>
      <TextInput
        placeholder="https://example.com/logo.png"
        style={styles.input}
        value={logoUrl}
        onChangeText={setLogoUrl}
        editable={!saving}
        placeholderTextColor="#999"
      />
      {logoUrl && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Logo Preview:</Text>
          <View style={styles.urlPreview}>
            <Ionicons name="image-outline" size={40} color="#999" />
            <Text style={styles.previewText} numberOfLines={2}>
              {logoUrl}
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.label}>Stamp URL</Text>
      <TextInput
        placeholder="https://example.com/stamp.png"
        style={styles.input}
        value={stampUrl}
        onChangeText={setStampUrl}
        editable={!saving}
        placeholderTextColor="#999"
      />
      {stampUrl && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Stamp Preview:</Text>
          <View style={styles.urlPreview}>
            <Ionicons name="image-outline" size={40} color="#999" />
            <Text style={styles.previewText} numberOfLines={2}>
              {stampUrl}
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Text Settings</Text>

      <Text style={styles.label}>Header Text</Text>
      <TextInput
        placeholder="School name or header..."
        style={styles.input}
        value={headerText}
        onChangeText={setHeaderText}
        editable={!saving}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Footer Text</Text>
      <TextInput
        placeholder="© 2024 All Rights Reserved"
        style={styles.input}
        value={footerText}
        onChangeText={setFooterText}
        editable={!saving}
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Preferences</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginTop: 15,
  },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
  },
  colorPickerContainer: { marginBottom: 15 },
  colorPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
  },
  colorPreview: { width: 40, height: 40, borderRadius: 5, marginRight: 10 },
  colorInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  previewContainer: { marginBottom: 15 },
  previewLabel: { fontSize: 12, color: '#666', marginBottom: 8 },
  urlPreview: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  previewText: { flex: 1, marginLeft: 10, color: '#666', fontSize: 12 },
  button: {
    backgroundColor: '#1a73e8',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
```

---

## Integration Points

### Add to routes in `app/_layout.tsx`:
```typescript
<Stack.Screen name="school_preferences" />
```

### Add to tab navigation or drawer menu:
```typescript
<TouchableOpacity onPress={() => router.push('/school_preferences')}>
  <Text>School Preferences</Text>
</TouchableOpacity>
```

---

## Key Points

1. **Always check selectedSchool** - All features depend on a selected school
2. **Use useFocusEffect** - Reloads data when screen comes into focus
3. **Handle loading states** - Show ActivityIndicator while fetching
4. **Validate inputs** - Check required fields before submitting
5. **Show error alerts** - Always inform user of success/failure
6. **Reset forms** - Clear inputs after successful submission

---

Ready to copy & paste! 🎉
