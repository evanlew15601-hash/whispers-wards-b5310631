import { motion } from 'framer-motion';
import { GameState, DialogueChoice } from '@/game/types';
import { SaveSlotInfo } from '@/game/storage';
import DialoguePanel from '@/components/DialoguePanel';
import FactionPanel from '@/components/FactionPanel';
import InfoPanel from '@/components/InfoPanel';
import SaveLoadDialog from '@/components/SaveLoadDialog';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface GameScreenProps {
  state: GameState;
  engineLabel: string;
  makeChoice: (choice: DialogueChoice) => void;
  resetGame: () => void;
  saveSlots: SaveSlotInfo[];
  saveToSlot: (slotId: number) => void;
  loadFromSlot: (slotId: number) => void;
  deleteSlot: (slotId: number) => void;
  exitToTitle: () => void;
  enterPendingEncounter: () => void;
}

const GameScreen = ({
  state,
  engineLabel,
  makeChoice,
  resetGame,
  saveSlots,
  saveToSlot,
  loadFromSlot,
  deleteSlot,
  exitToTitle,
  enterPendingEncounter,
}: GameScreenProps) => {
  const conversationEnded = !state.currentDialogue;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-6 py-3 backdrop-blur-sm">
        <h1 className="font-display text-sm tracking-[0.4em] gold-text-gradient uppercase">
          Crown & Concord
        </h1>
        <div className="flex items-center gap-3">
          <span className="font-display text-xs text-muted-foreground">Turn {state.turnNumber}</span>
          <span className="font-display text-[10px] tracking-[0.22em] text-muted-foreground/70 uppercase">
            Engine: {engineLabel}
          </span>

          <SaveLoadDialog
            slots={saveSlots}
            onSave={saveToSlot}
            onLoad={loadFromSlot}
            onDelete={deleteSlot}
          />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost">
                Exit to Title
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Exit to Title</AlertDialogTitle>
                <AlertDialogDescription>
                  Return to the title screen. Make sure you have saved if you want to keep your progress.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={exitToTitle}>Exit to Title</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                Restart Campaign
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restart Campaign</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset your current campaign. Make sure you have saved if you want to keep your progress.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={resetGame}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Restart Campaign
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
              <Button
                onClick={resetGame}
                variant="outline"
                className="h-auto rounded-sm border-primary/30 px-6 py-2 font-display text-sm tracking-[0.2em] text-primary transition-colors hover:border-primary/60 hover:text-gold-glow"
              >
                Begin Again
              </Button>
            </motion.div>
          ) : (
            <DialoguePanel
              node={state.currentDialogue!}
              onChoice={makeChoice}
              knownSecrets={state.knownSecrets}
              factions={state.factions}
            />
          )}
        </main>

        <motion.aside className="w-full shrink-0 lg:w-72" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <InfoPanel
            knownSecrets={state.knownSecrets}
            turnNumber={state.turnNumber}
            log={state.log}
            world={state.world}
            factions={state.factions}
            pendingEncounter={state.pendingEncounter}
            canAddressEncounter={state.currentDialogue?.id === 'concord-hub'}
            onAddressEncounter={enterPendingEncounter}
          />
        </motion.aside>
      </div>
    </div>
  );
};

export default GameScreen;
