import type { DesignProject } from '../types';
import type { Json } from './database.types';
import { supabase } from './supabase';

export async function loadLatestProject(ownerId: string): Promise<DesignProject | null> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('design_projects')
    .select('document')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const document = data.document as unknown as DesignProject;
  if (!document || typeof document.id !== 'string' || !Array.isArray(document.artboards)) {
    throw new Error('The saved Duocreator document has an unsupported format.');
  }

  return document;
}

export async function saveProject(ownerId: string, project: DesignProject): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  // Round-trip through JSON so the payload is guaranteed to match the JSONB column.
  const document = JSON.parse(JSON.stringify(project)) as Json;
  const { error } = await supabase.from('design_projects').upsert({
    owner_id: ownerId,
    project_key: project.id,
    name: project.name,
    document,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'owner_id,project_key' });

  if (error) throw error;
}
