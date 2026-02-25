import { motion } from 'framer-motion';
import heroImage from '@/assets/hero-throne.jpg';

interface TitleScreenProps {
  onStart: () => void;
}

const TitleScreen = ({ onStart }: TitleScreenProps) => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 px-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        {/* Crown ornament */}
        <motion.div
          className="text-5xl animate-slow-pulse"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 1.5 }}
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

        <motion.button
          onClick={onStart}
          className="group relative mt-8 font-display text-lg tracking-[0.3em] text-primary transition-all hover:text-gold-glow sm:text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative z-10">BEGIN YOUR EMBASSY</span>
          <span className="absolute -bottom-1 left-0 h-px w-full bg-primary/30 transition-all group-hover:bg-primary/60" />
        </motion.button>

        <motion.div
          className="mt-16 text-xs tracking-[0.5em] text-muted-foreground/40 font-display uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
        >
          High Fantasy Diplomacy
        </motion.div>
      </motion.div>
    </div>
  );
};

export default TitleScreen;
