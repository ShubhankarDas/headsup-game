import type { CategoryId } from '../data/categories';

export interface WordResult {
  word: string;
  correct: boolean;
}

export type RootStackParamList = {
  Home: undefined;
  CategorySelect: { playerCount: number };
  Countdown: { playerCount: number; categoryId: CategoryId; durationSeconds: number };
  Gameplay: { playerCount: number; categoryId: CategoryId; durationSeconds: number };
  Results: {
    playerCount: number;
    categoryId: CategoryId;
    durationSeconds: number;
    results: WordResult[];
  };
};
