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

export interface GameState {
  currentScene: 'title' | 'game';
  factions: Faction[];
  currentDialogue: DialogueNode | null;
  events: GameEvent[];
  knownSecrets: string[];
  turnNumber: number;
  log: string[];
}
