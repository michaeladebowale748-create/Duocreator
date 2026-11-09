export interface SizePreset {
  id: string;
  name: string;
  group: string;
  width: number;
  height: number;
  safe?: number;
}

export const presets: SizePreset[] = [
  { id: 'ig-post', name: 'Instagram post', group: 'Social', width: 1080, height: 1350, safe: 64 },
  { id: 'ig-story', name: 'Instagram story', group: 'Social', width: 1080, height: 1920, safe: 110 },
  { id: 'blog-thumbnail', name: 'Blog thumbnail', group: 'Web', width: 1200, height: 630, safe: 48 },
  { id: 'newsletter-thumbnail', name: 'Newsletter thumbnail', group: 'Email', width: 1200, height: 675, safe: 48 },
];
