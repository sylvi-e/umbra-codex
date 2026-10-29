export const organizationAttributes = [
  "Força",
  "Destreza",
  "Constituição",
  "Inteligência",
  "Percepção",
  "Interpessoal",
] as const;
export function organizationTotals(
  attributes: number[],
  hpBase = 10,
  manaBase = 10,
  movementBase = 9,
  backpackSlots = 0,
) {
  const steps = (index: number, interval = 10) =>
    Math.floor(Math.max(0, attributes[index] ?? 0) / interval);
  return {
    hp: hpBase + steps(2) * 10,
    mana: manaBase + steps(3) * 5,
    movement: movementBase + steps(1) * 4,
    slots: 4 + steps(0) * 3 + backpackSlots,
    perception: steps(4),
    interpersonal: steps(5, 5),
  };
}
export type OrganizationItem = {
  id: string;
  name: string;
  quantity: number;
  slots: number;
  location: string;
  description: string;
  effect: string;
  drawback: string;
};
export type OrganizationAbility = {
  id: string;
  name: string;
  type: string;
  origin: string;
  mana: number;
  duration: string;
  description: string;
};
export type OrganizationSheet = {
  race: string;
  height: string;
  money: number;
  className: string;
  percentage: number;
  hp: number;
  hpBase: number;
  mana: number;
  manaBase: number;
  movementBase: number;
  armor: number;
  armorBonus: number;
  mr: number;
  mrBonus: number;
  backpackSlots: number;
  attributes: number[];
  items: OrganizationItem[];
  abilities: OrganizationAbility[];
  weapon: string;
  weaponDamage: string;
  enchantments: string;
  initialWeaponAbilities: string;
  notes: string;
};
export const organizationDefaults: OrganizationSheet = {
  race: "",
  height: "",
  money: 0,
  className: "",
  percentage: 50,
  hp: 10,
  hpBase: 10,
  mana: 10,
  manaBase: 10,
  movementBase: 9,
  armor: 0,
  armorBonus: 0,
  mr: 0,
  mrBonus: 0,
  backpackSlots: 0,
  attributes: [0, 0, 0, 0, 0, 0],
  items: [],
  abilities: [],
  weapon: "",
  weaponDamage: "",
  enchantments: "",
  initialWeaponAbilities: "",
  notes: "",
};
