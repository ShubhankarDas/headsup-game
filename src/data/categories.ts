export type CategoryId = string;

export const RANDOM_CATEGORY_ID = 'random';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  bgColor: string;
  textColor: string;
  words: string[];
  badge?: string;
}

export function findCategoryById(categories: Category[], id: CategoryId): Category | undefined {
  if (id === RANDOM_CATEGORY_ID) {
    const allWords = categories.flatMap((c) => c.words);
    return { id: RANDOM_CATEGORY_ID, name: 'Random mix', icon: 'dice-5', bgColor: '#85B7EB', textColor: '#042C53', words: allWords };
  }
  return categories.find((c) => c.id === id);
}
