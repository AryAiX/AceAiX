import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

export type SelectOption = {
  label: string;
  value: string;
};

type SelectModalProps = {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  searchable?: boolean;
  emptyMessage?: string;
};

export default function SelectModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  searchable = false,
  emptyMessage = 'No options available',
}: SelectModalProps) {
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  function handleClose() {
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={m.backdrop} onPress={handleClose} />
      <View style={m.sheet}>
        <View style={m.header}>
          <Text style={m.title}>{title}</Text>
          <TouchableOpacity accessibilityLabel="Close" onPress={handleClose} hitSlop={8}>
            <X color={Colors.textMuted} size={20} />
          </TouchableOpacity>
        </View>
        {searchable && (
          <TextInput
            accessibilityLabel={`Search ${title}`}
            style={m.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search…"
            placeholderTextColor={Colors.textDisabled}
            autoCapitalize="none"
          />
        )}
        <FlatList
          data={filteredOptions}
          keyExtractor={(item) => item.value}
          style={m.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={m.empty}>{emptyMessage}</Text>}
          renderItem={({ item }) => {
            const active = item.value === selectedValue;
            return (
              <TouchableOpacity
                style={[m.row, active && m.rowActive]}
                onPress={() => {
                  onSelect(item.value);
                  handleClose();
                }}
              >
                <Text style={[m.rowText, active && m.rowTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    maxHeight: '65%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.lg,
    borderTopRightRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  search: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    minHeight: 42,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.elevated,
    paddingHorizontal: Spacing.md,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  list: { marginTop: Spacing.sm },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  row: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 13,
  },
  rowActive: { backgroundColor: `${Colors.primary}15` },
  rowText: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  rowTextActive: {
    fontFamily: Typography.family.bold,
    color: Colors.primary,
  },
});
