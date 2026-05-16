import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Chip } from './Common';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

export type TagSuggestion = string | {
  value: string;
  label: string;
};

export default function TagInput({
  tags,
  onChange,
  suggestions,
  placeholder = 'Type or select food preferences...',
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: TagSuggestion[];
  placeholder?: string;
}) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [value, setValue] = useState('');
  const getSuggestionValue = (suggestion: TagSuggestion) =>
    typeof suggestion === 'string' ? suggestion : suggestion.value;
  const getSuggestionLabel = (suggestion: TagSuggestion) =>
    typeof suggestion === 'string' ? suggestion : suggestion.label;
  const getTagLabel = (tag: string) => {
    const match = suggestions.find(
      (suggestion) => getSuggestionValue(suggestion) === tag
    );

    return match ? getSuggestionLabel(match) : tag;
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setValue('');
  };
  const removeTag = (tag: string) => onChange(tags.filter((item) => item !== tag));

  return (
    <View>
      {tags.length > 0 && (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Pressable key={tag} onPress={() => removeTag(tag)} style={styles.tag}>
              <Text style={styles.tagText}>{getTagLabel(tag)}</Text>
              <Ionicons name="close" size={12} color="white" />
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.muted}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={() => addTag(value)}
        />
        <Pressable onPress={() => addTag(value)} style={styles.addButton}>
          <Ionicons name="add" size={20} color="white" />
        </Pressable>
      </View>
      <View style={styles.suggestions}>
        {suggestions.map((suggestion) => {
          const suggestionValue = getSuggestionValue(suggestion);
          const selected = tags.includes(suggestionValue);

          return (
            <Chip
              key={suggestionValue}
              label={getSuggestionLabel(suggestion)}
              selected={selected}
              onPress={() => (selected ? removeTag(suggestionValue) : addTag(suggestionValue))}
            />
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: themeColors.primaryDark, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99, marginRight: 8, marginBottom: 8 },
  tagText: { color: 'white', fontWeight: '700', fontSize: 12 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: themeColors.surfaceAlt, borderRadius: 16, paddingHorizontal: 14, minHeight: 46, color: themeColors.text },
  addButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: themeColors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
});
