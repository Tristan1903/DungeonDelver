// =============================================================================
// 📘 FILE: utils/imgPaths.ts
// =============================================================================
// 🎯 PURPOSE: Provides helper functions that generate file paths for images
//    (monster tokens, class icons, background artwork, race portraits).
//
// 🧠 REACT CONCEPT: URL Construction Helpers
//    Components need image paths like `/img/bestiary/MM/Goblin.webp`. Instead
//    of string-concatenating these in every component, we have one function
//    per image category. This centralizes path conventions and encoding logic.
//
// 💡 If the image folder structure changes, you only edit THIS file.
//    ALL components automatically update.
//
// 🔧 HOW TO ALTER:
//    - Change image folder: modify the path prefix (e.g., "/img/")
//    - Add new image type: create a new function
//    - Change naming convention: modify the filename construction logic
// =============================================================================

// 🧠 Sanitize filename: remove special characters that break file paths.
const sanitize = (name: string) => name.replace(/['']/g, '').replace(/[/\\?<>:*|"]/g, '');

export function monsterImgPath(source: string, name: string): string {
  const encoded = sanitize(name);
  return `/img/bestiary/${source}/${encoded}.webp`;
}

export function classIconPath(className: string): string {
  return `/img/classes/Icons/${className}.png`;
}

export function backgroundImgPath(name: string): string {
  return `/img/backgrounds/${sanitize(name)}.webp`;
}

export function raceImgPath(name: string): string {
  return `/img/races/${sanitize(name)}.webp`;
}
