import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { SaveSlotInfo } from '@/game/storage';

import SaveLoadDialog from '@/components/SaveLoadDialog';

const getActiveTabPanel = (dialog: HTMLElement) => {
  const panels = within(dialog).getAllByRole('tabpanel');
  const active = panels.find(panel => !panel.hasAttribute('hidden'));
  if (!active) throw new Error('Expected an active tab panel');
  return active;
};

describe('SaveLoadDialog', () => {
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

  it('open dialog, Save tab: saving empty slot calls onSave and closes', async () => {
    const onSave = vi.fn();

    render(<SaveLoadDialog slots={slots} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /save\s*\/\s*load/i }));

    const dialog = await screen.findByRole('dialog');
    const savePanel = getActiveTabPanel(dialog);

    const slot1Row = within(savePanel).getByText(/slot 1/i).parentElement?.parentElement;
    expect(slot1Row).not.toBeNull();

    fireEvent.click(within(slot1Row as HTMLElement).getByRole('button', { name: /^save$/i }));

    expect(onSave).toHaveBeenCalledWith(1);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('saving non-empty slot prompts overwrite confirm; confirming calls onSave', async () => {
    const onSave = vi.fn();

    render(<SaveLoadDialog slots={slots} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /save\s*\/\s*load/i }));

    const dialog = await screen.findByRole('dialog');
    const savePanel = getActiveTabPanel(dialog);

    const slot2Row = within(savePanel).getByText(/slot 2/i).parentElement?.parentElement;
    expect(slot2Row).not.toBeNull();

    fireEvent.click(within(slot2Row as HTMLElement).getByRole('button', { name: /^save$/i }));

    expect(onSave).not.toHaveBeenCalled();

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByRole('heading', { name: /overwrite save\?/i })).toBeInTheDocument();

    fireEvent.click(within(confirm).getByRole('button', { name: /^overwrite$/i }));

    expect(onSave).toHaveBeenCalledWith(2);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Load tab: load disabled for empty slot', async () => {
    const onLoad = vi.fn();

    render(<SaveLoadDialog slots={slots} onSave={vi.fn()} onLoad={onLoad} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /save\s*\/\s*load/i }));

    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('tab', { name: /^load$/i }));

    const loadPanel = getActiveTabPanel(dialog);
    const loadButtons = within(loadPanel).getAllByRole('button', { name: /^load$/i });

    expect(loadButtons[0]).toBeDisabled();
    expect(loadButtons[1]).not.toBeDisabled();
    expect(onLoad).not.toHaveBeenCalled();
  });
});
