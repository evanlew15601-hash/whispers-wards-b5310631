import { describe, expect, it } from 'vitest';
import { playSfx } from '@/audio/sfx';

describe('audio', () => {
  it('does not throw when AudioContext is unavailable (jsdom)', () => {
    expect(() => playSfx('ui.select', 0.5)).not.toThrow();
  });
});
