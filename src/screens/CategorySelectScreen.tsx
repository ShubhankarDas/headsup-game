import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import type { RootStackParamList } from '../navigation/types';
import { RANDOM_CATEGORY_ID, type Category, type CategoryId } from '../data/categories';
import { useCategories } from '../data/CategoriesContext';
import { colors, fonts, radii } from '../theme/theme';
import { PressedButton } from '../components/PressedButton';

type Props = NativeStackScreenProps<RootStackParamList, 'CategorySelect'>;

const ROUND_DURATION_SECONDS = 60;

export function CategorySelectScreen({ navigation, route }: Props) {
  const { playerCount } = route.params;
  const { categories, status, error, hasLoadedCache, refresh } = useCategories();
  const [selectedId, setSelectedId] = useState<CategoryId | null>(null);

  useEffect(() => {
    // Auto-refresh once on first mount if there's nothing cached locally yet.
    if (hasLoadedCache && categories.length === 0 && status === 'idle') {
      refresh();
    }
  }, [hasLoadedCache, categories.length, status, refresh]);

  useEffect(() => {
    if (selectedId === null && categories.length > 0) {
      setSelectedId(categories[0].id);
    }
  }, [categories, selectedId]);

  const selectedCategory =
    selectedId === RANDOM_CATEGORY_ID
      ? { name: 'Random mix' }
      : categories.find((c) => c.id === selectedId);
  const selectedName = selectedCategory?.name ?? '';

  const handleStart = async () => {
    if (!selectedId) return;
    // Lock landscape before the screen mounts so there's no portrait flash.
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    navigation.navigate('Countdown', {
      playerCount,
      categoryId: selectedId,
      durationSeconds: ROUND_DURATION_SECONDS,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Pick a category</Text>
            <Text style={styles.headerSub}>Or shuffle for a surprise mix</Text>
          </View>
          <Pressable
            style={styles.refreshButton}
            onPress={refresh}
            disabled={status === 'loading'}
            hitSlop={8}
          >
            {status === 'loading' ? (
              <ActivityIndicator size="small" color={colors.cloud} />
            ) : (
              <MaterialCommunityIcons name="refresh" size={20} color={colors.cloud} />
            )}
          </Pressable>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {categories.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="cloud-download-outline" size={40} color={colors.mutedText} />
          <Text style={styles.emptyTitle}>No categories yet</Text>
          <Text style={styles.emptySub}>
            {status === 'loading' ? 'Fetching categories…' : 'Tap refresh to download categories'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              selected={selectedId === category.id}
              onPress={() => setSelectedId(category.id)}
            />
          ))}
          <Pressable
            onPress={() => setSelectedId(RANDOM_CATEGORY_ID)}
            style={[
              styles.card,
              styles.randomCard,
              { backgroundColor: '#85B7EB' },
              selectedId === RANDOM_CATEGORY_ID && styles.cardSelected,
            ]}
          >
            <MaterialCommunityIcons name="dice-5" size={30} color="#042C53" />
            <View>
              <Text style={[styles.cardName, { color: '#042C53' }]}>Random mix</Text>
              <Text style={[styles.cardCount, { color: '#042C53' }]}>All categories</Text>
            </View>
          </Pressable>
        </ScrollView>
      )}

      <PressedButton
        variant="grape"
        onPress={handleStart}
        style={styles.footer}
        disabled={!selectedId}
      >
        {selectedId ? `Play with ${selectedName} →` : 'Pick a category first'}
      </PressedButton>
    </SafeAreaView>
  );
}

function CategoryCard({
  category,
  selected,
  onPress,
}: {
  category: Category;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: category.bgColor }, selected && styles.cardSelected]}
    >
      {category.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{category.badge}</Text>
        </View>
      ) : null}
      <MaterialCommunityIcons
        // Icon name comes from remote data and can't be statically validated
        // against the icon font's glyph set.
        name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={26}
        color={category.textColor}
      />
      <View>
        <Text style={[styles.cardName, { color: category.textColor }]}>{category.name}</Text>
        <Text style={[styles.cardCount, { color: category.textColor }]}>{category.words.length} words</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: colors.cloud,
  },
  headerSub: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 4,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink2,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.coral,
    marginTop: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.cloud,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.mutedText,
  },
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingBottom: 4,
  },
  card: {
    width: '47%',
    height: 118,
    borderRadius: radii.lg,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 3,
    borderColor: colors.ink,
    position: 'relative',
  },
  cardSelected: {
    borderColor: colors.cloud,
  },
  randomCard: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardName: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  cardCount: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    opacity: 0.75,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    transform: [{ rotate: '4deg' }],
    zIndex: 1,
  },
  badgeText: {
    color: colors.sun,
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
  },
  footer: {
    marginTop: 16,
  },
});
