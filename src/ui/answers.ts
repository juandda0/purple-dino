// Fixed answer colours + shapes (accessibility: never colour alone). Design §6.2.
export const ANSWER_STYLES = [
  { color: 'o-red', icon: '/assets/sprites/icon_triangle.svg', shape: 'triangle' },
  { color: 'o-blue', icon: '/assets/sprites/icon_diamond.svg', shape: 'diamond' },
  { color: 'o-yellow', icon: '/assets/sprites/icon_star.svg', shape: 'star' },
  { color: 'o-green', icon: '/assets/sprites/icon_circle.svg', shape: 'circle' },
] as const;
