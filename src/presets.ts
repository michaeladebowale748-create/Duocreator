export interface SizePreset {
  id: string;
  name: string;
  group: string;
  width: number;
  height: number;
  safe?: number;
}

export const presets: SizePreset[] = [
  { id: 'ig-square', name: 'Instagram post', group: 'Social', width: 1080, height: 1080, safe: 64 },
  { id: 'ig-story', name: 'Instagram story', group: 'Social', width: 1080, height: 1920, safe: 110 },
  { id: 'linkedin', name: 'LinkedIn post', group: 'Social', width: 1200, height: 627, safe: 64 },
  { id: 'facebook', name: 'Facebook post', group: 'Social', width: 1200, height: 1500, safe: 64 },
  { id: 'yt-thumb', name: 'YouTube thumbnail', group: 'Video', width: 1280, height: 720, safe: 48 },
  { id: 'blog-cover', name: 'Blog cover', group: 'Web', width: 1200, height: 630, safe: 48 },
  { id: 'newsletter', name: 'Newsletter header', group: 'Email', width: 1200, height: 400, safe: 40 },
  { id: 'photo-footer', name: 'Photo footer', group: 'Marketing', width: 1600, height: 240, safe: 32 },
  { id: 'a4', name: 'A4 portrait', group: 'Print', width: 2480, height: 3508, safe: 120 },
];
