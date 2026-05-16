import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

export default function LanguageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { language, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const languages = [
    { code: 'en' as const, label: 'English', short: 'EN' },
    { code: 'zh' as const, label: '中文', short: 'ZH' },
    { code: 'ms' as const, label: 'Bahasa Melayu', short: 'MS' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.menu} onPress={(event) => event.stopPropagation()}>
          {languages.map((item) => {
            const active = item.code === language;
            return (
              <Pressable
                key={item.code}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => {
                  setLanguage(item.code);
                  onClose();
                }}
              >
                <Text style={[styles.short, active && styles.activeText]}>{item.short}</Text>
                <Text style={[styles.label, active && styles.activeText]}>{item.label}</Text>
                {active ? <Ionicons name="checkmark" size={18} color="white" /> : <View style={{ width: 18 }} />}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (themeColors: typeof colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: themeColors.overlay,
    alignItems: 'flex-end',
    paddingTop: 72,
    paddingRight: 18,
  },
  menu: {
    width: 210,
    backgroundColor: themeColors.card,
    borderRadius: 22,
    padding: 8,
    shadowColor: themeColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  option: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionActive: {
    backgroundColor: themeColors.primaryDark,
  },
  short: {
    width: 30,
    color: themeColors.primaryDark,
    fontWeight: '900',
  },
  label: {
    flex: 1,
    color: themeColors.text,
    fontWeight: '800',
  },
  activeText: {
    color: 'white',
  },
});
