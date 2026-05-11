import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "sites.json");

export interface Site {
  id: string;
  businessName: string;
  siteName: string;
  industry: string;
  location?: string;
  templateId: string;
  html: string;
  content: Record<string, unknown>;
  deployedUrl?: string;
  status: "draft" | "deployed";
  createdAt: string;
  updatedAt: string;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readDB(): Site[] {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8")) as Site[];
  } catch {
    return [];
  }
}

function writeDB(sites: Site[]) {
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(sites, null, 2), "utf-8");
}

export function getAllSites(): Omit<Site, "html">[] {
  return readDB().map(({ html: _html, ...rest }) => rest);
}

export function getSite(id: string): Site | null {
  return readDB().find((s) => s.id === id) ?? null;
}

export function saveSite(data: Omit<Site, "id" | "createdAt" | "updatedAt">): Site {
  const sites = readDB();
  const now = new Date().toISOString();
  const site: Site = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  sites.unshift(site);
  writeDB(sites);
  return site;
}

export function updateSite(id: string, patch: Partial<Site>): Site | null {
  const sites = readDB();
  const idx = sites.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sites[idx] = { ...sites[idx], ...patch, updatedAt: new Date().toISOString() };
  writeDB(sites);
  return sites[idx];
}

export function deleteSite(id: string): boolean {
  const sites = readDB();
  const next = sites.filter((s) => s.id !== id);
  if (next.length === sites.length) return false;
  writeDB(next);
  return true;
}
