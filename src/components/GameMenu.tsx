import { useMemo, useState } from 'react';
import { SaveSlotInfo } from '@/game/storage';
import { useAudio } from '@/audio/useAudio';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import CodexPanel from '@/components/CodexPanel';

type GameMenuTab = 'save' | 'load' | 'campaign' | 'about';

interface GameMenuProps {
  slots: SaveSlotInfo[];
  onSave: (slotId: number) => void;
  onLoad: (slotId: number) => void;
  onDelete: (slotId: number) => void;
  engineLabel: string;
  onExitToTitle: () => void;
  onRestartCampaign: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  activeTab?: GameMenuTab;
  onActiveTabChange?: (tab: GameMenuTab) => void;
}

const formatSavedAt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const GameMenu = ({
  slots,
  onSave,
  onLoad,
  onDelete,
  engineLabel,
  onExitToTitle,
  onRestartCampaign,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  activeTab: activeTabProp,
  onActiveTabChange: onActiveTabChangeProp,
}: GameMenuProps) => {
  const { settings: audioSettings, patchSettings, playSfx } = useAudio();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChangeProp ?? setUncontrolledOpen;

  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<GameMenuTab>('save');
  const activeTab = activeTabProp ?? uncontrolledActiveTab;
  const setActiveTab = onActiveTabChangeProp ?? setUncontrolledActiveTab;

  const [confirmOverwriteSlotId, setConfirmOverwriteSlotId] = useState<number | null>(null);

  const anySaves = useMemo(() => slots.some(s => s.meta), [slots]);

  const doSave = (slotId: number) => {
    onSave(slotId);
    setConfirmOverwriteSlotId(null);
    setOpen(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (!next) setConfirmOverwriteSlotId(null);
      }}
    >
      <SheetTrigger asChild>
        <Button size="sm" variant="secondary">
          Menu
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-display tracking-[0.2em] uppercase">Game Menu</SheetTitle>
          <SheetDescription>Save, load, and manage your campaign.</SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as GameMenuTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="save" className="font-display text-xs tracking-[0.2em] uppercase">
              Save
            </TabsTrigger>
            <TabsTrigger value="load" className="font-display text-xs tracking-[0.2em] uppercase">
              Load
            </TabsTrigger>
            <TabsTrigger value="campaign" className="font-display text-xs tracking-[0.2em] uppercase">
              Campaign
            </TabsTrigger>
            <TabsTrigger value="about" className="font-display text-xs tracking-[0.2em] uppercase">
              About
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

          <TabsContent value="campaign" className="mt-4">
            <div className="grid gap-3">
              <div className="parchment-border rounded-sm bg-card p-4">
                <div className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  Campaign Actions
                </div>
                <div className="mt-3 flex flex-col gap-2">
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
                        <AlertDialogAction
                          onClick={() => {
                            onExitToTitle();
                            setOpen(false);
                          }}
                        >
                          Exit to Title
                        </AlertDialogAction>
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
                          onClick={() => {
                            onRestartCampaign();
                            setOpen(false);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Restart Campaign
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-4">
            <div className="grid gap-3">
              <div className="parchment-border rounded-sm bg-card p-4">
                <div className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">Engine</div>
                <div className="mt-1 text-sm text-card-foreground">{engineLabel}</div>
              </div>

              <div className="parchment-border rounded-sm bg-card p-4">
                <div className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">Audio</div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-card-foreground">Sound</div>
                    <div className="text-[11px] text-muted-foreground">UI cues and ambience.</div>
                  </div>

                  <Switch
                    checked={audioSettings.enabled}
                    onCheckedChange={checked => {
                      patchSettings({ enabled: checked });
                      if (checked) playSfx('ui.select');
                    }}
                    aria-label="Enable sound"
                  />
                </div>

                <div className="mt-4 grid gap-4">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-display tracking-[0.2em] text-muted-foreground uppercase">Master</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{Math.round(audioSettings.masterVolume * 100)}%</div>
                    </div>
                    <Slider
                      value={[Math.round(audioSettings.masterVolume * 100)]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => patchSettings({ masterVolume: (v ?? 0) / 100 })}
                      onValueCommit={() => playSfx('ui.select')}
                      disabled={!audioSettings.enabled}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-display tracking-[0.2em] text-muted-foreground uppercase">SFX</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{Math.round(audioSettings.sfxVolume * 100)}%</div>
                    </div>
                    <Slider
                      value={[Math.round(audioSettings.sfxVolume * 100)]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => patchSettings({ sfxVolume: (v ?? 0) / 100 })}
                      onValueCommit={() => playSfx('ui.select')}
                      disabled={!audioSettings.enabled}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-display tracking-[0.2em] text-muted-foreground uppercase">Ambience</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{Math.round(audioSettings.ambienceVolume * 100)}%</div>
                    </div>
                    <Slider
                      value={[Math.round(audioSettings.ambienceVolume * 100)]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => patchSettings({ ambienceVolume: (v ?? 0) / 100 })}
                      disabled={!audioSettings.enabled}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      To use authored loops, add <span className="font-mono">public/audio/ambience/title_regal.(ogg|mp3)</span> and <span className="font-mono">public/audio/ambience/game_intrigue.(ogg|mp3)</span>.
                    </div>
                  </div>
                </div>
              </div>

              <CodexPanel />

              <div className="parchment-border rounded-sm bg-card p-4">
                <div className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">Controls</div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>
                    <span className="font-mono">Esc</span> Toggle menu
                  </li>
                  <li>
                    <span className="font-mono">Space</span> / <span className="font-mono">Enter</span> Skip dialogue reveal
                  </li>
                  <li>
                    <span className="font-mono">1</span>–<span className="font-mono">9</span> Choose a response
                  </li>
                  <li>
                    <span className="font-mono">Ctrl</span>/<span className="font-mono">Cmd</span>+<span className="font-mono">S</span>{' '}
                    Open menu (Save)
                  </li>
                  <li>
                    <span className="font-mono">Ctrl</span>/<span className="font-mono">Cmd</span>+<span className="font-mono">O</span>{' '}
                    Open menu (Load)
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default GameMenu;
