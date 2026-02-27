export interface AudioSettings {
  enabled: boolean;
  masterVolume: number; // 0..1
  sfxVolume: number; // 0..1
  ambienceVolume: number; // 0..1
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  enabled: true,
  masterVolume: 0.8,
  sfxVolume: 0.7,
  ambienceVolume: 0.6,
};

const STORAGE_KEY = 'crown-concord.audio.v1';

export const loadAudioSettings = (): AudioSettings => {
  if (typeof localStorage === 'undefined') return DEFAULT_AUDIO_SETTINGS;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_AUDIO_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;

    return {
      enabled: parsed.enabled ?? DEFAULT_AUDIO_SETTINGS.enabled,
      masterVolume: clamp01(parsed.masterVolume ?? DEFAULT_AUDIO_SETTINGS.masterVolume),
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_AUDIO_SETTINGS.sfxVolume),
      ambienceVolume: clamp01(parsed.ambienceVolume ?? DEFAULT_AUDIO_SETTINGS.ambienceVolume),
    };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
};

export const saveAudioSettings = (settings: AudioSettings) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
