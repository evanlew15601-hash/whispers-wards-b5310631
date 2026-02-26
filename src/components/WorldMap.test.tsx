import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WorldMap from './WorldMap';
import type { Faction, WorldState } from '@/game/types';

describe('WorldMap selection details', () => {
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
    {
      id: 'verdant',
      name: 'Verdant Pact',
      description: 'Test faction',
      motto: 'Test motto',
      color: 'verdant',
      reputation: 0,
      traits: [],
    },
  ];

  const world: WorldState = {
    regions: {
      ironhold: { id: 'ironhold', name: 'Ironhold', control: 'iron', contested: false },
      verdantwilds: { id: 'verdantwilds', name: 'Verdantwilds', control: 'verdant', contested: true },
    },
    tradeRoutes: {
      'route-1': {
        id: 'route-1',
        name: 'Iron-Verdant Run',
        status: 'open',
        affectedFactions: ['iron', 'verdant'],
        fromRegionId: 'ironhold',
        toRegionId: 'verdantwilds',
      },
    },
    tensions: {},
    aiMemory: {
      lastOfferTurn: {},
      lastEmbargoTurn: {},
    },
  };

  it('shows region details on click and toggles off on second click', () => {
    render(<WorldMap world={world} factions={factions} highlightEncounter={null} />);

    expect(screen.queryByText('Selected Region')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Select region Ironhold'));

    expect(screen.getByText('Selected Region')).toBeInTheDocument();
    expect(screen.getByText('Control: Iron Dominion')).toBeInTheDocument();
    expect(screen.getByText('Status: Stable')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Select region Ironhold'));

    expect(screen.queryByText('Selected Region')).not.toBeInTheDocument();
  });

  it('shows route details on click', () => {
    render(<WorldMap world={world} factions={factions} highlightEncounter={null} />);

    fireEvent.click(screen.getByLabelText('Select route Iron-Verdant Run'));

    expect(screen.getByText('Selected Route')).toBeInTheDocument();
    expect(screen.getByText('Status: open')).toBeInTheDocument();
    expect(screen.getByText('Affected: Iron Dominion, Verdant Pact')).toBeInTheDocument();
    expect(screen.getByText('Endpoints: Ironhold ↔ Verdantwilds')).toBeInTheDocument();
  });
});
