import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath = new URL("../supabase/migrations/20260920015946_initial_umbra_schema.sql", import.meta.url);
const clientPath = new URL("../lib/supabase/client.ts", import.meta.url);
const authFormPath = new URL("../components/umbra/auth-form.tsx", import.meta.url);
const firebaseClientPath = new URL("../lib/firebase/client.ts", import.meta.url);
const googleBridgePath = new URL("../supabase/functions/google-auth-bridge/index.ts", import.meta.url);
const googleProfileMigrationPath = new URL("../supabase/migrations/20260920070206_support_google_oauth_profiles.sql", import.meta.url);
const recoveryPagePath = new URL("../app/recuperar-senha/page.tsx", import.meta.url);
const characterEditorPath = new URL("../components/umbra/character-editor.tsx", import.meta.url);
const characterArsenalPath = new URL("../components/umbra/character-arsenal-editor.tsx", import.meta.url);
const campaignsPath = new URL("../components/umbra/campaigns.tsx", import.meta.url);
const campaignDeleteMigrationPath = new URL("../supabase/migrations/20260922130000_allow_admin_delete_campaigns.sql", import.meta.url);
const characterRulesPath = new URL("../lib/character-rules.ts", import.meta.url);
const coloredTextPath = new URL("../components/umbra/colored-text.tsx", import.meta.url);
const characterNotesPath = new URL("../components/umbra/character-notes.tsx", import.meta.url);
const draggableNotesMigrationPath = new URL("../supabase/migrations/20260924201312_draggable_character_notes.sql", import.meta.url);
const pinnedNotesMigrationPath = new URL("../supabase/migrations/20260924202702_pin_character_notes.sql", import.meta.url);
const characterPortraitPath = new URL("../components/umbra/character-portrait.tsx", import.meta.url);
const portraitMigrationPath = new URL("../supabase/migrations/20260924154000_add_character_portraits_storage.sql", import.meta.url);
const attributeModifierMigrationPath = new URL("../supabase/migrations/20260922013525_enforce_base_attribute_modifier.sql", import.meta.url);

test("todas as tabelas sensíveis ativam RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const table of ["profiles", "user_roles", "campaigns", "character_sheets", "character_stats", "character_skills", "character_memories", "character_echoes", "inventory_items", "audit_logs"]) {
    assert.match(sql, new RegExp(`['\"]${table}['\"]`));
  }
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /private\.can_view_character/);
  assert.match(sql, /private\.can_edit_character/);
  assert.match(sql, /'character_skills'[^\n]*create policy %I_write[^\n]*private\.can_edit_character\(character_id\)/);
  assert.match(sql, /private\.is_admin\(\)/);
});

test("status de combate usa painel visual sem campos temporariamente ocultos", async () => {
  const source = await readFile(characterEditorPath, "utf8");
  const view = await readFile(
    new URL("../components/umbra/character-view.tsx", import.meta.url),
    "utf8",
  );
  const combatPanel = source.slice(
    source.indexOf("function CombatStatus"),
    source.indexOf("function Field"),
  );

  assert.match(combatPanel, /role="progressbar"/);
  assert.match(combatPanel, /Vitalidade/);
  assert.match(combatPanel, /HP temporário/);
  assert.match(combatPanel, /Classe de Armadura/);
  assert.match(combatPanel, /Resistência Mágica/);
  assert.doesNotMatch(
    combatPanel,
    /Esquiva|Redução de dano|Essência atual|Essência máxima/,
  );
  assert.doesNotMatch(view, /label="Essência"/);
});

test("atributos calculam modificador a cada dois pontos de base", async () => {
  const source = await readFile(characterEditorPath, "utf8");
  const rules = await readFile(characterRulesPath, "utf8");
  const sql = await readFile(attributeModifierMigrationPath, "utf8");
  const attributesPanel = source.slice(
    source.indexOf('title="Atributos base"'),
    source.indexOf('<TabsContent value="progression">'),
  );

  assert.match(rules, /normalizedBase <= 0 \? -1 : Math\.floor\(normalizedBase \/ 2\)/);
  assert.match(source, /temporary_bonus: calculateAttributeModifier\(a\.base\)/);
  assert.match(source, /Base 0 concede −1; Base 1 concede \+0/);
  assert.match(sql, /when new\.base_value <= 0 then -1/);
  assert.match(sql, /else floor\(new\.base_value \/ 2\)/);
  assert.match(sql, /before insert or update/);
  assert.match(sql, /where category = 'base_attribute'/);
  assert.match(attributesPanel, /<Label>Bônus<\/Label>/);
  assert.match(attributesPanel, /<Label>Final<\/Label>/);
  assert.doesNotMatch(attributesPanel, /Penalidade|attributes\.\$\{index\}\.penalty/);
});

test("atributos removidos também são excluídos do banco", async () => {
  const source = await readFile(characterEditorPath, "utf8");
  assert.match(source, /currentAttributeKeys = new Set/);
  assert.match(source, /\.eq\("category", "base_attribute"\)/);
  assert.match(source, /\.in\("stat_key", removedAttributeKeys\)/);
  assert.match(source, /if \(deleteAttributesError\) throw deleteAttributesError/);
});

test("o frontend usa apenas publishable key", async () => {
  const source = await readFile(clientPath, "utf8");
  assert.match(source, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(source, /service_role|SUPABASE_SECRET/i);
});

test("textos coloridos usam códigos seguros sem interpretar HTML", async () => {
  const source = await readFile(coloredTextPath, "utf8");
  assert.match(source, /&\(\[0-9a-fr\]\)/i);
  assert.match(source, /code === "r"/);
  assert.match(source, /minecraftColors/);
  assert.match(source, /ColorPalette/);
  assert.match(source, /ColoredInput/);
  assert.match(source, /Mostrar cores/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /insertColorCode/);
  assert.match(source, /selected \? "&r"/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|innerHTML/);
});

test("notas podem ser formatadas na edição e visualizadas na ficha", async () => {
  const editor = await readFile(characterEditorPath, "utf8");
  const view = await readFile(new URL("../components/umbra/character-view.tsx", import.meta.url), "utf8");
  const notes = await readFile(characterNotesPath, "utf8");
  const migration = await readFile(draggableNotesMigrationPath, "utf8");
  const pinnedMigration = await readFile(pinnedNotesMigrationPath, "utf8");

  assert.match(editor, /value="notes">Notas<\/TabsTrigger>/);
  assert.match(editor, /CharacterNotesBoard/);
  assert.match(notes, /from\("character_notes"\)/);
  assert.match(notes, /Criar nota/);
  assert.match(notes, /Nome da nota/);
  assert.match(notes, /kind: "move" \| "resize"/);
  assert.match(notes, /onPointerMove=\{continueGesture\}/);
  assert.match(notes, /function BoardNoteBody/);
  assert.match(notes, /Formatação da nota/);
  assert.match(notes, /note\.is_pinned/);
  assert.match(notes, /Desafixar nota/);
  assert.match(pinnedMigration, /is_pinned boolean not null default false/);
  assert.match(migration, /board_x integer not null/);
  assert.match(migration, /board_width integer not null/);
  assert.match(migration, /character_notes_board_horizontal_bounds_check/);
  assert.match(view, /value="notes">Notas<\/TabsTrigger>/);
  assert.match(view, /FormattedNotes content=\{note\.content\}/);
  assert.match(notes, /Formatar texto/);
  assert.match(notes, /Negrito|Itálico|Lista numerada/);
  assert.match(notes, /function continueList/);
  assert.match(notes, /Number\(marker\[3\]\) \+ 1/);
  assert.match(notes, /onKeyDown=\{continueList\}/);
  assert.doesNotMatch(notes, /dangerouslySetInnerHTML|innerHTML/);
});

test("retrato é convertido no frontend e substitui a rolagem na ficha", async () => {
  const editor = await readFile(characterEditorPath, "utf8");
  const view = await readFile(new URL("../components/umbra/character-view.tsx", import.meta.url), "utf8");
  const portrait = await readFile(characterPortraitPath, "utf8");
  const migration = await readFile(portraitMigrationPath, "utf8");

  assert.match(editor, /CharacterPortraitEditor/);
  assert.match(editor, /portrait_url: v\.portraitUrl/);
  assert.match(view, /CharacterPortraitCard/);
  assert.doesNotMatch(view, /DiceRoller/);
  assert.match(portrait, /const portraitSize = 512/);
  assert.match(portrait, /image\/webp/);
  assert.match(portrait, /targetBytes = 250 \* 1024/);
  assert.match(portrait, /createImageBitmap/);
  assert.match(portrait, /Ajustar retrato/);
  assert.match(portrait, /Usar este recorte/);
  assert.match(portrait, /onPointerMove=\{drag\}/);
  assert.match(portrait, /crop\.offsetX \* portraitSize/);
  assert.match(portrait, /crop\.offsetY \* portraitSize/);
  assert.match(migration, /character-portraits/);
  assert.match(migration, /private\.can_edit_character/);
  assert.match(migration, /array\['image\/webp'\]/);
});

test("cargo administrativo não vem do cadastro público", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /admin_allowlist/);
  assert.match(sql, /else 'player'::public\.app_role/);
});

test("login Google troca um token Firebase por sessão Supabase", async () => {
  const source = await readFile(authFormPath, "utf8");
  assert.match(source, /getGoogleIdToken/);
  assert.match(source, /google-auth-bridge/);
  assert.match(source, /verifyOtp/);
  assert.doesNotMatch(source, /GOOGLE_CLIENT_SECRET|FIREBASE_PRIVATE_KEY/);
});

test("Firebase público não inclui credenciais administrativas", async () => {
  const source = await readFile(firebaseClientPath, "utf8");
  assert.match(source, /NEXT_PUBLIC_FIREBASE_API_KEY/);
  assert.match(source, /signInWithPopup/);
  assert.doesNotMatch(source, /private_key|service_role|client_secret/i);
});

test("ponte Google valida JWT e mantém a service role somente no servidor", async () => {
  const source = await readFile(googleBridgePath, "utf8");
  assert.match(source, /jwtVerify/);
  assert.match(source, /securetoken\.google\.com/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /email_verified/);
  assert.match(source, /sign_in_provider/);
});

test("perfil Google preserva função segura e importa nome e avatar", async () => {
  const sql = await readFile(googleProfileMigrationPath, "utf8");
  assert.match(sql, /raw_user_meta_data->>'full_name'/);
  assert.match(sql, /raw_user_meta_data->>'avatar_url'/);
  assert.match(sql, /admin_allowlist/);
  assert.match(sql, /else 'player'::public\.app_role/);
});

test("login e cadastro oferecem exclusivamente autenticação Google", async () => {
  const source = await readFile(authFormPath, "utf8");
  assert.match(source, /Continuar com Google/);
  assert.doesNotMatch(source, /signInWithPassword|resetPasswordForEmail|client\.auth\.signUp/);
  assert.doesNotMatch(source, /name=["'](?:email|password)["']/);
});

test("recuperação por senha redireciona para o login Google", async () => {
  const source = await readFile(recoveryPagePath, "utf8");
  assert.match(source, /redirect\(["']\/login["']\)/);
  assert.doesNotMatch(source, /AuthForm|resetPasswordForEmail/);
});

test("ranks da progressão usam opções configuráveis do banco", async () => {
  const source = await readFile(characterEditorPath, "utf8");
  assert.match(source, /from\("system_options"\)/);
  assert.match(source, /eq\("group_key", "rank"\)/);
  assert.match(source, /name="rankName"/);
  assert.match(source, /name="aspectRank"/);
  assert.match(source, /name="soulRank"/);
  assert.match(source, /function RankSelect/);
});

test("classe usa seletor com opções configuráveis do banco", async () => {
  const source = await readFile(characterEditorPath, "utf8");
  assert.match(source, /eq\("group_key", "class"\)/);
  assert.match(source, /const \[classOptions, setClassOptions\]/);
  assert.match(source, /name="className"[\s\S]*?options=\{classOptions\}/);
  assert.doesNotMatch(source, /<Field form=\{form\} name="className"/);
});

test("núcleos da alma ficam entre um e sete e calculam o próximo núcleo", async () => {
  const source = await readFile(characterEditorPath, "utf8");
  const progressionPanel = source.slice(
    source.indexOf('<TabsContent value="progression">'),
    source.indexOf('<TabsContent value="supernatural">'),
  );

  assert.match(source, /function SoulCoreSelect/);
  assert.match(source, /Array\.from\(\{ length: 7 \}/);
  assert.match(source, /next_core_fragments: v\.soulCores \* 1000/);
  assert.match(source, /max_soul_cores: 7/);
  assert.match(progressionPanel, /Máximo alcançado/);
  assert.doesNotMatch(progressionPanel, /"maxSoulCores", "Limite de núcleos"/);
  assert.doesNotMatch(progressionPanel, /name="nextCoreFragments"/);
});

test("navegação compacta inclui arsenal persistido e protegido", async () => {
  const editor = await readFile(characterEditorPath, "utf8");
  const arsenal = await readFile(characterArsenalPath, "utf8");
  const migration = await readFile(migrationPath, "utf8");

  assert.match(editor, /<Tabs defaultValue="identity" className="gap-3">/);
  assert.match(editor, /value="arsenal">Arsenal<\/TabsTrigger>/);
  assert.match(editor, /<CharacterArsenalEditor characterId=\{activeId\}/);
  for (const table of ["character_memories", "character_echoes", "inventory_items"]) {
    assert.match(arsenal, new RegExp(`from\\(\"${table}\"\\)`));
    assert.match(migration, new RegExp(`['"]${table}['"]`));
  }
  assert.match(migration, /private\.can_edit_character\(character_id\)/);
  assert.match(arsenal, /window\.confirm/);
});

test("arsenal usa inventário à esquerda e formulários completos em modal", async () => {
  const arsenal = await readFile(characterArsenalPath, "utf8");
  assert.ok(arsenal.indexOf('inventory: {') < arsenal.indexOf('memories: {'));
  assert.match(arsenal, /<Dialog open=\{modalKind !== null\}/);
  assert.match(arsenal, /Quantidade carregada \*/);
  assert.match(arsenal, /Encantamentos \(um por linha\)/);
  assert.match(arsenal, /Descrição física/);
  assert.match(arsenal, /from\("memory_enchantments"\)/);
});

test("itens do arsenal podem ser visualizados e editados", async () => {
  const arsenal = await readFile(characterArsenalPath, "utf8");
  assert.match(arsenal, /openView\(kind, row\)/);
  assert.match(arsenal, /openEdit\(kind, row\)/);
  assert.match(arsenal, /aria-label=\{`Editar \$\{row\.name\}`\}/);
  assert.match(arsenal, /Todos os detalhes registrados/);
  assert.match(arsenal, /\.update\(payload\)\.eq\("id", editingId\)/);
  assert.match(arsenal, /Quantidade carregada/);
});

test("arsenal da visualização abre detalhes ao clicar no nome", async () => {
  const view = await readFile(new URL("../components/umbra/character-view.tsx", import.meta.url), "utf8");
  assert.match(view, /openArsenalDetail\("inventory", row\)/);
  assert.match(view, /openArsenalDetail\("memories", row\)/);
  assert.match(view, /openArsenalDetail\("echoes", row\)/);
  assert.match(view, /open=\{arsenalDetail !== null\}/);
  assert.match(view, /Todos os detalhes registrados neste item do Arsenal/);
  assert.match(view, /onClick=\{\(\) => onOpen\(r\)\}/);
});

test("navegação da ficha não exibe scrollbar", async () => {
  const view = await readFile(new URL("../components/umbra/character-view.tsx", import.meta.url), "utf8");
  assert.match(view, /overflow-x-auto overflow-y-hidden/);
  assert.match(view, /\[scrollbar-width:none\]/);
  assert.match(view, /\[&::-webkit-scrollbar\]:hidden/);
});

test("Memórias usam Tier romano de I a VII sem campos removidos", async () => {
  const arsenal = await readFile(characterArsenalPath, "utf8");
  const memoryStart = arsenal.indexOf('if (kind === "memories")');
  const memoryForm = arsenal.slice(memoryStart, arsenal.indexOf('\n  return <>', memoryStart));
  assert.match(arsenal, /const tiers = \["I", "II", "III", "IV", "V", "VI", "VII"\]/);
  assert.match(memoryForm, /<TierField form=\{form\}/);
  assert.doesNotMatch(memoryForm, /Tier ou nível|Espaço de equipamento|Durabilidade|label="Origem"/);
  assert.match(arsenal, /key === "tier" \? tiers\[Number\(value\) - 1\]/);
});

test("somente administradores podem excluir campanhas com confirmação", async () => {
  const source = await readFile(campaignsPath, "utf8");
  const sql = await readFile(campaignDeleteMigrationPath, "utf8");

  assert.match(source, /profile\?\.role === "admin"/);
  assert.match(source, /<AlertDialog>/);
  assert.match(source, /Excluir permanentemente/);
  assert.match(source, /\.from\("campaigns"\)[\s\S]*?\.delete\(\)/);
  assert.match(sql, /for delete/i);
  assert.match(sql, /using \(private\.is_admin\(\)\)/i);
});

test("campos removidos não aparecem na interface da ficha", async () => {
  const editor = await readFile(characterEditorPath, "utf8");
  const view = await readFile(
    new URL("../components/umbra/character-view.tsx", import.meta.url),
    "utf8",
  );
  const identityView = view.slice(
    view.indexOf('<TabsContent value="overview">'),
    view.indexOf('<TabsContent value="attributes">'),
  );
  for (const label of [
    "Descrição física",
    "Objetivos",
    "Origem",
    "Ocupação",
    "Pronomes",
    "Local de nascimento",
  ]) {
    assert.doesNotMatch(editor, new RegExp(`label=[\"']${label}[\"']`));
  }
  assert.doesNotMatch(identityView, /[\"'](?:Descrição física|Objetivos|Origem|Ocupação)[\"']/);
});
