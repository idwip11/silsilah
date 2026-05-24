import type { FamilyTreeData } from '../types/family';

const LOCAL_STORAGE_KEY = 'silsilah_ku_data';
const DEFAULT_TREE_ID = 'default-family-tree';
const DEFAULT_TABLE_NAME = 'family_trees';

type StorageSource = 'supabase' | 'local' | 'empty';

interface StorageLoadResult {
  data: FamilyTreeData | null;
  source: StorageSource;
}

interface SupabaseConfig {
  anonKey: string;
  tableName: string;
  treeId: string;
  url: string;
}

function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return {
    anonKey,
    tableName: import.meta.env.VITE_SUPABASE_TABLE?.trim() || DEFAULT_TABLE_NAME,
    treeId: import.meta.env.VITE_SUPABASE_TREE_ID?.trim() || DEFAULT_TREE_ID,
    url: url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, ''),
  };
}

function getHeaders(config: SupabaseConfig) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    'Content-Type': 'application/json',
  };
}

function readLocalTree(): FamilyTreeData | null {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed.members) && Array.isArray(parsed.relations)) {
      return parsed;
    }
  } catch (error) {
    console.error('Failed to parse saved family tree', error);
  }

  return null;
}

function writeLocalTree(data: FamilyTreeData) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

export function isSupabaseStorageEnabled() {
  return getSupabaseConfig() !== null;
}

export async function loadFamilyTree(): Promise<StorageLoadResult> {
  const localTree = readLocalTree();
  const config = getSupabaseConfig();

  if (!config) {
    return {
      data: localTree,
      source: localTree ? 'local' : 'empty',
    };
  }

  try {
    const endpoint = `${config.url}/rest/v1/${config.tableName}?id=eq.${encodeURIComponent(config.treeId)}&select=members,relations&limit=1`;
    const response = await fetch(endpoint, {
      headers: getHeaders(config),
    });

    if (!response.ok) {
      throw new Error(`Supabase load failed: ${response.status} ${response.statusText}`);
    }

    const rows = await response.json();
    const record = Array.isArray(rows) ? rows[0] : null;

    if (record && Array.isArray(record.members) && Array.isArray(record.relations)) {
      const data = {
        members: record.members,
        relations: record.relations,
      };
      writeLocalTree(data);
      return { data, source: 'supabase' };
    }

    if (localTree) {
      await saveFamilyTree(localTree);
      return { data: localTree, source: 'local' };
    }
  } catch (error) {
    console.error('Failed to load family tree from Supabase', error);

    if (localTree) {
      return { data: localTree, source: 'local' };
    }
  }

  return { data: null, source: 'empty' };
}

export async function saveFamilyTree(data: FamilyTreeData) {
  writeLocalTree(data);

  const config = getSupabaseConfig();
  if (!config) {
    return;
  }

  const endpoint = `${config.url}/rest/v1/${config.tableName}?on_conflict=id`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...getHeaders(config),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      id: config.treeId,
      name: 'Silsilah Keluarga Utama',
      members: data.members,
      relations: data.relations,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase save failed: ${response.status} ${response.statusText}`);
  }
}

export async function clearFamilyTree() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);

  const config = getSupabaseConfig();
  if (!config) {
    return;
  }

  const endpoint = `${config.url}/rest/v1/${config.tableName}?id=eq.${encodeURIComponent(config.treeId)}`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      ...getHeaders(config),
      Prefer: 'return=minimal',
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase clear failed: ${response.status} ${response.statusText}`);
  }
}
