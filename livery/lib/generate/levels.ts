// What each level of a kit covers. Levels 1-3 are offered for every site;
// 4-6 only exist when the site's owner opts in with a livery.json file.
export const LEVELS = {
  1: { name: "Tokens", areas: ["tokens"], description: "Colour, type, spacing, radii, borders and depth." },
  2: { name: "Structure", areas: ["components", "layout"], description: "Component recipes, containers, grids and section rhythm." },
  3: { name: "Feel", areas: ["motion", "voice"], description: "Motion timing and the tone of the copy." },
  4: { name: "Owner rules", areas: ["owner-rules"], description: "The owner's own design rules document." },
  5: { name: "Owner assets", areas: ["assets"], description: "Illustrations, custom icons or photos the owner allows." },
  6: { name: "Quoted copy", areas: ["quotes"], description: "Real sentences from the site in the voice examples." },
} as const;

export type Level = keyof typeof LEVELS;
export const DEFAULT_LEVELS: Level[] = [1, 2, 3];
