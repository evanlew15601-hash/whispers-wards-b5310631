import { motion } from 'framer-motion';
import heroImage from '@/assets/hero-throne.jpg';
import { useEffect, useMemo, useState } from 'react';
import { loadUqmWasmRuntime } from '@/game/engine/uqmWasmRuntime';
import { Button } from '@/components/ui/button';
import { useAmbience } from '@/audio/useAmbience';
import type { SaveSlotInfo } from '@/game/storage';

interface TitleScreenProps {
  onStart: () => void;
  onLoad?: () => void;
  slots?: SaveSlotInfo[];
  onContinue?: (slotId: number) => void;
}

const TitleScreen = ({ onStart, onLoad, slots = [], onContinue }: TitleScreenProps) => {
  useAmbience('title');

  const [uqmStatus, setUqmStatus] = useState<string>('Conversation core: loading…');

  const mostRecentSlotId = useMemo(() => {
    let best: { id: number; time: number } | null = null;

    for (const slot of slots) {
      if (!slot.meta) continue;

      const parsed = new Date(slot.meta.savedAt).getTime();
      const time = Number.isNaN(parsed) ? 0 : parsed;

      if (!best || time > best.time || (time === best.time && slot.id > best.id)) {
        best = { id: slot.id, time };
      }
    }

    return best?.id ?? null;
  }, [slots]);

  const canContinue = onContinue && mostRecentSlotId !== null;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await loadUqmWasmRuntime();
        if (!cancelled) setUqmStatus('Conversation core ready');
      } catch {
        if (!cancelled) setUqmStatus('Conversation core (basic)');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 px-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        <motion.div
          className="text-5xl animate-slow-pulse"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 1.5 }}
          aria-hidden="true"
        >
          ⚜
        </motion.div>

        <motion.h1
          className="font-display text-5xl font-bold tracking-widest gold-text-gradient sm:text-7xl md:text-8xl"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
        >
          CROWN
          <span className="block text-3xl font-normal tracking-[0.4em] text-foreground/60 sm:text-4xl md:text-5xl">
            &
          </span>
          CONCORD
        </motion.h1>

        <motion.p
          className="font-body max-w-lg text-lg italic text-muted-foreground sm:text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1.5 }}
        >
          "In the fractured realm, the sharpest blade is a well-chosen word."
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
        >
          {canContinue && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.99 }}>
              <Button
                size="lg"
                onClick={() => {
                  if (mostRecentSlotId !== null) onContinue?.(mostRecentSlotId);
                }}
                className="h-auto rounded-sm px-8 py-3 font-display text-sm tracking-[0.3em] uppercase"
              >
                Continue
              </Button>
            </motion.div>
          )}

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.99 }}>
            <Button
              size="lg"
              variant={canContinue ? 'secondary' : 'default'}
              onClick={onStart}
              className="h-auto rounded-sm px-8 py-3 font-display text-sm tracking-[0.3em] uppercase"
            >
              New Game
            </Button>
          </motion.div>

          {onLoad && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.99 }}>
              <Button
                size="lg"
                variant={canContinue ? 'outline' : 'secondary'}
                onClick={onLoad}
                className="h-auto rounded-sm px-8 py-3 font-display text-sm tracking-[0.3em] uppercase"
              >
                Load Game
              </Button>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          className="mt-16 text-xs font-display tracking-[0.5em] text-muted-foreground/40 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
        >
          High Fantasy Diplomacy
        </motion.div>

        <motion.div
          className="text-[10px] font-display tracking-[0.35em] text-muted-foreground/30 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.7, duration: 1 }}
        >
          {uqmStatus}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default TitleScreen;
