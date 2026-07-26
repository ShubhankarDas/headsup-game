import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { CategorySelectScreen } from '../screens/CategorySelectScreen';
import { CountdownScreen } from '../screens/CountdownScreen';
import { GameplayScreen } from '../screens/GameplayScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.ink },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CategorySelect" component={CategorySelectScreen} />
        <Stack.Screen name="Countdown" component={CountdownScreen} />
        <Stack.Screen name="Gameplay" component={GameplayScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
