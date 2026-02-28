import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAmbience } from '@/audio/useAmbience';
import { GameState, DialogueChoice } from '@/game/types';
import { SaveSlotInfo } from '@/game/storage';
import DialoguePanel from '@/components/DialoguePanel';
import FactionPanel from '@/components/FactionPanel';
import InfoPanel from '@/components/InfoPanel';
import GameMenu from '@/components/GameMenu';
import { Button } from '@/components/ui/button';

import type { ChoiceUiHint } from '@/game/engine/conversationEngine';

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
  choiceLockedFlags: boolean[] | null;
  choiceUiHints: ChoiceUiHint[] | null;
}

type GameMenuTab = 'save' | 'load' | 'campaign' | 'about';

const isUserTyping = () => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;

  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;

  return el.isContentEditable;
};

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
  choiceLockedFlags,
  choiceUiHints,
}: GameScreenProps) => {
  useAmbience('game');

  const conversationEnded = !state.currentDialogue;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTab, setMenuTab] = useState<GameMenuTab>('save');

  const isEncounterDialogue = state.currentDialogue?.id.startsWith('encounter:') ?? false;
  const canAddressEncounter = Boolean(state.pendingEncounter && !isEncounterDialogue);
  const shouldShowEncounterPrompt = Boolean(state.pendingEncounter && !isEncounterDialogue);

  const encounterTurnsLeft = state.pendingEncounter ? state.pendingEncounter.expiresOnTurn - state.turnNumber : null;
  const encounterLocationLabel = (() => {
    const enc = state.pendingEncounter;
    if (!enc) return null;

    if (enc.routeId) {
      const routeName = state.world.tradeRoutes[enc.routeId]?.name ?? enc.routeId;
      return `Route: ${routeName}`;
    }

    if (enc.regionId) {
      const regionName = state.world.regions[enc.regionId]?.name ?? enc.regionId;
      return `Region: ${regionName}`;
    }

    return null;
  })();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      const key = e.key?.toLowerCase();
      if (!key) return;

      if (isUserTyping()) return;

      const mod = e.ctrlKey || e.metaKey;

      if (key === 'escape') {
        setMenuOpen(prev => !prev);
        return;
      }

      if (mod && key === 's') {
        e.preventDefault();
        setMenuTab('save');
        setMenuOpen(true);
        return;
      }

      if (mod && key === 'o') {
        e.preventDefault();
        setMenuTab('load');
        setMenuOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(900px circle at 50% -10%, hsl(var(--gold-glow) / 0.12), transparent 55%), radial-gradient(700px circle at 12% 110%, hsl(var(--faction-verdant) / 0.08), transparent 60%), radial-gradient(800px circle at 110% 40%, hsl(var(--faction-ember) / 0.08), transparent 60%)',
        }}
      />
      <div className="pointer-events-none fixed inset-0 opacity-25 cc-dialogue-grain" />

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-6 py-3 backdrop-blur-sm">
        <h1 className="font-display text-sm tracking-[0.4em] gold-text-gradient uppercase">
          Crown & Concord
        </h1>
        <div className="flex items-center gap-3">
          <span className="font-display text-xs text-muted-foreground">Turn {state.turnNumber}</span>
          <span className="font-display text-xs text-muted-foreground">Envoy: {state.player.name}</span>
          <span className="font-display text-[10px] tracking-[0.22em] text-muted-foreground/70 uppercase">
            Engine: {engineLabel}
          </span>

          <GameMenu
            slots={saveSlots}
            onSave={saveToSlot}
            onLoad={loadFromSlot}
            onDelete={deleteSlot}
            engineLabel={engineLabel}
            onExitToTitle={exitToTitle}
            onRestartCampaign={resetGame}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            activeTab={menuTab}
            onActiveTabChange={setMenuTab}
          />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6 lg:flex-row">
        <motion.aside className="w-full shrink-0 lg:w-72" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <FactionPanel factions={state.factions} />
        </motion.aside>

        <main className="flex-1 min-w-0">
          {conversationEnded ? (
            <motion.div className="flex flex-col items-center justify-center gap-6 py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {state.pendingEncounter ? (
                <>
                  <div className="text-center">
                    <p className="font-display text-lg text-muted-foreground">{state.pendingEncounter.title}</p>
                    <p className="mt-2 font-body text-sm italic text-muted-foreground/60 max-w-md">
                      {state.pendingEncounter.description}
                    </p>

                    {(encounterLocationLabel || encounterTurnsLeft !== null) && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        {encounterLocationLabel && <div>{encounterLocationLabel}</div>}
                        {encounterTurnsLeft !== null && (
                          <div className={encounterTurnsLeft <= 1 ? 'text-destructive' : undefined}>
                            {encounterTurnsLeft >= 0
                              ? <>Expires in {encounterTurnsLeft} turn{encounterTurnsLeft === 1 ? '' : 's'} (turn {state.pendingEncounter.expiresOnTurn})</>
                              : <>Expired on turn {state.pendingEncounter.expiresOnTurn}</>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button onClick={enterPendingEncounter} className="font-display tracking-[0.18em] uppercase">
                    Address encounter
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-display text-lg text-muted-foreground text-center">The conversation has reached its conclusion.</p>
                  <p className="font-body text-sm italic text-muted-foreground/60 text-center max-w-md">Your choices have shaped the realm's future. The factions remember.</p>
                  <Button
                    onClick={resetGame}
                    variant="outline"
                    className="h-auto rounded-sm border-primary/30 px-6 py-2 font-display text-sm tracking-[0.2em] text-primary transition-colors hover:border-primary/60 hover:text-gold-glow"
                  >
                    Begin Again
                  </Button>
                </>
              )}
            </motion.div>
          ) : (
            <>
              {shouldShowEncounterPrompt && state.pendingEncounter && (
                <div className="parchment-border mb-4 flex items-center justify-between gap-4 rounded-sm bg-card p-4">
                  <div className="min-w-0">
                    <div className="font-display text-xs tracking-[0.2em] text-primary uppercase">Pending encounter</div>
                    <div className="mt-1 text-sm text-card-foreground truncate">{state.pendingEncounter.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{state.pendingEncounter.description}</div>

                    {(encounterLocationLabel || encounterTurnsLeft !== null) && (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {encounterLocationLabel && <span className="mr-3">{encounterLocationLabel}</span>}
                        {encounterTurnsLeft !== null && (
                          <span className={encounterTurnsLeft <= 1 ? 'text-destructive' : undefined}>
                            {encounterTurnsLeft >= 0
                              ? <>Expires in {encounterTurnsLeft} turn{encounterTurnsLeft === 1 ? '' : 's'}</>
                              : <>Expired (turn {state.pendingEncounter.expiresOnTurn})</>}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={enterPendingEncounter}
                    className="font-display tracking-[0.18em] uppercase"
                    title="Open encounter resolution (you'll return to the Concord Hall afterward)"
                  >
                    Address encounter
                  </Button>
                </div>
              )}

              <DialoguePanel
                node={state.currentDialogue!}
                onChoice={makeChoice}
                knownSecrets={state.knownSecrets}
                factions={state.factions}
                playerName={state.player.name}
                playerPortraitId={state.player.portraitId}
                lockedChoices={choiceLockedFlags}
                choiceUiHints={choiceUiHints}
              />
            </>
          )}
        </main>

        <motion.aside className="w-full shrink-0 lg:w-72" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <InfoPanel
            currentDialogue={state.currentDialogue}
            knownSecrets={state.knownSecrets}
            turnNumber={state.turnNumber}
            log={state.log}
            world={state.world}
            factions={state.factions}
            pendingEncounter={state.pendingEncounter}
            player={state.player}
            canAddressEncounter={canAddressEncounter}
            onAddressEncounter={enterPendingEncounter}
          />
        </motion.aside>
      </div>
    </div>
  );
};

export default GameScreen;
