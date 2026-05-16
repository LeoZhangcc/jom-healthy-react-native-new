import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ChildProfileProvider } from './src/context/ChildProfileContext';
import { PhysicalActivityProvider } from './src/context/PhysicalActivityContext';
import RootNavigator from './src/navigation/RootNavigator';

function AppContent() {
  const { themeName } = useTheme();

  return (
    <LanguageProvider>
      <ChildProfileProvider>
        <PhysicalActivityProvider>
          <RootNavigator />
          <StatusBar style={themeName === 'classic' ? 'light' : 'dark'} />
        </PhysicalActivityProvider>
      </ChildProfileProvider>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
