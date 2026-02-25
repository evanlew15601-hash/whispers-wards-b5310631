import { motion } from 'framer-motion';

interface InfoPanelProps {
  knownSecrets: string[];
  turnNumber: number;
  log: string[];
}

const InfoPanel = ({ knownSecrets, turnNumber, log }: InfoPanelProps) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Turn counter */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm tracking-[0.3em] text-muted-foreground uppercase">
          Chronicle
        </h2>
        <span className="font-display text-xs text-primary">
          Turn {turnNumber}
        </span>
      </div>

      {/* Secrets */}
      {knownSecrets.length > 0 && (
        <div className="parchment-border rounded-sm bg-card p-4">
          <h3 className="mb-3 font-display text-xs tracking-[0.2em] text-accent uppercase">
            🔍 Intelligence ({knownSecrets.length})
          </h3>
          <div className="flex flex-col gap-2">
            {knownSecrets.map((secret, i) => (
              <motion.p
                key={i}
                className="font-body text-xs italic text-card-foreground/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                • {secret}
              </motion.p>
            ))}
          </div>
        </div>
      )}

      {/* Event log */}
      <div className="parchment-border rounded-sm bg-card p-4">
        <h3 className="mb-3 font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Event Log
        </h3>
        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
          {log.map((entry, i) => (
            <p
              key={i}
              className={`font-body text-xs ${
                entry.startsWith('>')
                  ? 'text-primary/80 italic'
                  : entry.startsWith('⚡')
                  ? 'text-accent font-semibold'
                  : entry.startsWith('🔍')
                  ? 'text-accent/80'
                  : 'text-muted-foreground'
              }`}
            >
              {entry}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
