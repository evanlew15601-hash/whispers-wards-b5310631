import { Faction } from '@/game/types';
import { motion } from 'framer-motion';

interface FactionPanelProps {
  factions: Faction[];
}

const factionColorMap = {
  iron: 'faction-iron',
  verdant: 'faction-verdant',
  ember: 'faction-ember',
} as const;

const FactionPanel = ({ factions }: FactionPanelProps) => {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-sm tracking-[0.3em] text-muted-foreground uppercase">
        Factions
      </h2>
      {factions.map((faction, i) => (
        <motion.div
          key={faction.id}
          className="parchment-border rounded-sm bg-card p-4"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.15, duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-3 w-3 rounded-full ${factionColorMap[faction.color]}`} />
            <h3 className="font-display text-sm font-semibold text-card-foreground">
              {faction.name}
            </h3>
          </div>

          {/* Reputation bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Hostile</span>
              <span className="font-semibold text-card-foreground">
                {faction.reputation > 0 ? '+' : ''}{faction.reputation}
              </span>
              <span>Allied</span>
            </div>
            <div className="relative h-1.5 w-full rounded-full bg-muted">
              <motion.div
                className="absolute top-0 h-full rounded-full"
                style={{
                  left: '50%',
                  width: `${Math.abs(faction.reputation) / 2}%`,
                  transform: faction.reputation < 0 ? 'translateX(-100%)' : 'translateX(0)',
                  backgroundColor: faction.reputation >= 0
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--destructive))',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.abs(faction.reputation) / 2}%` }}
                transition={{ duration: 0.5 }}
              />
              <div className="absolute top-1/2 left-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/30" />
            </div>
          </div>

          <p className="text-xs italic text-muted-foreground">{faction.motto}</p>

          <div className="mt-2 flex flex-wrap gap-1">
            {faction.traits.map(trait => (
              <span
                key={trait}
                className="rounded-sm bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground"
              >
                {trait}
              </span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default FactionPanel;
