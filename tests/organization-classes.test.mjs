import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const catalog = JSON.parse(await readFile(new URL("../lib/organization-classes-data.json", import.meta.url), "utf8"));
const source = (await readFile(new URL("../lib/organization-classes.ts", import.meta.url), "utf8"))
  .replace('import catalog from "./organization-classes-data.json";', `const catalog = ${JSON.stringify(catalog)};`);
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { organizationClassTiers, findOrganizationClass } = await import("data:text/javascript;base64," + Buffer.from(javascript).toString("base64"));

test("as dez classes mantêm bônus como referência e seis faixas", () => {
  assert.equal(catalog.length, 10);
  for (const entry of catalog) {
    assert.equal(entry.tiers.length, 6, entry.name);
    assert.ok(entry.weapons, entry.name);
    assert.ok(entry.description, entry.name);
  }
  assert.match(findOrganizationClass("Espadachim").status, /\+5 de vida/);
  assert.equal(findOrganizationClass("&aCaçador").name, "Caçador");
  assert.equal(findOrganizationClass("Lutador (pugilista / duelista)").name, "Lutador");
});

test("habilidades acumulam ao subir e deixam de estar disponíveis ao baixar", () => {
  for (const percentage of [50, 60, 70, 80, 90, 100]) {
    const available = organizationClassTiers("Assassino", "", percentage).filter((tier) => tier.available);
    assert.deepEqual(available.map((tier) => tier.percentage), [50, 60, 70, 80, 90, 100].filter((tier) => tier <= percentage));
    assert.match(available[0].abilities.map((entry) => entry.description).join(" "), /80% = 24m, 100% = 32m/);
  }
});

test("subclasses de lutador são exclusivas e mantêm habilidades comuns", () => {
  const names = (subclass) => organizationClassTiers("Lutador", subclass, 100).flatMap((tier) => tier.abilities.map((entry) => entry.name)).join(" ");
  assert.match(names("Pugilista"), /Combo Natural/);
  assert.doesNotMatch(names("Pugilista"), /Técnica Refinada|Aparar|Domínio da Arma/);
  assert.match(names("Duelista"), /Técnica Refinada/);
  assert.doesNotMatch(names("Duelista"), /Combo Natural|Fluxo de Combate|Guarda Fechada/);
  assert.match(names("Pugilista"), /Equilíbrio Perfeito|Corpo de Aço/);
});

test("magia e pactos incluem somente a especialidade ou patrono escolhido", () => {
  const names = (name, subclass) => organizationClassTiers(name, subclass, 100).flatMap((tier) => tier.abilities.map((entry) => entry.name)).join(" ");
  assert.match(names("Manipulador de Magia", "Controle/Suporte"), /Fluxo Natural|Curar Ferimentos/);
  assert.doesNotMatch(names("Manipulador de Magia", "Controle/Suporte"), /Bola de Fogo/);
  assert.match(names("Manipulador de Magia", "Poder de Efeito"), /Bola de Fogo/);
  assert.doesNotMatch(names("Manipulador de Magia", "Poder de Efeito"), /Curar Ferimentos/);
  assert.match(names("Assinante de Pacto", "Fada Vermelha"), /Vínculo Sobrenatural|Ciclo de Sangue/);
  assert.doesNotMatch(names("Assinante de Pacto", "Fada Vermelha"), /Corpo Sombrio|Mente Fragmentada/);
  assert.equal(organizationClassTiers("Classe própria", "", 50)[0].abilities.length, 0);
});
