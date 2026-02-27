import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { playSfx as playZzfxSfx, type SfxId } from '@/audio/sfx';
import { clamp01, DEFAULT_AUDIO_SETTINGS, loadAudioSettings, saveAudioSettings, type AudioSettings } from '@/audio/storage';
import { getHowlerRuntime } from '@/audio/howlerRuntime';
import { getProceduralAmbienceUrl, type AmbienceId } from '@/audio/proceduralAmbience';
import { resumeZzfx } from '@/audio/zzfx';

export interface AudioApi {
  settings: AudioSettings;
  setSettings: (next: AudioSettings) => void;
  patchSettings: (patch: Partial<AudioSettings>) => void;
  playSfx: (id: SfxId) => void;
  setAmbience: (id: AmbienceId | null) => void;
  unlockAudio: () => void;
}

const noop = () => {};

export const AudioContext = createContext<AudioApi>({
  settings: DEFAULT_AUDIO_SETTINGS,
  setSettings: noop,
  patchSettings: noop,
  playSfx: noop,
  setAmbience: noop,
  unlockAudio: noop,
});

export const AudioProvider = ({ children }: PropsWithChildren) => {
  const [settings, setSettingsState] = useState<AudioSettings>(() => loadAudioSettings());
  const [ambienceId, setAmbienceId] = useState<AmbienceId | null>(null);

  const ambienceRef = useRef<Howl | null>(null);
  const ambienceKeyRef = useRef<AmbienceId | null>(null);
  const fadeOutTimerRef = useRef<number | null>(null);

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

  const setAmbience = useCallback((id: AmbienceId | null) => {
    setAmbienceId(id);
  }, []);

  const unlockAudio = useCallback(() => {
    void resumeZzfx();

    const runtime = getHowlerRuntime();
    const ctx = runtime?.Howler?.ctx;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => undefined);
    }
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

  useEffect(() => {
    const runtime = getHowlerRuntime();
    if (!runtime) return;

    const { Howl, Howler } = runtime;

    Howler.volume(settings.masterVolume);

    const current = ambienceRef.current;
    const currentKey = ambienceKeyRef.current;

    if (!settings.enabled || ambienceId == null) {
      Howler.mute(true);

      if (current) {
        const from = current.volume();
        current.fade(from, 0, 500);

        if (fadeOutTimerRef.current != null) window.clearTimeout(fadeOutTimerRef.current);
        fadeOutTimerRef.current = window.setTimeout(() => {
          current.stop();
          current.unload();
          fadeOutTimerRef.current = null;
        }, 520);

        ambienceRef.current = null;
        ambienceKeyRef.current = null;
      }

      return;
    }

    Howler.mute(false);

    const target = clamp01(settings.ambienceVolume);

    if (current && currentKey === ambienceId) {
      current.volume(target);
      return;
    }

    const url = getProceduralAmbienceUrl(ambienceId);
    const next = new Howl({ src: [url], loop: true, volume: 0 });
    next.play();
    next.fade(0, target, 800);

    ambienceRef.current = next;
    ambienceKeyRef.current = ambienceId;

    if (current) {
      const from = current.volume();
      current.fade(from, 0, 800);

      if (fadeOutTimerRef.current != null) window.clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = window.setTimeout(() => {
        current.stop();
        current.unload();
        fadeOutTimerRef.current = null;
      }, 820);
    }

    return () => {
      if (fadeOutTimerRef.current != null) {
        window.clearTimeout(fadeOutTimerRef.current);
        fadeOutTimerRef.current = null;
      }
    };
  }, [settings.enabled, settings.masterVolume, settings.ambienceVolume, ambienceId]);

  useEffect(() => () => {
    const current = ambienceRef.current;
    if (!current) return;

    current.stop();
    current.unload();
    ambienceRef.current = null;
    ambienceKeyRef.current = null;

    if (fadeOutTimerRef.current != null) {
      window.clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = null;
    }
  }, []);

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
    setAmbience,
    unlockAudio,
  }), [settings, setSettings, patchSettings, playSfx, setAmbience, unlockAudio]);

  return (
    <AudioContext.Provider value={api}>
      {children}
    </AudioContext.Provider>
  );
};
