import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { DialogueNode, Faction, WorldState } from '@/game/types';

import InfoPanel from './InfoPanel';

describe('InfoPanel leads', () => {
  const factions: Faction[] = [
    {
      id: 'iron',
      name: 'Iron Dominion',
      description: 'Test faction',
      motto: 'Test motto',
      color: 'iron',
      reputation: 0,
      traits: [],
    },
  ];

  const world: WorldState = {
    regions: {
      ironhold: { id: 'ironhold', name: 'Ironhold', control: 'iron', contested: false },
    },
    tradeRoutes: {},
    tensions: {},
    aiMemory: {
      lastOfferTurn: {},
      lastEmbargoTurn: {},
    },
  };

  const node: DialogueNode = {
    id: 'test-node',
    speaker: 'Narrator',
    text: 'A short line of dialogue.',
    choices: [
      {
        id: 'proof-choice',
        text: 'Make the accusation.',
        effects: [],
        nextNodeId: null,
        requiresAnySecrets: ['proof:ember'],
      },
    ],
  };

  it('shows leads when a proof-gated choice is locked', () => {
    render(
      <InfoPanel
        currentDialogue={node}
        knownSecrets={[]}
        turnNumber={1}
        log={[]}
        world={world}
        factions={factions}
        pendingEncounter={null}
      />,
    );

    expect(screen.getByText('Leads')).toBeInTheDocument();
  });

  it('hides leads once proof is known', () => {
    render(
      <InfoPanel
        currentDialogue={node}
        knownSecrets={['proof:ember']}
        turnNumber={1}
        log={[]}
        world={world}
        factions={factions}
        pendingEncounter={null}
      />,
    );

    expect(screen.queryByText('Leads')).not.toBeInTheDocument();
  });
});
