import React, { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { AppTheme, useTheme } from '../context/ThemeContext';

function useCommonStyles() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  return { styles, theme };
}

export function Screen({
  children,
  padded = true,
  scrollRef,
}: PropsWithChildren<{ padded?: boolean; scrollRef?: React.RefObject<ScrollView | null> }>) {
  const { styles } = useCommonStyles();
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={[styles.content, padded && styles.padded]}
    >
      {children}
    </ScrollView>
  );
}

export function Header({
  title,
  subtitle,
  icon,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { styles, theme } = useCommonStyles();
  const isEditorial = theme.key !== 'classic';

  if (isEditorial) {
    return (
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
        <View style={styles.headerBubbleLarge} />
        <View style={styles.headerBubbleSmall} />
        <View style={styles.headerBubbleOutline} />

        <View style={styles.editorialHeaderRow}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [styles.headerActionCircle, pressed && styles.pressed]}
            >
              <Ionicons name="arrow-back" size={20} color={theme.colors.primaryDark} />
            </Pressable>
          ) : null}

          <View style={styles.editorialTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={2}>{title}</Text>
            {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
          </View>

          {right ? (
            <View style={styles.headerRightSlot}>{right}</View>
          ) : icon ? (
            <View style={styles.headerActionCircle}>
              <Ionicons name={icon} size={22} color={theme.colors.primaryDark} />
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
      <View style={styles.headerGlowOne} />
      <View style={styles.headerGlowTwo} />
      <View style={styles.headerRow}>
        {onBack ? (
          <IconButton icon="arrow-back" onPress={onBack} tone="light" />
        ) : icon ? (
          <Ionicons name={icon} size={24} color={theme.colors.headerText} />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { styles } = useCommonStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  icon,
  loading,
  style,
}: {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles } = useCommonStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color="white" /> : icon ? <Ionicons name={icon} size={18} color="white" /> : null}
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  icon,
  style,
}: {
  title: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const { styles, theme } = useCommonStyles();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, style]}>
      {icon ? <Ionicons name={icon} size={18} color={theme.colors.primaryDark} /> : null}
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  tone = 'default',
  size = 42,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  tone?: 'default' | 'light' | 'danger';
  size?: number;
}) {
  const { styles, theme } = useCommonStyles();
  const color = tone === 'light' ? 'white' : tone === 'danger' ? theme.colors.danger : theme.colors.primaryDark;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        tone === 'light' && styles.iconButtonLight,
        tone === 'danger' && styles.iconButtonDanger,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={Math.floor(size * 0.48)} color={color} />
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { styles, theme } = useCommonStyles();
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      {icon ? <Ionicons name={icon} size={14} color={selected ? 'white' : theme.colors.primaryDark} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ emoji, title, subtitle, action }: { emoji: string; title: string; subtitle: string; action?: React.ReactNode }) {
  const { styles } = useCommonStyles();

  return (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      {action}
    </Card>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { styles } = useCommonStyles();
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

const createStyles = (theme: AppTheme) => {
  const themeColors = theme.colors;
  const isEditorial = theme.key !== 'classic';

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: isEditorial ? themeColors.surfaceAlt : themeColors.bg,
    },
    content: { paddingBottom: 28 },
    padded: { paddingHorizontal: 20 },

    header: isEditorial
      ? {
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: themeColors.primaryLight,
          paddingHorizontal: 20,
          paddingBottom: 24,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
        }
      : {
          backgroundColor: themeColors.primary,
          paddingHorizontal: 20,
          paddingBottom: 26,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          overflow: 'hidden',
        },
    headerGlowOne: {
      position: 'absolute',
      width: 170,
      height: 170,
      borderRadius: 85,
      backgroundColor: 'rgba(255,255,255,0.12)',
      left: -50,
      top: -20,
    },
    headerGlowTwo: {
      position: 'absolute',
      width: 130,
      height: 130,
      borderRadius: 65,
      backgroundColor: 'rgba(255,255,255,0.08)',
      right: -20,
      bottom: -10,
    },
    headerBubbleLarge: {
      position: 'absolute',
      width: 210,
      height: 210,
      borderRadius: 105,
      backgroundColor: 'rgba(255,255,255,0.40)',
      right: -60,
      top: -66,
    },
    headerBubbleSmall: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.26)',
      left: -44,
      bottom: -64,
    },
    headerBubbleOutline: {
      position: 'absolute',
      width: 108,
      height: 108,
      borderRadius: 54,
      borderWidth: 1.5,
      borderColor: theme.key === 'green' ? 'rgba(38,122,77,0.16)' : 'rgba(13,107,118,0.14)',
      right: 26,
      bottom: -28,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 1 },
    editorialHeaderRow: {
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      zIndex: 1,
    },
    editorialTitleWrap: { flex: 1, minWidth: 0 },
    headerRightSlot: { alignItems: 'center', justifyContent: 'center' },
    headerActionCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: themeColors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    headerTitle: isEditorial
      ? {
          color: themeColors.text,
          fontSize: 34,
          lineHeight: 40,
          fontWeight: '900',
          letterSpacing: -0.6,
        }
      : { color: themeColors.headerText, fontSize: 28, fontWeight: '700' },
    headerSubtitle: isEditorial
      ? {
          marginTop: 4,
          color: themeColors.muted,
          fontSize: 16,
          lineHeight: 22,
          fontWeight: '600',
        }
      : { color: themeColors.headerSubtext, marginTop: 5, fontSize: 14 },

    card: isEditorial
      ? {
          backgroundColor: themeColors.card,
          borderRadius: 30,
          padding: 20,
          borderWidth: 1,
          borderColor: themeColors.border,
          shadowColor: themeColors.shadow,
          shadowOpacity: 0.08,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 3,
        }
      : {
          backgroundColor: themeColors.card,
          borderRadius: 24,
          padding: 18,
          shadowColor: themeColors.shadow,
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 3,
        },
    primaryButton: {
      minHeight: 48,
      borderRadius: isEditorial ? 999 : 18,
      paddingHorizontal: 18,
      backgroundColor: themeColors.primaryDark,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryButtonText: { color: 'white', fontWeight: '800', fontSize: 15 },
    secondaryButton: {
      minHeight: 46,
      borderRadius: isEditorial ? 999 : 18,
      paddingHorizontal: 16,
      backgroundColor: themeColors.primaryLight,
      borderWidth: isEditorial ? 1 : 0,
      borderColor: isEditorial ? themeColors.border : 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    secondaryButtonText: { color: themeColors.primaryDark, fontWeight: '800', fontSize: 14 },
    disabledButton: { opacity: 0.45 },
    pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
    iconButton: {
      backgroundColor: themeColors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: isEditorial ? 1 : 0,
      borderColor: isEditorial ? themeColors.border : 'transparent',
    },
    iconButtonLight: { backgroundColor: 'rgba(255,255,255,0.20)', borderWidth: 0 },
    iconButtonDanger: { backgroundColor: '#FEE2E2' },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: themeColors.primaryLight,
      borderWidth: isEditorial ? 1 : 0,
      borderColor: isEditorial ? themeColors.border : 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginRight: 8,
      marginBottom: 8,
    },
    chipSelected: { backgroundColor: themeColors.primaryDark, borderColor: themeColors.primaryDark },
    chipText: { color: themeColors.primaryDark, fontWeight: '800', fontSize: 12 },
    chipTextSelected: { color: 'white' },
    emptyCard: { alignItems: 'center', paddingVertical: 36 },
    emptyEmoji: { fontSize: 44, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: themeColors.text, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: themeColors.muted, textAlign: 'center', marginVertical: 14, lineHeight: 20 },
    sectionTitleWrap: { marginTop: 8, marginBottom: 10 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: themeColors.text },
    sectionSubtitle: { color: themeColors.muted, marginTop: 4 },
  });
};

export const commonStyles = createStyles({
  key: 'classic',
  displayName: 'Classic Green',
  description: 'Original JomHealthy green style',
  colors,
});
