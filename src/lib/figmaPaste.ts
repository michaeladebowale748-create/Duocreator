import type { Artboard, DesignObject, FigmaPastePayload, ObjectKind } from '../types';

const FORMAT = 'application/vnd.duocreator.figma+json';
const MAX_PAYLOAD_BYTES = 32 * 1024 * 1024;
const SUPPORTED = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET', 'RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'LINE', 'TEXT', 'VECTOR', 'GROUP', 'SLICE', 'SECTION', 'SLIDE', 'SHAPE_WITH_TEXT', 'STICKY', 'CONNECTOR', 'TABLE']);

type AnyRecord = Record<string, any>;

export function parseFigmaClipboard(text: string): FigmaPastePayload {
  if (new Blob([text]).size > MAX_PAYLOAD_BYTES) throw new Error('This clipboard package is larger than the 32 MB import limit.');
  let value: AnyRecord;
  try { value = JSON.parse(text); } catch { throw new Error('Clipboard does not contain a Duocreator design. Copy a frame with the Figma to Duocreator plugin first.'); }
  if (value?.format !== FORMAT || value?.schemaVersion !== 1) throw new Error('This Figma package format is not supported.');
  if (!value.frame || !Number.isFinite(value.frame.width) || !Number.isFinite(value.frame.height) || value.frame.width <= 0 || value.frame.height <= 0) {
    throw new Error('The clipboard package is missing valid frame dimensions.');
  }
  if (!['editable', 'flat'].includes(value.mode)) throw new Error('The clipboard package has an unknown copy mode.');
  if (value.mode === 'flat' && !value.image?.data) throw new Error('The flat image is missing from this package.');
  if (value.mode === 'editable' && !value.document) throw new Error('The editable layer tree is missing from this package.');
  return value as FigmaPastePayload;
}

function colorOf(paints: any[] | undefined, fallback = '#d4d4d4'): string {
  const paint = paints?.find((item) => item.visible !== false && item.type === 'SOLID');
  if (!paint?.color) return fallback;
  const { r, g, b } = paint.color;
  return `#${[r, g, b].map((v: number) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
}

function dataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

function isFontAvailable(family: string, size: number): boolean {
  if (!family || typeof document === 'undefined' || !('fonts' in document)) return true;
  try { return document.fonts.check(`${size}px \"${family.split(',')[0].trim()}\"`); } catch { return true; }
}

function findImageHash(node: AnyRecord): string | undefined {
  const fills = [...(node.fills ?? []), ...(node.background ?? [])];
  const image = fills.find((paint: any) => paint?.type === 'IMAGE' && paint.imageRef);
  return image?.imageRef;
}

function mapNode(node: AnyRecord, payload: FigmaPastePayload, objects: DesignObject[], offset: { x: number; y: number }): void {
  if (!node || typeof node !== 'object') return;
  const type = String(node.type ?? '');
  if (!SUPPORTED.has(type)) return;
  const bounds = node.absoluteBoundingBox ?? node.absoluteRenderBounds ?? node.size;
  if (bounds && typeof bounds.width === 'number' && typeof bounds.height === 'number') {
    const x = (bounds.x ?? 0) - offset.x;
    const y = (bounds.y ?? 0) - offset.y;
    const fill = colorOf(node.fills ?? node.background);
    const stroke = colorOf(node.strokes, 'transparent');
    let kind: ObjectKind | null = null;
    if (type === 'TEXT' || type === 'SHAPE_WITH_TEXT' || type === 'STICKY') kind = 'text';
    else if (type === 'LINE' || type === 'CONNECTOR') kind = 'line';
    else if (type === 'ELLIPSE') kind = 'ellipse';
    else if (type === 'RECTANGLE' || ['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET', 'SECTION', 'SLIDE', 'GROUP'].includes(type)) kind = 'rect';
    else if (type === 'VECTOR' || type === 'POLYGON' || type === 'STAR') kind = 'rect';

    const fallback = payload.textFallbacks?.find((item) => item.nodeId === node.id);
    const fontFamily = node.style?.fontFamily ?? fallback?.fontNames?.[0]?.family ?? fallback?.fontName?.family ?? 'Inter';
    const font = `${fontFamily}, sans-serif`;
    const fontSize = node.style?.fontSize ?? 32;
    const imageHash = findImageHash(node);
    if (imageHash && payload.assets?.[imageHash]) {
      const asset = payload.assets[imageHash];
      objects.push({ id: crypto.randomUUID(), sourceNodeId: node.id, name: node.name ?? 'Image', type: 'image', x, y, width: bounds.width, height: bounds.height, fill: 'transparent', src: dataUrl(asset.mimeType, asset.data) });
    } else if (kind === 'text') {
      objects.push({
        id: crypto.randomUUID(), sourceNodeId: node.id, name: node.name ?? 'Text', type: 'text', x, y, width: bounds.width, height: bounds.height,
        fill, text: node.characters ?? node.shapeWithText?.text ?? node.name ?? '', fontFamily: font,
        fontSize, fontWeight: String(node.style?.fontWeight ?? 500),
        textAlign: node.style?.textAlignHorizontal?.toLowerCase() ?? 'left',
        fontMissing: !isFontAvailable(fontFamily, fontSize), fallbackSvg: fallback?.fallbackSvg ?? undefined,
      });
    } else if (kind) {
      objects.push({ id: crypto.randomUUID(), sourceNodeId: node.id, name: node.name ?? type, type: kind, x, y, width: bounds.width, height: bounds.height, fill, stroke, strokeWidth: node.strokeWeight ?? 0 });
    }
  }
  if (Array.isArray(node.children)) node.children.forEach((child: AnyRecord) => mapNode(child, payload, objects, offset));
}

export function figmaPayloadToArtboard(payload: FigmaPastePayload): Artboard {
  const frame = payload.frame;
  if (payload.mode === 'flat') {
    return {
      id: crypto.randomUUID(), name: frame.name, width: frame.width, height: frame.height, category: 'Imported', isMaster: true,
      source: 'figma', sourcePayload: payload,
      objects: [{ id: crypto.randomUUID(), name: frame.name, type: 'image', x: 0, y: 0, width: frame.width, height: frame.height, fill: 'transparent', src: dataUrl(payload.image!.mimeType, payload.image!.data) }],
    };
  }
  const root = (payload.document as AnyRecord)?.document ?? payload.document;
  const box = root?.absoluteBoundingBox ?? { x: 0, y: 0 };
  const objects: DesignObject[] = [];
  mapNode(root, payload, objects, { x: box.x ?? 0, y: box.y ?? 0 });
  return {
    id: crypto.randomUUID(), name: frame.name, width: frame.width, height: frame.height, category: 'Imported', isMaster: true,
    source: 'figma', sourcePayload: payload, objects,
  };
}

export function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
