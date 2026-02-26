import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SaveSlotInfo } from '@/game/storage';

vi.mock('@/assets/hero-throne.jpg', () => ({ default: 'hero-throne.jpg' }));
vi.mock('@/game/engine/uqmWasmRuntime', () => ({
  loadUqmWasmRuntime: () => Promise.reject(new Error('no wasm')),
}));

import TitleScreen from '@/components/TitleScreen';

describe('TitleScreen', () => {
  it('shows Continue when at least one slot is non-empty and continues the most recent save', async () => {
    const onContinue = vi.fn();

    const slots: SaveSlotInfo[] = [
      { id: 1, meta: null },
      {
        id: 2,
        meta: {
          savedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
          turnNumber: 2,
          factions: [],
        },
      },
      {
        id: 3,
        meta: {
          savedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
          turnNumber: 3,
          factions: [],
        },
      },
    ];

    render(
      <TitleScreen
        onStart={vi.fn()}
        onLoad={vi.fn()}
        slots={slots}
        onContinue={onContinue}
      />,
    );

    // Wait for the async conversation-core probe to settle so we don't get act() warnings.
    await screen.findByText(/conversation core \(basic\)/i);

    const buttons = screen.getAllByRole('button');
    expect(buttons.map(b => b.textContent?.trim())).toEqual(['Continue', 'New Game', 'Load Game']);

    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(onContinue).toHaveBeenCalledWith(3);
  });

  it('does not show Continue when all slots are empty', async () => {
    const onContinue = vi.fn();

    const slots: SaveSlotInfo[] = [
      { id: 1, meta: null },
      { id: 2, meta: null },
    ];

    render(
      <TitleScreen
        onStart={vi.fn()}
        onLoad={vi.fn()}
        slots={slots}
        onContinue={onContinue}
      />,
    );

    await screen.findByText(/conversation core \(basic\)/i);

    expect(screen.queryByRole('button', { name: /^continue$/i })).not.toBeInTheDocument();
  });
});
