import { AppLang } from "../types/api";
import { Dictionary, en } from "./en";
import { pt } from "./pt";

export const DICTIONARIES: Record<AppLang, Dictionary> = {
  en,
  pt,
};

export type { Dictionary };
