import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../lib/organization-rules.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { organizationTotals } = await import('data:text/javascript;base64,' + Buffer.from(javascript).toString('base64'));
test('A Organização: valores iniciais e limites dos upgrades', () => {
 assert.deepEqual(organizationTotals([0,0,0,0,0,0]),{hp:10,mana:10,movement:9,slots:4,perception:0,interpersonal:0});
 assert.deepEqual(organizationTotals([9,9,9,9,9,4]),{hp:10,mana:10,movement:9,slots:4,perception:0,interpersonal:0});
 assert.deepEqual(organizationTotals([10,10,10,10,10,5]),{hp:20,mana:15,movement:13,slots:7,perception:1,interpersonal:1});
 assert.deepEqual(organizationTotals([20,20,20,20,20,10],26,12,9,5),{hp:46,mana:22,movement:17,slots:15,perception:2,interpersonal:2});
});
