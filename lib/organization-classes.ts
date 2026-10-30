import catalog from "./organization-classes-data.json";

export type ClassAbility = { name: string; description: string; subclass: string };
export type ClassTier = { percentage: number; abilities: ClassAbility[] };
export type OrganizationClassDefinition = {
  name: string;
  weapons: string;
  description: string;
  status: string;
  tiers: ClassTier[];
  subclasses: { name: string; description: string; tiers: ClassTier[] }[];
};
export const organizationClasses: OrganizationClassDefinition[] = catalog;
export const classPercentages = [50, 60, 70, 80, 90, 100] as const;
const normalize = (value: string) => value.replace(/&[0-9a-fr]/gi, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export function findOrganizationClass(name: string) {
  const key = normalize(name).replace(/\s*\(pugilista\s*\/\s*duelista\)$/, "");
  return organizationClasses.find((entry) => normalize(entry.name) === key);
}

// Earlier tiers remain available; variants inside a rule stay in its original text.
export function organizationClassTiers(name: string, subclass: string, percentage: number) {
  const definition = findOrganizationClass(name);
  const chosen = definition?.subclasses.find((entry) => entry.name === subclass);
  return classPercentages.map((threshold) => ({
    percentage: threshold,
    available: threshold <= percentage,
    abilities: [
      ...(definition?.tiers.find((tier) => tier.percentage === threshold)?.abilities ?? [])
        .filter((ability) => !ability.subclass || ability.subclass === chosen?.name),
      ...(chosen?.tiers.find((tier) => tier.percentage === threshold)?.abilities ?? []),
    ],
  }));
}
