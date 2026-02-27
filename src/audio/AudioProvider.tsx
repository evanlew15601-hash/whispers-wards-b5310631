import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { playSfx as playZzfxSfx, type SfxId } from '@/audio/sfx';
import { clamp01, DEFAULT_AUDIO_SETTINGS, loadAudioSettings, saveAudioSettings, type AudioSettings } from '@/audio/storage';
import { getHowlerRuntime } from '@/audio/howlerRuntime';
import { getProceduralAmbienceUrl, type AmbienceId } from '@/audio/proceduralAmbience';
import { getAuthoredAmbienceSources } from '@/audio/ambienceSources';
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

    const start = (howl: Howl) => {
      if (ambienceRef.current !== howl) return;
      howl.play();
      howl.fade(0, target, 800);
    };

    // Always start with a procedural bed immediately (no network dependency).
    const proceduralUrl = getProceduralAmbienceUrl(ambienceId);
    const procedural = new Howl({ src: [proceduralUrl], loop: true, volume: 0 });

    ambienceRef.current = procedural;
    ambienceKeyRef.current = ambienceId;
    start(procedural);

    // If authored audio exists locally, it will load quickly and replace the procedural bed.
    // We load sources one-at-a-time to allow fallback when a preferred format is missing.
    const authored = getAuthoredAmbienceSources(ambienceId);
    if (authored.length) {
      const tryLoadAuthored = (idx: number) => {
        if (idx >= authored.length) return;

        const src = authored[idx];
        const candidate = new Howl({
          src: [src],
          loop: true,
          volume: 0,
          onload: () => {
            // Only swap if this ambience is still current and still using the procedural bed.
            if (ambienceRef.current !== procedural || ambienceKeyRef.current !== ambienceId) {
              candidate.unload();
              return;
            }

            candidate.play();
            candidate.fade(0, target, 800);

            const from = procedural.volume();
            procedural.fade(from, 0, 800);
            window.setTimeout(() => {
              procedural.stop();
              procedural.unload();
            }, 820);

            ambienceRef.current = candidate;
            ambienceKeyRef.current = ambienceId;
          },
          onloaderror: () => {
            candidate.unload();
            tryLoadAuthored(idx + 1);
          },
        });
      };

      tryLoadAuthored(0);
    }

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
