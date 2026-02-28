import type { MarkdownNode } from '@cocoar/vue-markdown-core';

export function headingDepth(node: MarkdownNode): 1 | 2 | 3 | 4 | 5 | 6 {
  const depth = node.attrs?.['depth'];
  if (typeof depth !== 'number') return 1;
  const value = Math.trunc(depth);
  if (value <= 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  if (value === 4) return 4;
  if (value === 5) return 5;
  return 6;
}

export function headingAnchor(node: MarkdownNode): string | null {
  const anchor = node.attrs?.['anchor'];
  return typeof anchor === 'string' && anchor.length > 0 ? anchor : null;
}

export function codeBlockLanguage(node: MarkdownNode): string {
  const language = node.attrs?.['language'];
  return typeof language === 'string' && language.trim().length > 0 ? language.trim() : 'text';
}

export function isOrderedList(node: MarkdownNode): boolean {
  return Boolean(node.attrs?.['ordered']);
}

export function listStart(node: MarkdownNode): number | null {
  const start = node.attrs?.['start'];
  return typeof start === 'number' ? start : null;
}

export function isTaskListItem(node: MarkdownNode): boolean {
  return typeof node.attrs?.['checked'] === 'boolean';
}

export function taskChecked(node: MarkdownNode): boolean {
  return node.attrs?.['checked'] === true;
}

export function linkUrl(node: MarkdownNode): string | null {
  const url = node.attrs?.['url'];
  return typeof url === 'string' && url.length > 0 ? url : null;
}

export function linkHref(node: MarkdownNode): string | null {
  const url = linkUrl(node);
  if (!url) return null;

  if (url.startsWith('#') && typeof window !== 'undefined') {
    return `${window.location.pathname}${window.location.search}${url}`;
  }

  return url;
}

export function linkTarget(node: MarkdownNode): string | null {
  const url = linkUrl(node);
  if (!url) return null;
  return isExternalLink(url) ? '_blank' : null;
}

export function linkRel(node: MarkdownNode): string | null {
  const url = linkUrl(node);
  if (!url) return null;
  return isExternalLink(url) ? 'noopener noreferrer' : null;
}

export function imageSrc(node: MarkdownNode): string | null {
  const url = node.attrs?.['url'];
  return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
}

export function imageAlt(node: MarkdownNode): string {
  const alt = node.attrs?.['alt'];
  return typeof alt === 'string' ? alt : '';
}

export function imageTitle(node: MarkdownNode): string | null {
  const title = node.attrs?.['title'];
  return typeof title === 'string' && title.trim().length > 0 ? title.trim() : null;
}

export function isTableColumnRightAligned(tableNode: MarkdownNode, columnIndex: number): boolean {
  return getTableColumnAlign(tableNode, columnIndex) === 'right';
}

export function isTableColumnCenterAligned(tableNode: MarkdownNode, columnIndex: number): boolean {
  return getTableColumnAlign(tableNode, columnIndex) === 'center';
}

export function unsupportedType(node: MarkdownNode): string {
  const originalType = node.attrs?.['originalType'];
  return typeof originalType === 'string' ? originalType : String(node.type);
}

function getTableColumnAlign(
  tableNode: MarkdownNode,
  columnIndex: number,
): 'left' | 'right' | 'center' | null {
  const align = tableNode.attrs?.['align'];
  if (!Array.isArray(align)) return null;

  const value = align[columnIndex];
  if (value === 'left' || value === 'right' || value === 'center') return value;
  return null;
}

function isExternalLink(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith('#')) return false;
  if (trimmed.startsWith('/')) return false;
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) return false;
  if (trimmed.startsWith('mailto:')) return false;
  if (trimmed.startsWith('tel:')) return false;

  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}
