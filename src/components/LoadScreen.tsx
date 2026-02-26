import { motion } from 'framer-motion';
import heroImage from '@/assets/hero-throne.jpg';
import { SaveSlotInfo } from '@/game/storage';
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

interface LoadScreenProps {
  slots: SaveSlotInfo[];
  onLoad: (slotId: number) => void;
  onDelete: (slotId: number) => void;
  onBack: () => void;
  onNewGame: () => void;
}

const formatSavedAt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const LoadScreen = ({ slots, onLoad, onDelete, onBack, onNewGame }: LoadScreenProps) => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />

      <motion.div
        className="relative z-10 w-full max-w-3xl px-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-[0.25em] gold-text-gradient uppercase">
              Load Game
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a save slot to resume your embassy.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button onClick={onNewGame}>New Game</Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {slots.map(slot => {
            const meta = slot.meta;
            const empty = !meta;

            const handleLoad = () => {
              if (!empty) onLoad(slot.id);
            };

            return (
              <div
                key={slot.id}
                className={`parchment-border rounded-sm bg-card p-4 flex flex-col gap-3 ${
                  empty ? '' : 'cursor-pointer hover:bg-card/80 transition-colors'
                }`}
                role={empty ? undefined : 'button'}
                tabIndex={empty ? undefined : 0}
                onClick={handleLoad}
                onKeyDown={e => {
                  if (empty) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLoad();
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
                      Slot {slot.id}
                    </div>
                    {empty ? (
                      <div className="mt-1 text-sm text-muted-foreground">Empty</div>
                    ) : (
                      <div className="mt-1 text-sm text-card-foreground">Turn {meta.turnNumber}</div>
                    )}
                    {!empty && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Saved {formatSavedAt(meta.savedAt)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={empty ? 'secondary' : 'default'}
                      disabled={empty}
                      onClick={e => {
                        e.stopPropagation();
                        handleLoad();
                      }}
                    >
                      Load
                    </Button>

                    {!empty && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={e => {
                              e.stopPropagation();
                            }}
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Slot {slot.id}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the saved game.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={e => {
                                e.stopPropagation();
                                onDelete(slot.id);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                {!empty && (
                  <div className="flex flex-wrap gap-2">
                    {meta.factions.map(f => (
                      <div
                        key={f.id}
                        className="rounded-sm bg-secondary px-2 py-1 text-[10px] text-secondary-foreground"
                        title={f.name}
                      >
                        <span className="font-display tracking-[0.12em] uppercase">
                          {f.name.split(' ')[0]}
                        </span>
                        <span className="ml-2 font-mono">
                          {f.reputation > 0 ? '+' : ''}{f.reputation}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default LoadScreen;
