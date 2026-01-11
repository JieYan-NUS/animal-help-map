export const STORY_CATEGORIES = [
  { id: "rescue", labelKey: "stories.category.rescue" },
  { id: "lost_found", labelKey: "stories.category.lost_found" },
  { id: "shelter_foster", labelKey: "stories.category.shelter_foster" },
  { id: "community_moments", labelKey: "stories.category.community_moments" },
  { id: "this_is_pawscue", labelKey: "stories.category.this_is_pawscue" },
  { id: "shared_animal_stories", labelKey: "stories.category.shared_animal_stories" }
] as const;

export type StoryCategory = (typeof STORY_CATEGORIES)[number]["id"];

export const DEFAULT_STORY_CATEGORY: StoryCategory = "rescue";

const storyCategoryIds = STORY_CATEGORIES.map((category) => category.id);

export const isStoryCategory = (value: string): value is StoryCategory =>
  storyCategoryIds.includes(value as StoryCategory);
