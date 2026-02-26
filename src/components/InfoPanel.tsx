import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Faction, WorldState, SecondaryEncounter } from '@/game/types';
import WorldMap from '@/components/WorldMap';

interface InfoPanelProps {
  knownSecrets: string[];
  turnNumber: number;
  log: string[];
  world: WorldState;
  factions: Faction[];
  pendingEncounter: SecondaryEncounter | null;
  canAddressEncounter?: boolean;
  onAddressEncounter?: () => void;
}

const InfoPanel = (
  { knownSecrets, turnNumber, log, world, factions, pendingEncounter, canAddressEncounter = false, onAddressEncounter }: InfoPanelProps,
) => {
  const encounterTurnsLeft = pendingEncounter ? pendingEncounter.expiresOnTurn - turnNumber : null;

  return (
    <Tabs defaultValue="chronicle" className="flex flex-col gap-4">
      {/* Turn counter */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm tracking-[0.3em] text-muted-foreground uppercase">
          Info
        </h2>
        <span className="font-display text-xs text-primary">
          Turn {turnNumber}
        </span>
      </div>

      <TabsList className="w-full">
        <TabsTrigger value="chronicle" className="flex-1 font-display text-xs tracking-[0.2em] uppercase">
          Chronicle
        </TabsTrigger>
        <TabsTrigger value="world" className="flex-1 font-display text-xs tracking-[0.2em] uppercase">
          World Map
        </TabsTrigger>
      </TabsList>

      <TabsContent value="chronicle" className="mt-0 flex flex-col gap-6">
        {/* Secrets */}
        {knownSecrets.length > 0 && (
          <div className="parchment-border rounded-sm bg-card p-4">
            <h3 className="mb-3 font-display text-xs tracking-[0.2em] text-accent uppercase">
              <span aria-hidden="true">🔍</span> Intelligence ({knownSecrets.length})
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

        {/* Pending encounter */}
        {pendingEncounter && (
          <div className="parchment-border rounded-sm bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="mb-2 font-display text-xs tracking-[0.2em] text-primary uppercase">
                  <span aria-hidden="true">⚔</span> Pending Encounter
                </h3>
                <div className="text-sm text-card-foreground">{pendingEncounter.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{pendingEncounter.description}</div>

                <div
                  className={`mt-2 text-[11px] ${
                    encounterTurnsLeft !== null && encounterTurnsLeft <= 1 ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {encounterTurnsLeft !== null && encounterTurnsLeft >= 0
                    ? `Expires in ${encounterTurnsLeft} turn${encounterTurnsLeft === 1 ? '' : 's'} (turn ${pendingEncounter.expiresOnTurn})`
                    : `Expires on turn ${pendingEncounter.expiresOnTurn}`}
                </div>
              </div>

              {onAddressEncounter && (
                <Button
                  size="sm"
                  variant={canAddressEncounter ? 'default' : 'secondary'}
                  disabled={!canAddressEncounter}
                  onClick={onAddressEncounter}
                  title={canAddressEncounter ? 'Address this encounter' : 'Return to the Concord Hall hub to address this encounter'}
                >
                  Address
                </Button>
              )}
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
      </TabsContent>

      <TabsContent value="world" className="mt-0">
        <WorldMap world={world} factions={factions} highlightEncounter={pendingEncounter ?? null} />
      </TabsContent>
    </Tabs>
  );
};

export default InfoPanel;
