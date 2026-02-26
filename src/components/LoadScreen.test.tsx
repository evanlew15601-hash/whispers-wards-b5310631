import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { SaveSlotInfo } from '@/game/storage';

vi.mock('@/assets/hero-throne.jpg', () => ({ default: 'hero-throne.jpg' }));

import LoadScreen from '@/components/LoadScreen';

describe('LoadScreen', () => {
  it('loads only non-empty slots, disables load for empty slots, and deletes with confirmation', async () => {
    const onLoad = vi.fn();
    const onDelete = vi.fn();

    const slots: SaveSlotInfo[] = [
      { id: 1, meta: null },
      {
        id: 2,
        meta: {
          savedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
          turnNumber: 12,
          factions: [
            { id: 'iron', name: 'Iron Legion', reputation: 3 },
            { id: 'verdant', name: 'Verdant Court', reputation: -1 },
          ],
        },
      },
    ];

    render(
      <LoadScreen
        slots={slots}
        onLoad={onLoad}
        onDelete={onDelete}
        onBack={vi.fn()}
        onNewGame={vi.fn()}
      />,
    );

    const nonEmptyCard = screen.getByText('Turn 12').closest('[role="button"]');
    expect(nonEmptyCard).not.toBeNull();
    fireEvent.click(nonEmptyCard as HTMLElement);
    expect(onLoad).toHaveBeenCalledWith(2);

    const loadButtons = screen.getAllByRole('button', { name: /^load$/i });
    expect(loadButtons[0]).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('heading', { name: /delete slot 2\?/i })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));
    expect(onDelete).toHaveBeenCalledWith(2);
  });
});
