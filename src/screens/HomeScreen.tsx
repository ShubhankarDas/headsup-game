import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii } from '../theme/theme';
import { PressedButton } from '../components/PressedButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const PLAYER_OPTIONS = [2, 3, 4, 5] as const;

export function HomeScreen({ navigation }: Props) {
  const [playerCount, setPlayerCount] = useState<number>(3);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <View style={styles.logoMark}>
          <MaterialCommunityIcons name="crosshairs-gps" size={36} color={colors.ink} style={styles.logoIcon} />
        </View>
        <Text style={styles.title}>
          HEADS <Text style={styles.titleAccent}>UP!</Text>
        </Text>
        <Text style={styles.subtitle}>Guess the word on your forehead before time runs out</Text>
      </View>

      <View style={styles.mid}>
        <View style={styles.pillRow}>
          {PLAYER_OPTIONS.map((count) => (
            <Pressable
              key={count}
              onPress={() => setPlayerCount(count)}
              style={[styles.pill, playerCount === count && styles.pillActive]}
            >
              <Text style={styles.pillLabel}>{count === 5 ? '5+' : count}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <PressedButton
          variant="primary"
          onPress={() => navigation.navigate('CategorySelect', { playerCount })}
        >
          Start game
        </PressedButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingHorizontal: 24,
    paddingTop: 24,
    justifyContent: 'space-between',
  },
  top: {
    alignItems: 'center',
  },
  logoMark: {
    width: 72,
    height: 72,
    backgroundColor: colors.sun,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
    borderWidth: 4,
    borderColor: colors.ink,
    marginBottom: 18,
  },
  logoIcon: {
    fontSize: 32,
    transform: [{ rotate: '6deg' }],
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 34,
    lineHeight: 44,
    paddingTop: 4,
    textAlign: 'center',
    color: colors.cloud,
  },
  titleAccent: {
    color: colors.sun,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 240,
  },
  mid: {
    width: '100%',
    alignItems: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.ink2,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.grape,
    borderColor: colors.sun,
  },
  pillLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.cloud,
  },
  bottom: {
    width: '100%',
  },
});
