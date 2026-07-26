import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import type { RootStackParamList, WordResult } from '../navigation/types';
import { useCategories } from '../data/CategoriesContext';
import { colors, fonts, radii } from '../theme/theme';
import { useTiltDetection } from '../hooks/useTiltDetection';

type Props = NativeStackScreenProps<RootStackParamList, 'Gameplay'>;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export function GameplayScreen({ navigation, route }: Props) {
  const { playerCount, categoryId, durationSeconds } = route.params;
  const { getCategoryById } = useCategories();
  // Category is resolved once on mount: it was guaranteed to exist when the
  // player picked it on CategorySelectScreen, and re-deriving it on every
  // categories-context change would reshuffle the word queue mid-round.
  const category = useMemo(() => getCategoryById(categoryId) ?? { id: categoryId, name: categoryId, icon: 'help-circle', bgColor: '#000', textColor: '#fff', words: [] }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [wordQueue, setWordQueue] = useState<string[]>(() => shuffle(category.words));
  const [wordIndex, setWordIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [results, setResults] = useState<WordResult[]>([]);
  const [roundOver, setRoundOver] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'pass' | null>(null);

  const resultsRef = useRef(results);
  resultsRef.current = results;
  const roundOverRef = useRef(roundOver);
  roundOverRef.current = roundOver;
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  useKeepAwake();

  useEffect(() => {
    // Fixed single-direction lock (not the LANDSCAPE range lock): with the phone
    // held vertically against a forehead, gravity alone can't tell the OS whether
    // it's "landscape left" or "landscape right", so a range lock can flicker
    // between the two — or drift back toward portrait — mid-round.
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const finishRound = useCallback(() => {
    if (roundOverRef.current) return;
    roundOverRef.current = true;
    setRoundOver(true);
    navigation.replace('Results', {
      playerCount,
      categoryId,
      durationSeconds,
      results: resultsRef.current,
    });
  }, [navigation, playerCount, categoryId, durationSeconds]);

  useEffect(() => {
    // Category vanished from the data source (or has no words) between
    // selection and mount — bail out to Results instead of showing a blank
    // word card with nothing to guess.
    if (category.words.length === 0) finishRound();
  }, [category.words.length, finishRound]);

  useEffect(() => {
    if (roundOver) return;
    if (secondsLeft <= 0) {
      finishRound();
      return;
    }
    const timeout = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timeout);
  }, [secondsLeft, roundOver, finishRound]);

  const currentWord = wordQueue[wordIndex];

  const advanceWord = useCallback((correct: boolean) => {
    setResults((prev) => [...prev, { word: currentWord, correct }]);
    setWordIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex >= wordQueue.length) {
        setWordQueue(shuffle(category.words));
        return 0;
      }
      return nextIndex;
    });
  }, [currentWord, wordQueue.length, category.words]);

  const showFeedback = useCallback((type: 'correct' | 'pass') => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(type);
    // Matches useTiltDetection's REFRACTORY_MS, so the visual feedback
    // window and the sensor's "ignore everything" cooldown stay in sync.
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 500);
  }, []);

  const handleCorrect = useCallback(() => {
    if (roundOverRef.current) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    advanceWord(true);
    showFeedback('correct');
  }, [advanceWord, showFeedback]);

  const handlePass = useCallback(() => {
    if (roundOverRef.current) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    advanceWord(false);
    showFeedback('pass');
  }, [advanceWord, showFeedback]);

  useTiltDetection({
    enabled: !roundOver,
    onTiltDown: handleCorrect,
    onTiltUp: handlePass,
  });

  const correctCount = results.filter((r) => r.correct).length;
  const passedCount = results.filter((r) => !r.correct).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Pressable style={styles.closeButton} onPress={finishRound} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={18} color={colors.cloud} />
        </Pressable>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{category.name.toUpperCase()}</Text>
        </View>
        <View style={styles.timer}>
          <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
        </View>
      </View>

      <View style={styles.tiltHint}>
        <MaterialCommunityIcons name="arrow-up-bold" size={14} color="rgba(255,255,255,0.55)" />
        <Text style={styles.tiltHintText}>tilt up to pass</Text>
      </View>

      <View style={styles.wordCard}>
        <Text style={styles.word}>{currentWord}</Text>
        <View style={styles.sticker}>
          <Text style={styles.stickerText}>{results.length + 1} words in</Text>
        </View>
      </View>

      <View style={styles.tiltHint}>
        <MaterialCommunityIcons name="arrow-down-bold" size={14} color="rgba(255,255,255,0.55)" />
        <Text style={styles.tiltHintText}>tilt down when guessed</Text>
      </View>

      <View style={styles.scores}>
        <View style={[styles.scoreBox, { borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.scoreNum, { color: colors.lime }]}>{correctCount}</Text>
          <Text style={styles.scoreLabel}>correct</Text>
        </View>
        <View style={[styles.scoreBox, { borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.scoreNum, { color: colors.coral }]}>{passedCount}</Text>
          <Text style={styles.scoreLabel}>passed</Text>
        </View>
      </View>

      {feedback ? (
        <View
          style={[
            styles.feedbackOverlay,
            { backgroundColor: feedback === 'correct' ? colors.lime : colors.passBlue },
          ]}
        >
          <Text
            style={[
              styles.feedbackText,
              { color: feedback === 'correct' ? colors.ink : colors.cloud },
            ]}
          >
            {feedback === 'correct' ? 'Correct' : 'Pass'}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grape,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    color: colors.sun,
    letterSpacing: 0.5,
  },
  timer: {
    backgroundColor: colors.coral,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  timerText: {
    fontFamily: fonts.mono,
    fontSize: 20,
    color: '#fff',
  },
  tiltHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tiltHintText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  wordCard: {
    backgroundColor: colors.cloud,
    borderRadius: radii.xl,
    borderWidth: 5,
    borderStyle: 'dashed',
    borderColor: colors.ink,
    flex: 1,
    marginVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-1.5deg' }],
  },
  word: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 40,
    color: colors.ink,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  sticker: {
    position: 'absolute',
    bottom: 14,
    right: 18,
    backgroundColor: colors.sun,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    transform: [{ rotate: '5deg' }],
  },
  stickerText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.ink,
  },
  scores: {
    flexDirection: 'row',
    gap: 10,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: colors.ink2,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  scoreNum: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
  },
  scoreLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: '#C9BEEA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 48,
    letterSpacing: 0.5,
  },
});
