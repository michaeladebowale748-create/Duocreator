import type { Artboard, DesignObject } from '../types';
import type { SizePreset } from '../presets';

export function resizeArtboard(source: Artboard, preset: SizePreset): Artboard {
  const sx = preset.width / source.width;
  const sy = preset.height / source.height;
  const scale = Math.min(sx, sy);
  const offsetX = (preset.width - source.width * scale) / 2;
  const offsetY = (preset.height - source.height * scale) / 2;
  const objects: DesignObject[] = source.objects.map((object) => ({
    ...structuredClone(object),
    id: crypto.randomUUID(),
    x: Math.round(offsetX + object.x * scale),
    y: Math.round(offsetY + object.y * scale),
    width: Math.max(1, Math.round(object.width * scale)),
    height: Math.max(1, Math.round(object.height * scale)),
    fontSize: object.fontSize ? Math.max(8, Math.round(object.fontSize * scale)) : object.fontSize,
  }));
  return {
    id: crypto.randomUUID(),
    name: preset.name,
    category: preset.group,
    width: preset.width,
    height: preset.height,
    isMaster: false,
    source: source.source,
    sourcePayload: source.sourcePayload,
    objects,
  };
}

export function findLayoutIssues(artboard: Artboard): string[] {
  const issues: string[] = [];
  for (const object of artboard.objects) {
    if (object.x < 0 || object.y < 0 || object.x + object.width > artboard.width || object.y + object.height > artboard.height) {
      issues.push(`${object.name} extends beyond the artboard.`);
    }
  }
  return [...new Set(issues)];
}
