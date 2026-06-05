export function monsterImgPath(source: string, name: string): string {
  const encoded = name.replace(/['']/g, '').replace(/[/\\?<>:*|"]/g, '');
  return `/img/bestiary/${source}/${encoded}.webp`;
}

export function classIconPath(className: string): string {
  return `/img/classes/Icons/${className}.png`;
}

export function backgroundImgPath(name: string): string {
  const encoded = name.replace(/[/\\?<>:*|"]/g, '');
  return `/img/backgrounds/${encoded}.webp`;
}

export function raceImgPath(name: string): string {
  const encoded = name.replace(/[/\\?<>:*|"]/g, '');
  return `/img/races/${encoded}.webp`;
}
