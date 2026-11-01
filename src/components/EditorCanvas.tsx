import { useEffect, useRef } from 'react';
import { Canvas, FabricImage, Ellipse, Line, Rect, Textbox } from 'fabric';
import type { Artboard, DesignObject } from '../types';

interface Props {
  artboard: Artboard;
  zoom: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onModify: (id: string, update: Partial<DesignObject>) => void;
  onCanvas: (canvas: Canvas | null) => void;
  showSafeArea: boolean;
}

export function EditorCanvas({ artboard, zoom, onSelect, onModify, onCanvas, showSafeArea }: Props) {
  const element = useRef<HTMLCanvasElement>(null);
  const fabric = useRef<Canvas | null>(null);
  const rebuilding = useRef(false);
  const safeArea = useRef<Rect | null>(null);

  useEffect(() => {
    if (!element.current) return;
    const canvas = new Canvas(element.current, { selection: true, preserveObjectStacking: true, backgroundColor: '#fff' });
    fabric.current = canvas;
    onCanvas(canvas);
    canvas.on('selection:created', (event) => onSelect(String(event.selected?.[0]?.data?.designId ?? '')));
    canvas.on('selection:updated', (event) => onSelect(String(event.selected?.[0]?.data?.designId ?? '')));
    canvas.on('selection:cleared', () => { if (!rebuilding.current) onSelect(null); });
    canvas.on('object:modified', (event) => {
      const object = event.target;
      const id = String(object?.data?.designId ?? '');
      if (id) onModify(id, { x: object.left ?? 0, y: object.top ?? 0, width: (object.width ?? 0) * (object.scaleX ?? 1), height: (object.height ?? 0) * (object.scaleY ?? 1), opacity: object.opacity ?? 1 });
    });
    const resizeObserver = new ResizeObserver(() => canvas.requestRenderAll());
    resizeObserver.observe(element.current);
    return () => { resizeObserver.disconnect(); canvas.dispose(); fabric.current = null; onCanvas(null); };
  }, [onCanvas, onModify, onSelect]);

  useEffect(() => {
    const canvas = fabric.current;
    if (!canvas) return;
    let cancelled = false;
    const render = async () => {
      const previousId = canvas.getActiveObject()?.data?.designId as string | undefined;
      rebuilding.current = true;
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      const objects = artboard.objects.filter((item) => item.visible !== false);
      for (const object of objects) {
        const fabricObject = await toFabricObject(object);
        if (cancelled || !fabricObject) continue;
        fabricObject.set({ left: object.x, top: object.y, opacity: object.opacity ?? 1, selectable: !object.locked, evented: !object.locked });
        fabricObject.data = { designId: object.id };
        canvas.add(fabricObject);
      }
      if (showSafeArea) {
        safeArea.current = new Rect({ left: artboard.width * .06, top: artboard.height * .06, width: artboard.width * .88, height: artboard.height * .88, fill: 'transparent', stroke: '#777', strokeDashArray: [10, 12], selectable: false, evented: false });
        canvas.add(safeArea.current);
      }
      canvas.setDimensions({ width: artboard.width, height: artboard.height });
      canvas.setZoom(zoom);
      const restore = canvas.getObjects().find((item) => item.data?.designId === previousId);
      if (restore) canvas.setActiveObject(restore);
      canvas.requestRenderAll();
      rebuilding.current = false;
    };
    void render();
    return () => { cancelled = true; };
  }, [artboard, zoom, showSafeArea]);

  return <canvas ref={element} aria-label={`${artboard.name} design canvas`} />;
}

async function toFabricObject(object: DesignObject) {
  const base = { left: object.x, top: object.y, opacity: object.opacity ?? 1, stroke: object.stroke || undefined, strokeWidth: object.strokeWidth || 0 };
  if (object.type === 'image' && object.src) {
    try { return await FabricImage.fromURL(object.src, { crossOrigin: 'anonymous' }, { ...base, width: object.width, height: object.height, scaleX: 1, scaleY: 1 }); }
    catch { return new Rect({ ...base, width: object.width, height: object.height, fill: '#b8b8b8' }); }
  }
  if (object.type === 'text' && object.fontMissing && object.fallbackSvg) {
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(object.fallbackSvg)}`;
    try { return await FabricImage.fromURL(svgUrl, { crossOrigin: 'anonymous' }, { ...base, width: object.width, height: object.height, scaleX: 1, scaleY: 1 }); } catch { /* Render the retained text below if SVG fallback cannot load. */ }
  }
  if (object.type === 'text') {
    return new Textbox(object.text ?? 'Text', { ...base, width: object.width, height: object.height, fill: object.fill, fontFamily: object.fontFamily ?? 'Inter', fontSize: object.fontSize ?? 32, fontWeight: object.fontWeight ?? '500', textAlign: object.textAlign ?? 'left', editable: !object.fontMissing, splitByGrapheme: false });
  }
  if (object.type === 'ellipse') return new Ellipse({ ...base, rx: object.width / 2, ry: object.height / 2, fill: object.fill });
  if (object.type === 'line') return new Line([object.x, object.y, object.x + object.width, object.y + object.height], { ...base, stroke: object.stroke ?? object.fill, strokeWidth: object.strokeWidth ?? 2 });
  return new Rect({ ...base, width: object.width, height: object.height, fill: object.fill, rx: object.name.toLowerCase().includes('pill') ? object.height / 2 : 0, ry: object.name.toLowerCase().includes('pill') ? object.height / 2 : 0 });
}
