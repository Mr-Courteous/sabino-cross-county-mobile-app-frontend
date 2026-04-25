import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/design-system';
import { CustomButton } from './custom-button';
import { useAppColors } from '@/hooks/use-app-colors';
import { ThemedText } from './themed-text';

interface Subject {
  id: number;
  name: string;
  category?: string;
  education_level?: string;
}

interface BulkSubjectSelectorProps {
  visible: boolean;
  subjects: Subject[];
  selectedSubjectIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  onConfirm: (selectedSubjects: Subject[]) => void;
  onCancel: () => void;
  loading?: boolean;
  classId?: number;
  sessionName?: string;
  term?: number;
}

export const BulkSubjectSelector: React.FC<BulkSubjectSelectorProps> = ({
  visible,
  subjects,
  selectedSubjectIds,
  onSelectionChange,
  onConfirm,
  onCancel,
  loading = false,
  classId,
  sessionName,
  term,
}) => {
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);
  const [searchQuery, setSearchQuery] = useState('');
  const [initializing, setInitializing] = useState(false);

  const filteredSubjects = searchQuery
    ? subjects.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : subjects;

  const toggleSubject = useCallback((subjectId: number) => {
    if (selectedSubjectIds.includes(subjectId)) {
      onSelectionChange(selectedSubjectIds.filter(id => id !== subjectId));
    } else {
      onSelectionChange([...selectedSubjectIds, subjectId]);
    }
  }, [selectedSubjectIds, onSelectionChange]);

  const handleConfirm = useCallback(() => {
    setInitializing(true);
    const selectedSubjects = subjects.filter(s => selectedSubjectIds.includes(s.id));
    onConfirm(selectedSubjects);
    setTimeout(() => setInitializing(false), 1000);
  }, [selectedSubjectIds, subjects, onConfirm]);

  const handleSelectAll = useCallback(() => {
    if (selectedSubjectIds.length === filteredSubjects.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredSubjects.map(s => s.id));
    }
  }, [filteredSubjects, selectedSubjectIds, onSelectionChange]);

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Ionicons name="close" size={28} color={Colors.accent.gold} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Add Subjects in Bulk</ThemedText>
          <View style={{ width: 28 }} />
        </View>

        {classId && sessionName && term && (
          <View style={styles.contextInfo}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.accent.gold} />
            <ThemedText style={styles.contextText}>
              Class • Term {term} • {sessionName}
            </ThemedText>
          </View>
        )}

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects..."
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={C.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Select All */}
        <View style={styles.selectAllContainer}>
          <TouchableOpacity
            style={[
              styles.selectAllButton,
              selectedSubjectIds.length > 0 && styles.selectAllButtonActive,
            ]}
            onPress={handleSelectAll}
          >
            <Ionicons
              name={
                selectedSubjectIds.length === filteredSubjects.length && filteredSubjects.length > 0
                  ? 'checkbox'
                  : 'square-outline'
              }
              size={20}
              color={
                selectedSubjectIds.length > 0 ? Colors.accent.gold : C.textMuted
              }
            />
            <ThemedText style={styles.selectAllText}>
              {selectedSubjectIds.length === filteredSubjects.length && filteredSubjects.length > 0
                ? `All Selected (${selectedSubjectIds.length})`
                : `Select All (${filteredSubjects.length})`}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Subject List */}
        <FlatList
          data={filteredSubjects}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => {
            const isSelected = selectedSubjectIds.includes(item.id);
            return (
              <TouchableOpacity
                style={[styles.subjectItem, isSelected && styles.subjectItemSelected]}
                onPress={() => toggleSubject(item.id)}
              >
                <View style={styles.checkboxContainer}>
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={isSelected ? Colors.accent.gold : C.textMuted}
                  />
                </View>
                <View style={styles.subjectInfo}>
                  <ThemedText style={styles.subjectName}>{item.name}</ThemedText>
                  {item.category && (
                    <ThemedText style={styles.subjectCategory}>{item.category}</ThemedText>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          style={styles.subjectList}
          scrollEnabled={true}
        />

        {/* Summary & Actions */}
        <View style={styles.footer}>
          <View style={styles.summary}>
            <ThemedText style={styles.summaryText}>
              {selectedSubjectIds.length === 0
                ? 'Select subjects to add'
                : `${selectedSubjectIds.length} subject${selectedSubjectIds.length !== 1 ? 's' : ''} selected`}
            </ThemedText>
          </View>

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <CustomButton
                title="Cancel"
                onPress={onCancel}
                variant="outline"
              />
            </View>
            <View style={{ flex: 2 }}>
              <CustomButton
                title={initializing ? 'Initializing...' : `Initialize (${selectedSubjectIds.length})`}
                onPress={handleConfirm}
                variant="premium"
                disabled={selectedSubjectIds.length === 0 || loading || initializing}
              />
            </View>
          </View>
        </View>

        {(loading || initializing) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.accent.gold} />
            <ThemedText style={styles.loadingText}>
              {initializing ? 'Initializing subjects...' : 'Loading...'}
            </ThemedText>
          </View>
        )}
      </View>
    </Modal>
  );
};

const makeStyles = (C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  headerTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
    textAlign: 'center',
  },
  contextInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(250,204,21,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.3)',
  },
  contextText: {
    color: Colors.accent.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 24,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: C.inputBorder,
    height: 46,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    color: C.inputText,
    fontSize: 14,
  },
  selectAllContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  selectAllButtonActive: {
    backgroundColor: 'rgba(250,204,21,0.1)',
    borderColor: 'rgba(250,204,21,0.3)',
  },
  selectAllText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
  },
  subjectList: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  subjectItemSelected: {
    backgroundColor: 'rgba(250,204,21,0.1)',
    borderColor: 'rgba(250,204,21,0.3)',
  },
  checkboxContainer: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  subjectCategory: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    backgroundColor: C.modalBg,
    gap: 12,
  },
  summary: {
    paddingVertical: 8,
  },
  summaryText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.accent.gold,
    fontSize: 14,
    fontWeight: '700',
  },
});
