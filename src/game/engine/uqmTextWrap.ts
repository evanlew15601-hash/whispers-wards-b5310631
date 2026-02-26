import { loadUqmWasmRuntime } from './uqmWasmRuntime';

type LineFitCharsFn = (text: string, maxWidth: number) => number;

function jsLineFitChars(text: string, maxWidth: number): number {
  if (text.length <= maxWidth) return text.length;

  const slice = text.slice(0, maxWidth);
  const lastSpace = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('\t'));
  if (lastSpace > 0) return lastSpace + 1;

  return maxWidth;
}

function wrapLine(text: string, maxWidth: number, lineFitChars: LineFitCharsFn): string[] {
  const lines: string[] = [];

  let remaining = text;
  while (remaining.length > 0) {
    const fitRaw = lineFitChars(remaining, maxWidth);
    const fit = Math.max(1, Math.min(remaining.length, Number.isFinite(fitRaw) ? fitRaw : 0));

    const chunk = remaining.slice(0, fit);
    lines.push(chunk.trimEnd());

    remaining = remaining.slice(fit);
    if (remaining.length > 0) remaining = remaining.replace(/^[ \t]+/, '');
  }

  return lines.length ? lines : [''];
}

function wrapTextWithLineFit(text: string, maxWidth: number, lineFitChars: LineFitCharsFn): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = normalized.split('\n');

  const out: string[] = [];
  for (const rawLine of rawLines) {
    if (rawLine === '') {
      out.push('');
      continue;
    }

    out.push(...wrapLine(rawLine, maxWidth, lineFitChars));
  }

  return out;
}

export function wrapTextLinesJs(text: string, maxWidth: number): string[] {
  const width = Math.max(1, Math.floor(maxWidth));
  return wrapTextWithLineFit(text, width, jsLineFitChars);
}

export async function wrapTextLinesUqm(text: string, maxWidth: number): Promise<string[]> {
  const width = Math.max(1, Math.floor(maxWidth));

  try {
    const uqm = await loadUqmWasmRuntime();
    return wrapTextWithLineFit(text, width, uqm.lineFitChars);
  } catch {
    return wrapTextLinesJs(text, width);
  }
}

export function splitWrappedLinesIntoParagraphs(lines: string[]): string[][] {
  const paragraphs: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line === '') {
      if (current.length) paragraphs.push(current);
      current = [];
      continue;
    }

    current.push(line);
  }

  if (current.length || paragraphs.length === 0) paragraphs.push(current);
  return paragraphs;
}
