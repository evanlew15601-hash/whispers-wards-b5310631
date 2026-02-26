import { describe, expect, it, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('uqmTextWrap', () => {
  it('falls back to JS wrapper when wasm runtime is unavailable (deterministic)', async () => {
    vi.doMock('./uqmWasmRuntime', () => ({
      loadUqmWasmRuntime: () => Promise.reject(new Error('no wasm')),
    }));

    const { wrapTextLinesJs, wrapTextLinesUqm } = await import('./uqmTextWrap');

    const text = 'Hello from UQM\n\nSecond paragraph here.';
    const width = 8;

    const js = wrapTextLinesJs(text, width);
    const a = await wrapTextLinesUqm(text, width);
    const b = await wrapTextLinesUqm(text, width);

    expect(a).toEqual(js);
    expect(b).toEqual(a);
    expect(a).toContain('');
  });

  it('uses lineFitChars when wasm runtime is available', async () => {
    const lineFitChars = vi.fn((text: string, maxWidth: number) => {
      if (text.length <= maxWidth) return text.length;
      const slice = text.slice(0, maxWidth);
      const idx = slice.lastIndexOf(' ');
      return idx > 0 ? idx + 1 : maxWidth;
    });

    vi.doMock('./uqmWasmRuntime', () => ({
      loadUqmWasmRuntime: () => Promise.resolve({ lineFitChars }),
    }));

    const { wrapTextLinesUqm } = await import('./uqmTextWrap');

    const lines = await wrapTextLinesUqm('Hello from UQM', 6);

    expect(lineFitChars).toHaveBeenCalled();
    expect(lines).toEqual(['Hello', 'from', 'UQM']);
  });
});
