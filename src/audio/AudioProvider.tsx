import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { playSfx as playZzfxSfx, type SfxId } from '@/audio/sfx';
import { clamp01, DEFAULT_AUDIO_SETTINGS, loadAudioSettings, saveAudioSettings, type AudioSettings } from '@/audio/storage';
import { resumeZzfx } from '@/audio/zzfx';

export interface AudioApi {
  settings: AudioSettings;
  setSettings: (next: AudioSettings) => void;
  patchSettings: (patch: Partial<AudioSettings>) => void;
  playSfx: (id: SfxId) => void;
  unlockAudio: () => void;
}

const noop = () => {};

export const AudioContext = createContext<AudioApi>({
  settings: DEFAULT_AUDIO_SETTINGS,
  setSettings: noop,
  patchSettings: noop,
  playSfx: noop,
  unlockAudio: noop,
});

export const AudioProvider = ({ children }: PropsWithChildren) => {
  const [settings, setSettingsState] = useState<AudioSettings>(() => loadAudioSettings());

  const setSettings = useCallback((next: AudioSettings) => {
    setSettingsState(next);
    saveAudioSettings(next);
  }, []);

  const patchSettings = useCallback((patch: Partial<AudioSettings>) => {
    setSettings(prev => {
      const next: AudioSettings = {
        enabled: patch.enabled ?? prev.enabled,
        masterVolume: clamp01(patch.masterVolume ?? prev.masterVolume),
        sfxVolume: clamp01(patch.sfxVolume ?? prev.sfxVolume),
        ambienceVolume: clamp01(patch.ambienceVolume ?? prev.ambienceVolume),
      };

      return next;
    });
  }, [setSettings]);

  const unlockAudio = useCallback(() => {
    void resumeZzfx();
  }, []);

  useEffect(() => {
    const onFirstGesture = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };

    window.addEventListener('pointerdown', onFirstGesture, { capture: true, once: true });
    window.addEventListener('keydown', onFirstGesture, { capture: true, once: true });

    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
  }, [unlockAudio]);

  const playSfx = useCallback((id: SfxId) => {
    if (!settings.enabled) return;

    const volume = clamp01(settings.masterVolume * settings.sfxVolume);
    playZzfxSfx(id, volume);
  }, [settings]);

  const api = useMemo<AudioApi>(() => ({
    settings,
    setSettings,
    patchSettings,
    playSfx,
    unlockAudio,
  }), [settings, setSettings, patchSettings, playSfx, unlockAudio]);

  return (
    <AudioContext.Provider value={api}>
      {children}
    </AudioContext.Provider>
  );
};
