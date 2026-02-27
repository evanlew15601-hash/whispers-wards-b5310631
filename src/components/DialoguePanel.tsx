import { DialogueNode, DialogueChoice, Faction } from '@/game/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import { splitWrappedLinesIntoParagraphs, wrapTextLinesJs, wrapTextLinesUqm } from '@/game/engine/uqmTextWrap';
import { isChoiceLocked } from '@/game/choiceLocks';
import { useAudio } from '@/audio/useAudio';
import { Eye, Flame, Leaf, Lock, Shield, Sparkles } from 'lucide-react';

import type { ChoiceUiHint } from '@/game/engine/conversationEngine';

interface DialoguePanelProps {
  node: DialogueNode;
  onChoice: (choice: DialogueChoice) => void;
  knownSecrets: string[];
  factions: Faction[];
  lockedChoices?: boolean[] | null;
  choiceUiHints?: ChoiceUiHint[] | null;
}

const factionLabelColors: Record<string, string> = {
  'iron-pact': 'faction-iron',
  'verdant-court': 'faction-verdant',
  'ember-throne': 'faction-ember',
};

const factionAuraVars: Record<string, string> = {
  'iron-pact': 'var(--faction-iron)',
  'verdant-court': 'var(--faction-verdant)',
  'ember-throne': 'var(--faction-ember)',
};

const factionIcons: Record<string, ComponentType<{ className?: string }>> = {
  'iron-pact': Shield,
  'verdant-court': Leaf,
  'ember-throne': Flame,
};

const DIALOGUE_MAX_COLUMNS = 56;
const CHOICE_MAX_COLUMNS = 52;
const REVEAL_TICK_MS = 28;

const isUserTyping = () => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;

  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;

  return el.isContentEditable;
};

const DialoguePanel = ({ node, onChoice, knownSecrets, factions, lockedChoices, choiceUiHints }: DialoguePanelProps) => {
  const { playSfx } = useAudio();

  const fullText = node.text;

  const [revealedChars, setRevealedChars] = useState(0);
  const [isRevealing, setIsRevealing] = useState(true);

  const [dialogueLines, setDialogueLines] = useState<string[]>(() => wrapTextLinesJs('', DIALOGUE_MAX_COLUMNS));
  const [choiceLines, setChoiceLines] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(node.choices.map(c => [c.id, wrapTextLinesJs(c.text, CHOICE_MAX_COLUMNS)] as const))
  );

  const [lockedNudgeId, setLockedNudgeId] = useState<string | null>(null);

  const revealTimerRef = useRef<number | null>(null);
  const nudgeTimerRef = useRef<number | null>(null);

  const visibleText = useMemo(() => fullText.slice(0, revealedChars), [fullText, revealedChars]);

  const skipReveal = useCallback(() => {
    playSfx('ui.skip');

    if (revealTimerRef.current != null) {
      window.clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setRevealedChars(fullText.length);
    setIsRevealing(false);
  }, [fullText.length, playSfx]);

  const nudgeLockedChoice = useCallback((choiceId: string) => {
    playSfx('ui.locked');

    setLockedNudgeId(choiceId);
    if (nudgeTimerRef.current != null) window.clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = window.setTimeout(() => {
      setLockedNudgeId(prev => (prev === choiceId ? null : prev));
      nudgeTimerRef.current = null;
    }, 220);
  }, [playSfx]);

  useEffect(() => {
    playSfx('ui.page');

    setRevealedChars(0);
    setIsRevealing(true);
    setLockedNudgeId(null);
    setDialogueLines(wrapTextLinesJs('', DIALOGUE_MAX_COLUMNS));

    if (revealTimerRef.current != null) {
      window.clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }

    if (nudgeTimerRef.current != null) {
      window.clearTimeout(nudgeTimerRef.current);
      nudgeTimerRef.current = null;
    }

    const durationMs = Math.min(3200, Math.max(900, fullText.length * 16));
    const steps = Math.max(1, Math.ceil(durationMs / REVEAL_TICK_MS));
    const stepChars = Math.max(1, Math.ceil(fullText.length / steps));

    revealTimerRef.current = window.setInterval(() => {
      setRevealedChars(prev => {
        const next = Math.min(fullText.length, prev + stepChars);
        if (next >= fullText.length) {
          if (revealTimerRef.current != null) {
            window.clearInterval(revealTimerRef.current);
            revealTimerRef.current = null;
          }
          setIsRevealing(false);
        }
        return next;
      });
    }, REVEAL_TICK_MS);

    return () => {
      if (revealTimerRef.current != null) {
        window.clearInterval(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      if (nudgeTimerRef.current != null) {
        window.clearTimeout(nudgeTimerRef.current);
        nudgeTimerRef.current = null;
      }
    };
  }, [node.id, fullText, playSfx]);

  useEffect(() => {
    setDialogueLines(wrapTextLinesJs(visibleText, DIALOGUE_MAX_COLUMNS));

    if (isRevealing) return;

    let cancelled = false;

    void (async () => {
      const lines = await wrapTextLinesUqm(fullText, DIALOGUE_MAX_COLUMNS);
      if (!cancelled) setDialogueLines(lines);
    })();

    return () => {
      cancelled = true;
    };
  }, [visibleText, isRevealing, fullText]);

  useEffect(() => {
    let cancelled = false;

    setChoiceLines(
      Object.fromEntries(node.choices.map(c => [c.id, wrapTextLinesJs(c.text, CHOICE_MAX_COLUMNS)] as const))
    );

    void (async () => {
      const entries = await Promise.all(
        node.choices.map(async c => [c.id, await wrapTextLinesUqm(c.text, CHOICE_MAX_COLUMNS)] as const)
      );
      if (!cancelled) setChoiceLines(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [node.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (isUserTyping()) return;

      const key = e.key;

      if ((key === ' ' || key === 'Enter') && isRevealing) {
        e.preventDefault();
        skipReveal();
        return;
      }

      if (isRevealing) return;

      if (key >= '1' && key <= '9') {
        const idx = Number(key) - 1;
        const choice = node.choices[idx];
        if (!choice) return;

        const locked = choiceUiHints?.[idx]?.locked ?? lockedChoices?.[idx] ?? isChoiceLocked(choice, factions, knownSecrets);

        if (locked) {
          nudgeLockedChoice(choice.id);
          return;
        }

        playSfx('ui.select');
        onChoice(choice);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isRevealing, skipReveal, node.choices, factions, knownSecrets, lockedChoices, choiceUiHints, onChoice, nudgeLockedChoice, playSfx]);

  const dialogueParagraphs = splitWrappedLinesIntoParagraphs(dialogueLines);

  const aura = node.speakerFaction ? factionAuraVars[node.speakerFaction] ?? 'var(--gold-glow)' : 'var(--gold-glow)';
  const SpeakerIcon = node.speakerFaction ? factionIcons[node.speakerFaction] ?? Sparkles : Sparkles;

  const responseLabel = isRevealing ? 'Hold—listening…' : 'Your move';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={node.id}
        className="flex flex-col gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
      >
        {/* Speaker */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="cc-speaker-sigil flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-card"
                style={{ ['--cc-aura' as any]: aura } as CSSProperties}
              >
                <SpeakerIcon className="h-4 w-4 text-primary" />
              </div>
              {node.speakerFaction && (
                <div className={`absolute -bottom-1 -right-1 h-2 w-2 rounded-full ${factionLabelColors[node.speakerFaction] || ''}`} />
              )}
            </div>

            <div className="flex flex-col">
              <span className="font-display text-sm tracking-widest text-primary uppercase">
                {node.speaker}
              </span>
              <span className="text-[10px] font-display tracking-[0.2em] text-muted-foreground/70 uppercase">
                {isRevealing ? 'Press Space to reveal' : 'Press 1–9 to answer'}
              </span>
            </div>
          </div>

          {node.speakerFaction && (
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-display tracking-[0.2em] text-muted-foreground/70 uppercase">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/50" />
              <span>{node.speakerFaction.replace('-', ' ')}</span>
            </div>
          )}
        </div>

        {/* Dialogue text */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => isRevealing && skipReveal()}
          onKeyDown={e => {
            if (!isRevealing) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              skipReveal();
            }
          }}
          className="parchment-border group relative cursor-pointer rounded-sm bg-card/40 p-6 outline-none transition-colors hover:bg-card/55 focus-visible:ring-2 focus-visible:ring-primary/60"
          style={{ ['--cc-aura' as any]: aura } as CSSProperties}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm">
            <div className="cc-dialogue-aura absolute inset-0 opacity-70" />
            <div className="cc-dialogue-grain absolute inset-0" />
          </div>

          <div className="relative">
            {dialogueParagraphs.map((paragraphLines, i) => (
              <motion.p
                key={i}
                className="mb-3 font-body text-sm leading-relaxed text-card-foreground last:mb-0 sm:text-base"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, duration: 0.35 }}
              >
                {paragraphLines.map((line, j) => (
                  <Fragment key={j}>
                    {line}
                    {j < paragraphLines.length - 1 && <br />}
                  </Fragment>
                ))}
              </motion.p>
            ))}

            {isRevealing && (
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full bg-primary/70"
                    style={{ width: `${Math.min(100, Math.round((revealedChars / Math.max(1, fullText.length)) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] font-display tracking-[0.2em] text-muted-foreground uppercase">
                  skip
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Choices */}
        <div className="flex flex-col gap-2">
          <span className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
            {responseLabel}
          </span>

          <div className={`flex flex-col gap-2 transition-opacity ${isRevealing ? 'opacity-45 pointer-events-none' : 'opacity-100'}`}>
            {node.choices.map((choice, i) => {
              const hint = choiceUiHints?.[i];

              const locked = hint?.locked ?? lockedChoices?.[i] ?? isChoiceLocked(choice, factions, knownSecrets);

              const repReq = hint?.requiredReputation ?? choice.requiredReputation;

              const reqFactionName = repReq
                ? factions.find(f => f.id === repReq.factionId)?.name ?? repReq.factionId.replace('-', ' ')
                : null;

              const lines = choiceLines[choice.id] ?? [choice.text];
              const hotkey = i < 9 ? String(i + 1) : null;

              const onSelect = () => {
                if (locked) {
                  nudgeLockedChoice(choice.id);
                  return;
                }
                playSfx('ui.select');
                onChoice(choice);
              };

              return (
                <motion.button
                  key={choice.id}
                  type="button"
                  aria-disabled={locked}
                  aria-keyshortcuts={hotkey ?? undefined}
                  title={locked && repReq ? `Requires ${reqFactionName} reputation ≥ ${repReq.min}` : undefined}
                  onClick={onSelect}
                  className={`group relative overflow-hidden rounded-sm border border-border bg-secondary/45 p-4 text-left font-body text-sm transition-all sm:text-base
                    ${locked
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:border-primary/50 hover:bg-secondary'
                    }
                    ${lockedNudgeId === choice.id ? 'cc-choice-nudge' : ''}`}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.35 }}
                  whileHover={locked ? {} : { x: 4 }}
                >
                  <div className="flex items-start gap-3">
                    {hotkey && (
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-border bg-card/60 font-display text-[10px] tracking-wider text-muted-foreground">
                        {hotkey}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <span className="text-secondary-foreground">
                        {lines.map((line, j) => (
                          <Fragment key={j}>
                            {line}
                            {j < lines.length - 1 && <br />}
                          </Fragment>
                        ))}
                      </span>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {repReq && locked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-display tracking-wider text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            requires {repReq.factionId.replace('-', ' ')} ≥ {repReq.min}
                          </span>
                        )}

                        {(hint?.effects ?? choice.effects).map(effect => (
                          <span
                            key={effect.factionId}
                            className={`text-[10px] font-display tracking-wider ${
                              effect.reputationChange > 0
                                ? 'text-primary'
                                : effect.reputationChange < 0
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {effect.factionId.replace('-', ' ')} {effect.reputationChange > 0 ? '▲' : effect.reputationChange < 0 ? '▼' : '—'}
                          </span>
                        ))}

                        {(hint?.revealsInfo ?? choice.revealsInfo) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-display tracking-wider text-accent">
                            <Eye className="h-3 w-3" />
                            intel
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="absolute left-0 top-0 h-full w-0.5 bg-primary/0 transition-all group-hover:bg-primary/60" />

                  {!locked && (
                    <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="cc-choice-sheen absolute inset-0" />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DialoguePanel;
