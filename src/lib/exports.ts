import { PDFDocument } from 'pdf-lib';
import type { Artboard, DesignObject } from '../types';

export async function exportArtboard(artboard: Artboard, format: string): Promise<void> {
  const svg = artboardToSvg(artboard);
  if (format === 'json') return download(new Blob([JSON.stringify(artboard, null, 2)], { type: 'application/json' }), `${slug(artboard.name)}.json`);
  if (format === 'svg') return download(new Blob([svg], { type: 'image/svg+xml' }), `${slug(artboard.name)}.svg`);
  const png = await renderSvg(svg, artboard.width, artboard.height, format === 'pdf' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png');
  if (format === 'pdf') {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([artboard.width, artboard.height]);
    const image = await pdf.embedPng(await png.arrayBuffer());
    page.drawImage(image, { x: 0, y: 0, width: artboard.width, height: artboard.height });
    const pdfBytes = await pdf.save();
    const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(pdfBuffer).set(pdfBytes);
    return download(new Blob([pdfBuffer], { type: 'application/pdf' }), `${slug(artboard.name)}.pdf`);
  }
  return download(png, `${slug(artboard.name)}.${format === 'jpeg' ? 'jpg' : format}`);
}

export function artboardToSvg(artboard: Artboard): string {
  const body = artboard.objects.filter((object) => object.visible !== false).map(renderObject).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${artboard.width}" height="${artboard.height}" viewBox="0 0 ${artboard.width} ${artboard.height}"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
}

function renderObject(object: DesignObject): string {
  const opacity = object.opacity ?? 1;
  if (object.type === 'image' && object.src) return `<image href="${object.src}" x="${object.x}" y="${object.y}" width="${object.width}" height="${object.height}" opacity="${opacity}" preserveAspectRatio="none"/>`;
  if (object.type === 'line') return `<line x1="${object.x}" y1="${object.y}" x2="${object.x + object.width}" y2="${object.y + object.height}" stroke="${object.stroke ?? object.fill}" stroke-width="${object.strokeWidth ?? 2}" opacity="${opacity}"/>`;
  if (object.type === 'ellipse') return `<ellipse cx="${object.x + object.width / 2}" cy="${object.y + object.height / 2}" rx="${object.width / 2}" ry="${object.height / 2}" fill="${object.fill}" opacity="${opacity}"/>`;
  if (object.type === 'text' && object.fontMissing && object.fallbackSvg) return `<g transform="translate(${object.x} ${object.y})">${object.fallbackSvg.replace(/^.*?<svg[^>]*>/s, '').replace(/<\/svg>\s*$/i, '')}</g>`;
  if (object.type === 'text') {
    const lines = (object.text ?? '').split('\n');
    const lineHeight = (object.fontSize ?? 32) * 1.16;
    return `<text x="${object.x}" y="${object.y + (object.fontSize ?? 32)}" fill="${object.fill}" font-family="${esc(object.fontFamily ?? 'Inter')}" font-size="${object.fontSize ?? 32}" font-weight="${object.fontWeight ?? 500}" opacity="${opacity}">${lines.map((line, index) => `<tspan x="${object.x}" dy="${index === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`).join('')}</text>`;
  }
  return `<rect x="${object.x}" y="${object.y}" width="${object.width}" height="${object.height}" rx="${object.name.toLowerCase().includes('pill') ? object.height / 2 : 0}" fill="${object.fill}" stroke="${object.stroke ?? 'none'}" stroke-width="${object.strokeWidth ?? 0}" opacity="${opacity}"/>`;
}

async function renderSvg(svg: string, width: number, height: number, mime: string): Promise<Blob> {
  const image = new Image();
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Could not render this artboard for export.')); image.src = source; });
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas export is unavailable in this browser.');
    if (mime === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); }
    context.drawImage(image, 0, 0, width, height);
    return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Image export failed.')), mime, .92));
  } finally { URL.revokeObjectURL(source); }
}
function download(blob: Blob, filename: string): void { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function slug(name: string): string { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'duocreator-design'; }
function esc(text: string): string { return text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] ?? char)); }
