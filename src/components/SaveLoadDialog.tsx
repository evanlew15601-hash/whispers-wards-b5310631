import { useMemo, useState } from 'react';
import { SaveSlotInfo } from '@/game/storage';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

interface SaveLoadDialogProps {
  slots: SaveSlotInfo[];
  onSave: (slotId: number) => void;
  onLoad: (slotId: number) => void;
  onDelete: (slotId: number) => void;
}

const formatSavedAt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const SaveLoadDialog = ({ slots, onSave, onLoad, onDelete }: SaveLoadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('save');
  const [confirmOverwriteSlotId, setConfirmOverwriteSlotId] = useState<number | null>(null);

  const anySaves = useMemo(() => slots.some(s => s.meta), [slots]);

  const doSave = (slotId: number) => {
    onSave(slotId);
    setConfirmOverwriteSlotId(null);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (!next) setConfirmOverwriteSlotId(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Save / Load
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-[0.2em] uppercase">Save & Load</DialogTitle>
          <DialogDescription>Manage local save slots. Saves are stored in your browser.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'save' | 'load')} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="save" className="flex-1 font-display text-xs tracking-[0.2em] uppercase">
              Save
            </TabsTrigger>
            <TabsTrigger value="load" className="flex-1 font-display text-xs tracking-[0.2em] uppercase">
              Load
            </TabsTrigger>
          </TabsList>

          <TabsContent value="save" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {slots.map(slot => (
                <div key={slot.id} className="parchment-border rounded-sm bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
                        Slot {slot.id}
                      </div>
                      {slot.meta ? (
                        <div className="mt-1 text-sm text-card-foreground">Turn {slot.meta.turnNumber}</div>
                      ) : (
                        <div className="mt-1 text-sm text-muted-foreground">Empty</div>
                      )}
                      {slot.meta && (
                        <div className="mt-1 text-[11px] text-muted-foreground">Saved {formatSavedAt(slot.meta.savedAt)}</div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        if (slot.meta) {
                          setConfirmOverwriteSlotId(slot.id);
                        } else {
                          doSave(slot.id);
                        }
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <AlertDialog
              open={confirmOverwriteSlotId !== null}
              onOpenChange={next => {
                if (!next) setConfirmOverwriteSlotId(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Overwrite save?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This slot already contains a save. Overwriting cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (confirmOverwriteSlotId != null) doSave(confirmOverwriteSlotId);
                    }}
                  >
                    Overwrite
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="load" className="mt-4">
            {!anySaves && (
              <div className="text-sm text-muted-foreground">
                No saves yet. Use the <span className="font-semibold">Save</span> tab to create one.
              </div>
            )}

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {slots.map(slot => {
                const meta = slot.meta;
                const empty = !meta;

                return (
                  <div key={slot.id} className="parchment-border rounded-sm bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
                          Slot {slot.id}
                        </div>
                        {empty ? (
                          <div className="mt-1 text-sm text-muted-foreground">Empty</div>
                        ) : (
                          <>
                            <div className="mt-1 text-sm text-card-foreground">Turn {meta.turnNumber}</div>
                            <div className="mt-1 text-[11px] text-muted-foreground">Saved {formatSavedAt(meta.savedAt)}</div>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant={empty ? 'secondary' : 'default'}
                          disabled={empty}
                          onClick={() => {
                            onLoad(slot.id);
                            setOpen(false);
                          }}
                        >
                          Load
                        </Button>

                        {!empty && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
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
                                  onClick={() => {
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
                      <div className="mt-3 flex flex-wrap gap-2">
                        {meta.factions.map(f => (
                          <div
                            key={f.id}
                            className="rounded-sm bg-secondary px-2 py-1 text-[10px] text-secondary-foreground"
                            title={f.name}
                          >
                            <span className="font-display tracking-[0.12em] uppercase">{f.name.split(' ')[0]}</span>
                            <span className="ml-2 font-mono">{f.reputation > 0 ? '+' : ''}{f.reputation}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SaveLoadDialog;
