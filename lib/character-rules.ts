export function calculateAttributeModifier(base: number) {
  const normalizedBase = Number.isFinite(base) ? base : 0;
  return normalizedBase <= 0 ? -1 : Math.floor(normalizedBase / 2);
}

export function formatAttributeModifier(modifier: number) {
  return modifier >= 0 ? `+${modifier}` : String(modifier);
}
