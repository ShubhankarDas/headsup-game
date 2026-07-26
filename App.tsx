import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { RootNavigator } from './src/navigation/RootNavigator';
import { CategoriesProvider } from './src/data/CategoriesContext';
import { colors } from './src/theme/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    SpaceMono_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.ink }} />;
  }

  return (
    <SafeAreaProvider>
      <CategoriesProvider>
        <RootNavigator />
      </CategoriesProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
