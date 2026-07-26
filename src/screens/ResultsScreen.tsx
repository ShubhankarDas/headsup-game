import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii } from '../theme/theme';
import { PressedButton } from '../components/PressedButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export function ResultsScreen({ navigation, route }: Props) {
  const { playerCount, categoryId, durationSeconds, results } = route.params;
  const correctCount = results.filter((r) => r.correct).length;

  const handleShare = () => {
    Share.share({
      message: `I scored ${correctCount}/${results.length} in Heads Up!`,
    });
  };

  const handlePlayAgain = () => {
    // navigation.navigate would push a new CategorySelect on top of the
    // existing one (React Navigation v7 no longer collapses back to an
    // existing screen by default), leaving stale Results/Countdown/Gameplay
    // entries reachable via back. Reset the stack instead so Play Again
    // always lands on a clean [Home, CategorySelect] history.
    navigation.reset({
      index: 1,
      routes: [{ name: 'Home' }, { name: 'CategorySelect', params: { playerCount } }],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>time&apos;s up!</Text>
        </View>
        <Text style={styles.score}>
          {correctCount}
          <Text style={styles.scoreSub}>/{results.length} words</Text>
        </Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {results.map((item, index) => (
          <View key={`${item.word}-${index}`} style={[styles.item, !item.correct && styles.itemPass]}>
            <Text style={styles.itemWord}>{item.word}</Text>
            <MaterialCommunityIcons
              name={item.correct ? 'check' : 'close'}
              size={18}
              color={item.correct ? colors.lime : colors.coral}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <PressedButton variant="secondary" onPress={handleShare} style={styles.actionButton}>
          Share
        </PressedButton>
        <PressedButton variant="primary" onPress={handlePlayAgain} style={styles.actionButton}>
          Play again
        </PressedButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
  },
  tag: {
    backgroundColor: colors.sun,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    transform: [{ rotate: '-3deg' }],
    marginBottom: 10,
  },
  tagText: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    color: colors.ink,
  },
  score: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 56,
    textAlign: 'center',
    color: colors.cloud,
    lineHeight: 70,
    paddingTop: 6,
  },
  scoreSub: {
    fontSize: 20,
    color: colors.mutedText,
    fontFamily: fonts.bodySemiBold,
  },
  list: {
    flex: 1,
    marginVertical: 18,
  },
  listContent: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  itemPass: {
    opacity: 0.6,
  },
  itemWord: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.cloud,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
});
