import type { Artboard, DesignObject } from '../types';
import type { SizePreset } from '../presets';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;

function isFullBleed(object: DesignObject, source: Artboard) {
  return object.x <= source.width * .08
    && object.y <= source.height * .08
    && object.width >= source.width * .8
    && object.height >= source.height * .8;
}

function isStructuralContainer(object: DesignObject, source: Artboard) {
  const genericFrameName = /^(frame|group|section|slide)(\s|$)/i.test(object.name.trim());
  const occupiesLargeArea = object.width * object.height >= source.width * source.height * .08
    && (object.width >= source.width * .7 || object.height >= source.height * .7);
  const flexibleTextBox = object.type === 'text'
    && object.width >= source.width * .8
    && object.height <= source.height * .3;
  return (occupiesLargeArea && (object.type === 'rect' || genericFrameName)) || flexibleTextBox;
}

function cloneObject(object: DesignObject): DesignObject {
  return { ...structuredClone(object), id: crypto.randomUUID() };
}

/**
 * Creates an independent, composition-aware draft from the master artboard.
 * The local planner uses aspect ratio, layer type, text hierarchy and image area
 * to reflow content; it never changes copy or source assets.
 */
export function resizeArtboard(source: Artboard, preset: SizePreset): Artboard {
  const targetRatio = preset.width / preset.height;
  const sourceRatio = source.width / source.height;
  const visibleObjects = source.objects.filter((object) => object.visible !== false);
  const fullBleed = visibleObjects.filter((object) => isFullBleed(object, source));
  const foreground = source.objects.filter((object) => !fullBleed.includes(object));
  const isWideReflow = targetRatio >= 1.3 && sourceRatio < targetRatio * .78;
  const objects = isWideReflow
    ? composeLandscape(source, preset, fullBleed, foreground)
    : composeFlexible(source, preset, fullBleed, foreground);

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

function composeFlexible(source: Artboard, target: SizePreset, backgrounds: DesignObject[], content: DesignObject[]) {
  // Figma frame/group wrappers often span most of the source canvas without
  // representing actual foreground content. Keep them editable, but don't let
  // their empty geometry force every child to remain tiny after a resize.
  const layoutContent = content.filter((object) => object.visible !== false && !isStructuralContainer(object, source));
  const boundsContent = layoutContent.length ? layoutContent : content;
  const bounds = boundsContent.reduce((box, object) => ({
    left: Math.min(box.left, object.x),
    top: Math.min(box.top, object.y),
    right: Math.max(box.right, object.x + object.width),
    bottom: Math.max(box.bottom, object.y + object.height),
  }), { left: source.width, top: source.height, right: 0, bottom: 0 });
  const sourceContentWidth = Math.max(1, bounds.right - bounds.left);
  const sourceContentHeight = Math.max(1, bounds.bottom - bounds.top);
  const safeX = target.width * .06;
  const safeY = target.height * .055;
  const contentScale = clamp(Math.min((target.width - safeX * 2) / sourceContentWidth, (target.height - safeY * 2) / sourceContentHeight), .4, 3.5);

  const backgroundLayers = backgrounds.map((object) => ({
    ...cloneObject(object), x: 0, y: 0, width: target.width, height: target.height,
  }));

  const resized = content.map((sourceObject) => {
    const object = cloneObject(sourceObject);
    object.width = Math.max(1, round(sourceObject.width * contentScale));
    object.height = Math.max(1, round(sourceObject.height * contentScale));
    if (object.type === 'text') {
      const maxWidth = target.width - safeX * 2;
      object.width = Math.min(maxWidth, object.width);
      if (object.fontSize) object.fontSize = round(clamp(object.fontSize * contentScale, 8, Math.min(target.width, target.height) * .18));
    }

    const contentWidth = sourceContentWidth * contentScale;
    const contentHeight = sourceContentHeight * contentScale;
    const originX = (target.width - contentWidth) / 2 - bounds.left * contentScale;
    const originY = (target.height - contentHeight) / 2 - bounds.top * contentScale;
    object.x = round(clamp(originX + sourceObject.x * contentScale, safeX, target.width - safeX - object.width));
    object.y = round(clamp(originY + sourceObject.y * contentScale, safeY, target.height - safeY - object.height));
    return object;
  });

  return [...backgroundLayers, ...resized];
}

function composeLandscape(source: Artboard, target: SizePreset, backgrounds: DesignObject[], content: DesignObject[]) {
  const marginX = target.width * .07;
  const marginY = target.height * .09;
  const layoutContent = content.filter((object) => object.visible !== false && !isStructuralContainer(object, source));
  const imageCandidates = layoutContent.filter((object) => object.type === 'image');
  const heroImage = imageCandidates.sort((a, b) => b.width * b.height - a.width * a.height)[0];
  const textObjects = layoutContent.filter((object) => object.type === 'text');
  const maxFont = Math.max(1, ...textObjects.map((object) => object.fontSize ?? 0));
  const hasHero = Boolean(heroImage);
  const textColumnWidth = target.width * (hasHero ? .47 : .78);
  const rightStart = target.width * .57;
  const rightWidth = target.width - rightStart - marginX;
  const rightHeight = target.height - marginY * 2;
  const baseScale = clamp(Math.sqrt((target.width / source.width) * (target.height / source.height)), .65, 1.5);

  const transformedText = textObjects.map((sourceObject) => {
    const object = cloneObject(sourceObject);
    const isHeadline = (object.fontSize ?? 0) >= maxFont * .68 || (object.text?.length ?? 0) > 70;
    const sourceY = (sourceObject.y + sourceObject.height / 2) / source.height;
    object.width = round(Math.min(textColumnWidth, Math.max(sourceObject.width * baseScale, textColumnWidth * (isHeadline ? .85 : .55))));
    object.height = round(Math.max(sourceObject.height * baseScale, (object.fontSize ?? 18) * (isHeadline ? 2.2 : 1.35)));
    if (object.fontSize) object.fontSize = round(clamp(object.fontSize * baseScale * (isHeadline ? 1.12 : 1), 9, target.height * (isHeadline ? .11 : .06)));
    object.x = marginX;
    object.y = round(clamp(marginY + sourceY * rightHeight - object.height / 2, marginY, target.height - marginY - object.height));
    return object;
  });

  const hero = heroImage ? (() => {
    const object = cloneObject(heroImage);
    const scale = Math.min(rightWidth / Math.max(1, heroImage.width), rightHeight / Math.max(1, heroImage.height));
    object.width = round(heroImage.width * scale);
    object.height = round(heroImage.height * scale);
    object.x = round(rightStart + (rightWidth - object.width) / 2);
    object.y = round(marginY + (rightHeight - object.height) / 2);
    return object;
  })() : null;

  const otherContent = content.filter((object) => object.type !== 'text' && object !== heroImage).map((sourceObject) => {
    const object = cloneObject(sourceObject);
    const pairedText = textObjects.find((text) => sourceObject.type === 'rect'
      && text.x >= sourceObject.x - source.width * .025
      && text.y >= sourceObject.y - source.height * .025
      && text.x + text.width <= sourceObject.x + sourceObject.width + source.width * .025
      && text.y + text.height <= sourceObject.y + sourceObject.height + source.height * .025);
    const onRight = !pairedText && hasHero && (sourceObject.x + sourceObject.width / 2) / source.width > .52;
    const zoneX = onRight ? rightStart : marginX;
    const zoneWidth = onRight ? rightWidth : textColumnWidth;
    const zoneScale = clamp(Math.min(zoneWidth / Math.max(1, sourceObject.width), rightHeight / Math.max(1, sourceObject.height), baseScale), .4, 1.35);
    object.width = Math.max(1, round(sourceObject.width * zoneScale));
    object.height = Math.max(1, round(sourceObject.height * zoneScale));
    if (pairedText) {
      const paired = transformedText.find((item) => item.name === pairedText.name);
      if (paired) {
        object.x = round(paired.x - (pairedText.x - sourceObject.x) * zoneScale);
        object.y = round(paired.y - (pairedText.y - sourceObject.y) * zoneScale);
      }
    } else {
      const sourceCenterY = (sourceObject.y + sourceObject.height / 2) / source.height;
      const sourceCenterX = (sourceObject.x + sourceObject.width / 2) / source.width;
      object.x = round(clamp(zoneX + sourceCenterX * zoneWidth - object.width / 2, zoneX, zoneX + zoneWidth - object.width));
      object.y = round(clamp(marginY + sourceCenterY * rightHeight - object.height / 2, marginY, target.height - marginY - object.height));
    }
    return object;
  });

  const backgroundLayers = backgrounds.map((object) => ({ ...cloneObject(object), x: 0, y: 0, width: target.width, height: target.height }));
  const orderedForeground = source.objects
    .filter((object) => !backgrounds.includes(object))
    .map((object) => transformedText.find((item) => item.name === object.name)
      ?? (heroImage === object ? hero : null)
      ?? otherContent.find((item) => item.name === object.name))
    .filter((object): object is DesignObject => Boolean(object));
  return [...backgroundLayers, ...orderedForeground];
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
