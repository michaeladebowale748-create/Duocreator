import type { Artboard, DesignObject } from '../types';

export async function importImage(file: File): Promise<Artboard> {
  const src = await readDataUrl(file);
  const dimensions = await imageDimensions(src);
  return {
    id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ''), width: dimensions.width, height: dimensions.height,
    category: 'Imported', isMaster: true, source: 'image',
    objects: [{ id: crypto.randomUUID(), name: file.name, type: 'image', x: 0, y: 0, width: dimensions.width, height: dimensions.height, fill: 'transparent', src }],
  };
}

export async function importSvg(file: File): Promise<Artboard> {
  const text = await file.text();
  const safe = text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
  const blob = new Blob([safe], { type: 'image/svg+xml' });
  const src = await readDataUrl(new File([blob], file.name, { type: 'image/svg+xml' }));
  const dimensions = await imageDimensions(src);
  return { id: crypto.randomUUID(), name: file.name.replace(/\.svg$/i, ''), width: dimensions.width, height: dimensions.height, category: 'Imported', isMaster: true, source: 'image', objects: [{ id: crypto.randomUUID(), name: file.name, type: 'image', x: 0, y: 0, width: dimensions.width, height: dimensions.height, fill: 'transparent', src }] };
}

export async function importPdf(file: File): Promise<Artboard[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: Artboard[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const src = canvas.toDataURL('image/png');
    const objects: DesignObject[] = [{ id: crypto.randomUUID(), name: `${file.name} page ${pageNo}`, type: 'image', x: 0, y: 0, width: viewport.width, height: viewport.height, fill: 'transparent', src, locked: true }];
    pages.push({ id: crypto.randomUUID(), name: `${file.name.replace(/\.pdf$/i, '')} · ${pageNo}`, width: viewport.width, height: viewport.height, category: 'Imported PDF', isMaster: pageNo === 1, source: 'pdf', objects });
  }
  return pages;
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function imageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('The image could not be decoded.'));
    image.src = src;
  });
}
