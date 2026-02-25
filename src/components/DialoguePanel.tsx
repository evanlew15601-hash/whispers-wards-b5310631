import { DialogueNode, DialogueChoice } from '@/game/types';
import { motion, AnimatePresence } from 'framer-motion';

interface DialoguePanelProps {
  node: DialogueNode;
  onChoice: (choice: DialogueChoice) => void;
  knownSecrets: string[];
}

const factionLabelColors: Record<string, string> = {
  'iron-pact': 'faction-iron',
  'verdant-court': 'faction-verdant',
  'ember-throne': 'faction-ember',
};

const DialoguePanel = ({ node, onChoice, knownSecrets }: DialoguePanelProps) => {
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
          {node.text.split('\n\n').map((paragraph, i) => (
            <motion.p
              key={i}
              className="mb-3 font-body text-sm leading-relaxed text-card-foreground last:mb-0 sm:text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.3, duration: 0.8 }}
            >
              {paragraph}
            </motion.p>
          ))}
        </div>

        {/* Choices */}
        <div className="flex flex-col gap-2">
          <span className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Your Response
          </span>
          {node.choices.map((choice, i) => {
            const locked = choice.requiredReputation &&
              !knownSecrets.includes('override');

            return (
              <motion.button
                key={choice.id}
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
                <span className="text-secondary-foreground">{choice.text}</span>

                {/* Effect indicators */}
                <div className="mt-2 flex flex-wrap gap-2">
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
