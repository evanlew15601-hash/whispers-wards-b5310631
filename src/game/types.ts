export interface Faction {
  id: string;
  name: string;
  description: string;
  motto: string;
  color: 'iron' | 'verdant' | 'ember';
  reputation: number; // -100 to 100
  traits: string[];
}

export interface DialogueChoice {
  id: string;
  text: string;
  effects: {
    factionId: string;
    reputationChange: number;
  }[];
  nextNodeId: string | null; // null = end conversation
  requiredReputation?: { factionId: string; min: number };
  revealsInfo?: string;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  speakerFaction?: string;
  text: string;
  choices: DialogueChoice[];
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  triggered: boolean;
  triggerCondition?: {
    factionId: string;
    reputationThreshold: number;
    direction: 'above' | 'below';
  };
}

export type TradeRouteStatus = 'open' | 'embargoed' | 'raided';

export interface TradeRouteState {
  id: string;
  name: string;
  status: TradeRouteStatus;
  affectedFactions: string[];
  /**
   * Explicit endpoints for rendering and future route logic.
   * Optional for backward compatibility with older saves.
   */
  fromRegionId?: string;
  toRegionId?: string;
  embargoedBy?: string;
  untilTurn?: number;
}

export interface RegionState {
  id: string;
  name: string;
  control: string | 'neutral';
  contested?: boolean;
}

export interface WorldState {
  regions: Record<string, RegionState>;
  tradeRoutes: Record<string, TradeRouteState>;
  tensions: Record<string, Record<string, number>>;
  aiMemory: {
    lastOfferTurn: Record<string, number>;
    lastEmbargoTurn: Record<string, number>;
  };
}

export type SecondaryEncounterKind = 'embargo' | 'raid' | 'skirmish' | 'summit';

export interface SecondaryEncounter {
  id: string;
  /** Optional for backward compatibility with older saves. */
  kind?: SecondaryEncounterKind;
  /** Optional for backward compatibility with older saves. */
  routeId?: string;
  /** Optional for backward compatibility with older saves. */
  regionId?: string;
  title: string;
  description: string;
  relatedFactions: string[];
  expiresOnTurn: number;
}

export interface GameState {
  currentScene: 'title' | 'load' | 'game';
  factions: Faction[];
  currentDialogue: DialogueNode | null;
  events: GameEvent[];
  knownSecrets: string[];
  turnNumber: number;
  log: string[];
  rngSeed: number;
  world: WorldState;
  pendingEncounter: SecondaryEncounter | null;
}
