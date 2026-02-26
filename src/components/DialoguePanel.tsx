import { DialogueNode, DialogueChoice, Faction } from '@/game/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Fragment, useEffect, useState } from 'react';
import { splitWrappedLinesIntoParagraphs, wrapTextLinesJs, wrapTextLinesUqm } from '@/game/engine/uqmTextWrap';

interface DialoguePanelProps {
  node: DialogueNode;
  onChoice: (choice: DialogueChoice) => void;
  knownSecrets: string[];
  factions: Faction[];
}

const factionLabelColors: Record<string, string> = {
  'iron-pact': 'faction-iron',
  'verdant-court': 'faction-verdant',
  'ember-throne': 'faction-ember',
};

const DIALOGUE_MAX_COLUMNS = 56;
const CHOICE_MAX_COLUMNS = 52;

const DialoguePanel = ({ node, onChoice, knownSecrets, factions }: DialoguePanelProps) => {
  const [dialogueLines, setDialogueLines] = useState<string[]>(() =>
    wrapTextLinesJs(node.text, DIALOGUE_MAX_COLUMNS)
  );
  const [choiceLines, setChoiceLines] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(node.choices.map(c => [c.id, wrapTextLinesJs(c.text, CHOICE_MAX_COLUMNS)] as const))
  );

  useEffect(() => {
    let cancelled = false;

    setDialogueLines(wrapTextLinesJs(node.text, DIALOGUE_MAX_COLUMNS));

    void (async () => {
      const lines = await wrapTextLinesUqm(node.text, DIALOGUE_MAX_COLUMNS);
      if (!cancelled) setDialogueLines(lines);
    })();

    return () => {
      cancelled = true;
    };
  }, [node.id]);

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

  const dialogueParagraphs = splitWrappedLinesIntoParagraphs(dialogueLines);

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
        <div className="flex items-center gap-3">
          {node.speakerFaction && (
            <div className={`h-2 w-2 rounded-full ${factionLabelColors[node.speakerFaction] || ''}`} />
          )}
          <span className="font-display text-sm tracking-widest text-primary uppercase">
            {node.speaker}
          </span>
        </div>

        {/* Dialogue text */}
        <div className="parchment-border rounded-sm bg-card/50 p-6">
          {dialogueParagraphs.map((paragraphLines, i) => (
            <motion.p
              key={i}
              className="mb-3 font-body text-sm leading-relaxed text-card-foreground last:mb-0 sm:text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.3, duration: 0.8 }}
            >
              {paragraphLines.map((line, j) => (
                <Fragment key={j}>
                  {line}
                  {j < paragraphLines.length - 1 && <br />}
                </Fragment>
              ))}
            </motion.p>
          ))}
        </div>

        {/* Choices */}
        <div className="flex flex-col gap-2">
          <span className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Your Response
          </span>
          {node.choices.map((choice, i) => {
            const repReq = choice.requiredReputation;
            const repOk = repReq
              ? (factions.find(f => f.id === repReq.factionId)?.reputation ?? -1000) >= repReq.min
              : true;

            // Future-proofing: allow certain secrets to override locks.
            const override = knownSecrets.includes('override');
            const locked = Boolean(repReq) && !repOk && !override;

            const reqFactionName = repReq
              ? factions.find(f => f.id === repReq.factionId)?.name ?? repReq.factionId.replace('-', ' ')
              : null;

            const lines = choiceLines[choice.id] ?? [choice.text];

            return (
              <motion.button
                key={choice.id}
                type="button"
                disabled={locked}
                title={locked && repReq ? `Requires ${reqFactionName} reputation ≥ ${repReq.min}` : undefined}
                onClick={() => !locked && onChoice(choice)}
                className={`group relative rounded-sm border border-border bg-secondary/50 p-4 text-left font-body text-sm transition-all sm:text-base
                  ${locked
                    ? 'cursor-not-allowed opacity-40'
                    : 'hover:border-primary/50 hover:bg-secondary'
                  }`}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.15, duration: 0.4 }}
                whileHover={locked ? {} : { x: 4 }}
              >
                <span className="text-secondary-foreground">
                  {lines.map((line, j) => (
                    <Fragment key={j}>
                      {line}
                      {j < lines.length - 1 && <br />}
                    </Fragment>
                  ))}
                </span>

                {/* Effect indicators */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {repReq && locked && (
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground">
                      🔒 requires {repReq.factionId.replace('-', ' ')} ≥ {repReq.min}
                    </span>
                  )}
                  {choice.effects.map(effect => (
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
                  {choice.revealsInfo && (
                    <span className="text-[10px] font-display tracking-wider text-accent">
                      🔍 reveals info
                    </span>
                  )}
                </div>

                <span className="absolute left-0 top-0 h-full w-0.5 bg-primary/0 transition-all group-hover:bg-primary/60" />
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DialoguePanel;
