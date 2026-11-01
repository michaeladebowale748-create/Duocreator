export type ObjectKind = 'text' | 'rect' | 'ellipse' | 'image' | 'line';

export interface DesignObject {
  id: string;
  name: string;
  type: ObjectKind;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  src?: string;
  opacity?: number;
  locked?: boolean;
  visible?: boolean;
  sourceNodeId?: string;
  fontMissing?: boolean;
  fallbackSvg?: string;
}

export interface Artboard {
  id: string;
  name: string;
  width: number;
  height: number;
  category: string;
  isMaster: boolean;
  objects: DesignObject[];
  source?: 'figma' | 'pdf' | 'image' | 'native';
  sourcePayload?: unknown;
}

export interface DesignProject {
  id: string;
  name: string;
  updatedAt: string;
  artboards: Artboard[];
}

export interface FigmaPastePayload {
  format: 'application/vnd.duocreator.figma+json';
  schemaVersion: 1;
  mode: 'editable' | 'flat';
  source: { application: string; editorType: string; pluginVersion?: string; createdAt?: string };
  frame: { id: string; name: string; type: string; width: number; height: number };
  document?: unknown;
  assets?: Record<string, { mimeType: string; encoding: 'base64'; data: string }>;
  textFallbacks?: Array<{ nodeId: string; characters: string; fontName?: { family: string; style: string } | null; fontNames?: Array<{ family: string; style: string }>; sourceHasMissingFont?: boolean; fallbackSvg?: string | null }>;
  preview?: { mimeType: string; encoding: 'utf8'; data: string };
  image?: { mimeType: string; encoding: 'base64'; data: string };
  warnings?: string[];
}
