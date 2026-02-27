import { setZzfxVolume, zzfx } from '@/audio/zzfx';

export type SfxId =
  | 'ui.hover'
  | 'ui.select'
  | 'ui.locked'
  | 'ui.skip'
  | 'ui.page';

// ZzFX parameter arrays. These are intentionally short; missing trailing values
// fall back to the defaults in zzfx().
const SFX_PARAMS: Record<SfxId, readonly number[]> = {
  // A soft "courtly" tick.
  'ui.hover': [0.25, 0.02, 900, 0.01, 0.01, 0.03, 2, 1.6, -2.2],

  // Confirm / choice select.
  'ui.select': [0.35, 0.03, 540, 0.02, 0.03, 0.12, 1, 1.8, -5.5, 0.5],

  // Locked / cannot.
  'ui.locked': [0.5, 0.02, 160, 0.01, 0.04, 0.1, 2, 2.5, -8.4, 0.5, 0.2],

  // Skip text reveal.
  'ui.skip': [0.2, 0.02, 1200, 0.01, 0.01, 0.04, 1, 1.2, -3.5, 0.2],

  // New dialogue node "page turn" (noise-ish).
  'ui.page': [0.25, 0.01, 240, 0.01, 0.02, 0.14, 4, 1.1, -0.2, 0, 0.05],
};

export const playSfx = (id: SfxId, volume: number) => {
  setZzfxVolume(volume);
  zzfx(...(SFX_PARAMS[id] as unknown as number[]));
};
