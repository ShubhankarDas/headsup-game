import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Countdown'>;

const COUNTDOWN_START = 5;

export function CountdownScreen({ navigation, route }: Props) {
  const { playerCount, categoryId, durationSeconds } = route.params;
  const [count, setCount] = useState(COUNTDOWN_START);

  useKeepAwake();

  useEffect(() => {
    // Already locked landscape by CategorySelectScreen before navigating here;
    // re-asserting is just a safety net if this screen is ever entered directly.
    // No cleanup/unlock on unmount — Gameplay mounts next and owns that lifecycle.
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
  }, []);

  useEffect(() => {
    if (count <= 0) {
      navigation.replace('Gameplay', { playerCount, categoryId, durationSeconds });
      return;
    }
    const timeout = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timeout);
  }, [count, navigation, playerCount, categoryId, durationSeconds]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>Rest the phone on your forehead{'\n'}screen facing the group</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grape,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 96,
    color: colors.cloud,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 12,
  },
});
