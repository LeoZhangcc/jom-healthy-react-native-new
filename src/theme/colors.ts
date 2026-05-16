import { themes } from '../context/ThemeContext';

// Legacy fallback palette for files that have not yet been themed inline.
// The app now reads the active palette from ThemeContext at runtime.
export const colors = themes.classic.colors;
