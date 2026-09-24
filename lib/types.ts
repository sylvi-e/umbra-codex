export type UserRole = "admin" | "game_master" | "player";
export type Profile = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  status: "active" | "suspended";
  role?: UserRole;
};
export type CharacterSummary = {
  id: string;
  name: string;
  true_name: string | null;
  portrait_url: string | null;
  status: string;
  rank_name: string | null;
  class_name: string | null;
  soul_cores: number;
  current_hp: number;
  max_hp: number;
  current_essence: number;
  max_essence: number;
  updated_at: string;
  archived_at: string | null;
};
export type SaveState = "idle" | "saving" | "saved" | "error";
