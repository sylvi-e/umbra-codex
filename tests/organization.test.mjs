import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../lib/organization-rules.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const {
  organizationTotals,
  organizationDefaults,
  applyOrganizationCombatChange,
} = await import(
  "data:text/javascript;base64," + Buffer.from(javascript).toString("base64")
);
test("A Organização: valores iniciais e limites dos upgrades", () => {
  assert.deepEqual(organizationTotals([0, 0, 0, 0, 0, 0]), {
    hp: 10,
    mana: 10,
    movement: 9,
    slots: 4,
    perception: 0,
    interpersonal: 0,
  });
  assert.deepEqual(organizationTotals([9, 9, 9, 9, 9, 4]), {
    hp: 10,
    mana: 10,
    movement: 9,
    slots: 4,
    perception: 0,
    interpersonal: 0,
  });
  assert.deepEqual(organizationTotals([10, 10, 10, 10, 10, 5]), {
    hp: 20,
    mana: 15,
    movement: 13,
    slots: 7,
    perception: 1,
    interpersonal: 1,
  });
  assert.deepEqual(organizationTotals([20, 20, 20, 20, 20, 10], 26, 12, 9, 5), {
    hp: 46,
    mana: 22,
    movement: 17,
    slots: 15,
    perception: 2,
    interpersonal: 2,
  });
});

test("ajustes de combate mantêm limites e preservam os demais campos", () => {
  const initial = {
    ...structuredClone(organizationDefaults),
    notes: "Não alterar",
    armorBonus: 2,
  };
  const lowHp = applyOrganizationCombatChange(initial, "hp", -5);
  assert.equal(lowHp.hp, 0);
  const smallerMax = applyOrganizationCombatChange(initial, "hpBase", 3);
  assert.equal(smallerMax.hp, 3);
  assert.equal(smallerMax.notes, "Não alterar");
  const armor = applyOrganizationCombatChange(initial, "armor", 4);
  assert.equal(armor.armor + armor.armorBonus, 6);
  assert.equal(applyOrganizationCombatChange(initial, "mana", 99).mana, 10);
  assert.equal(applyOrganizationCombatChange(initial, "tempHp", 8).tempHp, 8);
  for (const key of ["armor", "armorBonus", "mr", "mrBonus"]) {
    assert.equal(applyOrganizationCombatChange(initial, key, -5)[key], -5);
  }
  assert.equal(applyOrganizationCombatChange(initial, "mana", -5).mana, 0);
  assert.equal(initial.accustomedPercentage, 50);
});
