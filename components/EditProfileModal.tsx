import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    Image,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { useAppColors } from '@/hooks/use-app-colors';

const { width } = Dimensions.get('window');

interface StudentData {
    id: number;
    school_id: number;
    first_name: string;
    last_name: string;
    email: string;
    registration_number: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    photo?: string;
}

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    student: StudentData;
    onUpdate: (updatedStudent: StudentData) => void;
}

export default function EditProfileModal({ visible, onClose, student, onUpdate }: EditProfileModalProps) {
    const C = useAppColors();
    const styles = useMemo(() => makeStyles(C), [C.scheme]);

    const [form, setForm] = useState({
        firstName: student.first_name,
        lastName: student.last_name,
        phone: student.phone || '',
        dateOfBirth: student.date_of_birth || '',
        gender: student.gender || 'Male',
        photo: student.photo || null as string | null
    });
    const [dobParts, setDobParts] = useState({
        year: '',
        month: '',
        day: ''
    });
    const [selectedImage, setSelectedImage] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let year = '', month = '', day = '';
        if (student.date_of_birth) {
            // Handle both YYYY-MM-DD and YYYY-MM-DDTHH:mm:ss.sssZ formats
            const dateOnly = student.date_of_birth.split('T')[0];
            const parts = dateOnly.split('-');
            year = parts[0] || '';
            month = parts[1] || '';
            day = parts[2] || '';
            
            // Ensure padding matches the arrays in the UI (e.g., '01' instead of '1')
            if (month && month.length === 1) month = '0' + month;
            if (day && day.length === 1) day = '0' + day;
        }

        setDobParts({ year, month, day });
        setForm({
            firstName: student.first_name,
            lastName: student.last_name,
            phone: student.phone || '',
            dateOfBirth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
            gender: student.gender || 'Male',
            photo: student.photo || null
        });
        setError(null);
        setSelectedImage(null);
    }, [student, visible]);

    const handlePickImage = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setSelectedImage(asset);
                setForm({ ...form, photo: asset.uri });
            }
        } catch (err) {
            setError('Failed to pick image');
        }
    };

    const handleSave = async () => {
        setError(null);
        if (!form.firstName.trim() || !form.lastName.trim()) {
            setError('First and last names are required');
            return;
        }

        const { year, month, day } = dobParts;
        let finalDob = form.dateOfBirth;
        if (year && month && day) {
            finalDob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        setLoading(true);
        try {
            const token = Platform.OS === 'web'
                ? localStorage.getItem('studentToken')
                : await SecureStore.getItemAsync('studentToken');

            const formData = new FormData();
            formData.append('firstName', form.firstName.trim());
            formData.append('lastName', form.lastName.trim());
            formData.append('phone', form.phone);
            formData.append('dateOfBirth', finalDob);
            formData.append('gender', form.gender);

            if (selectedImage) {
                if (Platform.OS === 'web') {
                    const fileToUpload = (selectedImage as any).file || selectedImage;
                    formData.append('photo', fileToUpload);
                } else {
                    formData.append('photo', {
                        uri: selectedImage.uri,
                        name: selectedImage.name || 'profile.jpg',
                        type: selectedImage.mimeType || 'image/jpeg',
                    } as any);
                }
            } else if (form.photo && typeof form.photo === 'string' && !form.photo.startsWith('blob:')) {
                formData.append('photo', form.photo);
            }

            const response = await fetch(`${API_BASE_URL}/api/students/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                const updatedStudent = { ...student, ...data.data };
                if (Platform.OS === 'web') {
                    localStorage.setItem('studentData', JSON.stringify(updatedStudent));
                } else {
                    await SecureStore.setItemAsync('studentData', JSON.stringify(updatedStudent));
                }
                onUpdate(updatedStudent);
                Alert.alert('Success', 'Profile updated successfully');
                onClose();
            } else {
                setError(data.error || 'Failed to update profile');
            }
        } catch (err: any) {
            console.error('Update Profile Error:', err);
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const years = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - 5 - i));
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={C.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {error && (
                        <View style={styles.errorBanner}>
                            <Ionicons name="alert-circle" size={20} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* Photo Selection */}
                        <View style={styles.photoSection}>
                            <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
                                {form.photo ? (
                                    <Image source={{ uri: form.photo }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {form.firstName ? form.firstName[0] : ''}{form.lastName ? form.lastName[0] : ''}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.editIconBadge}>
                                    <Ionicons name="camera" size={16} color={C.scheme === 'dark' ? '#0F172A' : '#FFFFFF'} />
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.photoInfo}>Tap to change photo</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>FIRST NAME</Text>
                            <TextInput 
                                style={styles.input} 
                                value={form.firstName} 
                                onChangeText={(t) => setForm({ ...form, firstName: t })} 
                                placeholder="Enter first name"
                                placeholderTextColor={C.textSecondary + '80'}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>LAST NAME</Text>
                            <TextInput 
                                style={styles.input} 
                                value={form.lastName} 
                                onChangeText={(t) => setForm({ ...form, lastName: t })} 
                                placeholder="Enter last name"
                                placeholderTextColor={C.textSecondary + '80'}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>PHONE NUMBER</Text>
                            <TextInput 
                                style={styles.input} 
                                value={form.phone} 
                                onChangeText={(t) => setForm({ ...form, phone: t })} 
                                placeholder="Enter phone number"
                                keyboardType="phone-pad"
                                placeholderTextColor={C.textSecondary + '80'}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>GENDER</Text>
                            <View style={styles.genderRow}>
                                {['Male', 'Female'].map((g) => (
                                    <TouchableOpacity 
                                        key={g}
                                        style={[styles.genderBtn, form.gender === g && styles.activeGender]} 
                                        onPress={() => setForm({...form, gender: g})}
                                    >
                                        <Text style={[styles.genderText, form.gender === g && styles.activeGenderText]}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>DATE OF BIRTH (YEAR - MONTH - DAY)</Text>
                            <View style={styles.dobRow}>
                                <View style={styles.dobPart}>
                                    <ScrollView style={styles.dobScroll} nestedScrollEnabled>
                                        {years.map(y => (
                                            <TouchableOpacity 
                                                key={y} 
                                                style={[styles.dobItem, dobParts.year === y && styles.activeDobItem]}
                                                onPress={() => setDobParts({...dobParts, year: y})}
                                            >
                                                <Text style={[styles.dobItemText, dobParts.year === y && styles.activeDobItemText]}>{y}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                <View style={styles.dobPart}>
                                    <ScrollView style={styles.dobScroll} nestedScrollEnabled>
                                        {months.map(m => (
                                            <TouchableOpacity 
                                                key={m} 
                                                style={[styles.dobItem, dobParts.month === m && styles.activeDobItem]}
                                                onPress={() => setDobParts({...dobParts, month: m})}
                                            >
                                                <Text style={[styles.dobItemText, dobParts.month === m && styles.activeDobItemText]}>{m}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                <View style={styles.dobPart}>
                                    <ScrollView style={styles.dobScroll} nestedScrollEnabled>
                                        {days.map(d => (
                                            <TouchableOpacity 
                                                key={d} 
                                                style={[styles.dobItem, dobParts.day === d && styles.activeDobItem]}
                                                onPress={() => setDobParts({...dobParts, day: d})}
                                            >
                                                <Text style={[styles.dobItemText, dobParts.day === d && styles.activeDobItemText]}>{d}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.saveButton, loading && styles.disabledButton]} 
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={C.scheme === 'dark' ? '#0F172A' : '#FFFFFF'} />
                            ) : (
                                <Text style={styles.saveButtonText}>Update Profile</Text>
                            )}
                        </TouchableOpacity>
                        
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const makeStyles = (C: any) => StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: C.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '85%',
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: C.text,
    },
    closeButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: C.textSecondary + '10',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    photoSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: C.primary,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: C.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: C.card,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0F172A',
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: C.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: C.card,
    },
    photoInfo: {
        marginTop: 12,
        color: C.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: '900',
        color: C.textSecondary,
        marginBottom: 8,
        letterSpacing: 1,
        opacity: 0.7,
    },
    input: {
        backgroundColor: C.scheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 16,
        color: C.text,
        fontSize: 16,
    },
    genderRow: {
        flexDirection: 'row',
        gap: 12,
    },
    genderBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        backgroundColor: C.scheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: C.border,
    },
    activeGender: {
        backgroundColor: C.primary + '15',
        borderColor: C.primary,
    },
    genderText: {
        color: C.textSecondary,
        fontWeight: '700',
    },
    activeGenderText: {
        color: C.primary,
    },
    dobRow: {
        flexDirection: 'row',
        gap: 10,
        height: 150,
    },
    dobPart: {
        flex: 1,
        backgroundColor: C.scheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
    },
    dobScroll: {
        flex: 1,
    },
    dobItem: {
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: C.border + '30',
    },
    activeDobItem: {
        backgroundColor: C.scheme === 'dark' ? C.primary : '#0F172A',
    },
    dobItemText: {
        color: C.text,
        fontSize: 14,
        fontWeight: '600',
    },
    activeDobItemText: {
        color: C.scheme === 'dark' ? '#0F172A' : '#FFFFFF',
        fontWeight: '900',
    },
    saveButton: {
        backgroundColor: C.primary,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    saveButtonText: {
        color: '#0F172A',
        fontSize: 18,
        fontWeight: '900',
    },
    disabledButton: {
        opacity: 0.6,
    },
});
