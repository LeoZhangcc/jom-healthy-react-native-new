import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeName = 'classic' | 'light' | 'green';

export type ThemeColors = {
  bg: string;
  card: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  text: string;
  muted: string;
  border: string;
  danger: string;
  warning: string;
  blue: string;
  purple: string;
  orange: string;
  success: string;
  headerText: string;
  headerSubtext: string;
  overlay: string;
  shadow: string;
};

export type AppTheme = {
  key: ThemeName;
  displayName: string;
  description: string;
  colors: ThemeColors;
};

const STORAGE_KEY = 'JOMHEALTHY_APP_THEME_V2';

export const themes: Record<ThemeName, AppTheme> = {
  classic: {
    key: 'classic',
    displayName: 'Classic Green',
    description: 'Original JomHealthy green style',
    colors: {
      bg: '#F7F9F8',
      card: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceAlt: '#F3F7F4',
      primary: '#4CAF7A',
      primaryDark: '#31A84F',
      primaryLight: '#E8F5E9',
      text: '#1F2937',
      muted: '#6B7280',
      border: '#E5E7EB',
      danger: '#DC2626',
      warning: '#F59E0B',
      blue: '#3B82F6',
      purple: '#8B5CF6',
      orange: '#F97316',
      success: '#18C37E',
      headerText: '#FFFFFF',
      headerSubtext: 'rgba(255,255,255,0.92)',
      overlay: 'rgba(247,249,248,0.62)',
      shadow: '#000000',
    },
  },
  light: {
    key: 'light',
    displayName: 'Light Editorial',
    description: 'Soft light cards with navy and teal highlights',
    colors: {
      bg: '#F5F8FA',
      card: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceAlt: '#EEF4F6',
      primary: '#14205B',
      primaryDark: '#0D6B76',
      primaryLight: '#DCE8EC',
      text: '#281519',
      muted: '#64748B',
      border: '#D3D8E0',
      danger: '#EF4444',
      warning: '#B45309',
      blue: '#3B82F6',
      purple: '#8B5CF6',
      orange: '#BB4D00',
      success: '#10B981',
      headerText: '#FFFFFF',
      headerSubtext: 'rgba(255,255,255,0.92)',
      overlay: 'rgba(238,244,246,0.68)',
      shadow: '#14205B',
    },
  },
  green: {
    key: 'green',
    displayName: 'Fresh Green',
    description: 'Rounded forest-green editorial style',
    colors: {
      bg: '#F4F6F4',
      card: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceAlt: '#EFF7F1',
      primary: '#3BA76D',
      primaryDark: '#216B48',
      primaryLight: '#E6F5EB',
      text: '#173B29',
      muted: '#64748B',
      border: '#DDEEE4',
      danger: '#B91C1C',
      warning: '#F39B5F',
      blue: '#3B82F6',
      purple: '#8B5CF6',
      orange: '#F97316',
      success: '#22C55E',
      headerText: '#FFFFFF',
      headerSubtext: 'rgba(255,255,255,0.92)',
      overlay: 'rgba(239,247,241,0.68)',
      shadow: '#173B29',
    },
  },
};

type ThemeContextValue = {
  themeName: ThemeName;
  theme: AppTheme;
  themes: Record<ThemeName, AppTheme>;
  setThemeName: (themeName: ThemeName) => void;
  toggleTheme: () => void;
  isThemeLoaded: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_ORDER: ThemeName[] = ['classic', 'light', 'green'];

function normalizeThemeName(value?: string | null): ThemeName {
  if (value === 'classic' || value === 'light' || value === 'green') {
    return value;
  }
  return 'light';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeName, setThemeNameState] = useState<ThemeName>('light');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && stored) {
          setThemeNameState(normalizeThemeName(stored));
        }
      } catch (error) {
        console.log('Load app theme failed:', error);
      } finally {
        if (mounted) setIsThemeLoaded(true);
      }
    };

    loadTheme();

    return () => {
      mounted = false;
    };
  }, []);

  const setThemeName = useCallback((nextThemeName: ThemeName) => {
    const normalized = normalizeThemeName(nextThemeName);
    setThemeNameState(normalized);
    AsyncStorage.setItem(STORAGE_KEY, normalized).catch((error) => {
      console.log('Save app theme failed:', error);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const currentIndex = THEME_ORDER.indexOf(themeName);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % THEME_ORDER.length : 0;
    setThemeName(THEME_ORDER[nextIndex]);
  }, [setThemeName, themeName]);

  const value = useMemo<ThemeContextValue>(() => ({
    themeName,
    theme: themes[themeName],
    themes,
    setThemeName,
    toggleTheme,
    isThemeLoaded,
  }), [isThemeLoaded, setThemeName, themeName, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
