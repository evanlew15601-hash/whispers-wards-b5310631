import { motion } from 'framer-motion';
import { GameState, DialogueChoice } from '@/game/types';
import DialoguePanel from '@/components/DialoguePanel';
import FactionPanel from '@/components/FactionPanel';
import InfoPanel from '@/components/InfoPanel';

interface GameScreenProps {
  state: GameState;
  makeChoice: (choice: DialogueChoice) => void;
  resetGame: () => void;
}

const GameScreen = ({ state, makeChoice, resetGame }: GameScreenProps) => {
  const conversationEnded = !state.currentDialogue;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-6 py-3 backdrop-blur-sm">
        <h1 className="font-display text-sm tracking-[0.4em] gold-text-gradient uppercase">
          Crown & Concord
        </h1>
        <div className="flex items-center gap-4">
          <span className="font-display text-xs text-muted-foreground">Turn {state.turnNumber}</span>
          <button onClick={resetGame} className="font-display text-xs tracking-wider text-muted-foreground transition-colors hover:text-destructive">
            Restart
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6 lg:flex-row">
        <motion.aside className="w-full shrink-0 lg:w-72" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <FactionPanel factions={state.factions} />
        </motion.aside>

        <main className="flex-1 min-w-0">
          {conversationEnded ? (
            <motion.div className="flex flex-col items-center justify-center gap-6 py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="font-display text-lg text-muted-foreground text-center">The conversation has reached its conclusion.</p>
              <p className="font-body text-sm italic text-muted-foreground/60 text-center max-w-md">Your choices have shaped the realm's future. The factions remember.</p>
              <button onClick={resetGame} className="font-display text-sm tracking-[0.2em] text-primary hover:text-gold-glow transition-colors border border-primary/30 px-6 py-2 rounded-sm hover:border-primary/60">
                Begin Again
              </button>
            </motion.div>
          ) : (
            <DialoguePanel node={state.currentDialogue!} onChoice={makeChoice} knownSecrets={state.knownSecrets} />
          )}
        </main>

        <motion.aside className="w-full shrink-0 lg:w-72" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <InfoPanel knownSecrets={state.knownSecrets} turnNumber={state.turnNumber} log={state.log} />
        </motion.aside>
      </div>
    </div>
  );
};

export default GameScreen;
