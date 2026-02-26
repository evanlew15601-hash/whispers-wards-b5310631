import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { SaveSlotInfo } from '@/game/storage';

import GameMenu from '@/components/GameMenu';

const getActiveTabPanel = (dialog: HTMLElement) => {
  const panels = within(dialog).getAllByRole('tabpanel');
  const active = panels.find(panel => !panel.hasAttribute('hidden'));
  if (!active) throw new Error('Expected an active tab panel');
  return active;
};

describe('GameMenu', () => {
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

  const openMenu = async () => {
    fireEvent.click(screen.getByRole('button', { name: /^menu$/i }));
    return await screen.findByRole('dialog');
  };

  it('Save tab shows slots', async () => {
    render(
      <GameMenu
        slots={slots}
        onSave={vi.fn()}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        engineLabel="test"
        onExitToTitle={vi.fn()}
        onRestartCampaign={vi.fn()}
      />,
    );

    const dialog = await openMenu();
    const savePanel = getActiveTabPanel(dialog);

    expect(within(savePanel).getByText(/slot 1/i)).toBeInTheDocument();
    expect(within(savePanel).getByText(/slot 2/i)).toBeInTheDocument();
  });

  it('Save tab: saving into non-empty slot prompts overwrite confirmation', async () => {
    const onSave = vi.fn();

    render(
      <GameMenu
        slots={slots}
        onSave={onSave}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        engineLabel="test"
        onExitToTitle={vi.fn()}
        onRestartCampaign={vi.fn()}
      />,
    );

    const dialog = await openMenu();
    const savePanel = getActiveTabPanel(dialog);

    const saveButtons = within(savePanel).getAllByRole('button', { name: /^save$/i });
    fireEvent.click(saveButtons[1]);

    expect(onSave).not.toHaveBeenCalled();

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByRole('heading', { name: /overwrite save\?/i })).toBeInTheDocument();

    fireEvent.click(within(confirm).getByRole('button', { name: /^overwrite$/i }));

    expect(onSave).toHaveBeenCalledWith(2);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Load tab disables load for empty slot', async () => {
    render(
      <GameMenu
        slots={slots}
        onSave={vi.fn()}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        engineLabel="test"
        onExitToTitle={vi.fn()}
        onRestartCampaign={vi.fn()}
      />,
    );

    const dialog = await openMenu();

    fireEvent.click(within(dialog).getByRole('tab', { name: /^load$/i }));

    const loadPanel = getActiveTabPanel(dialog);
    const loadButtons = within(loadPanel).getAllByRole('button', { name: /^load$/i });

    expect(loadButtons[0]).toBeDisabled();
    expect(loadButtons[1]).not.toBeDisabled();
  });

  it('Load tab: delete confirmation triggers onDelete', async () => {
    const onDelete = vi.fn();

    render(
      <GameMenu
        slots={slots}
        onSave={vi.fn()}
        onLoad={vi.fn()}
        onDelete={onDelete}
        engineLabel="test"
        onExitToTitle={vi.fn()}
        onRestartCampaign={vi.fn()}
      />,
    );

    const dialog = await openMenu();

    fireEvent.click(within(dialog).getByRole('tab', { name: /^load$/i }));

    const loadPanel = getActiveTabPanel(dialog);

    fireEvent.click(within(loadPanel).getByRole('button', { name: /^delete$/i }));

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByRole('heading', { name: /delete slot 2\?/i })).toBeInTheDocument();

    fireEvent.click(within(confirm).getByRole('button', { name: /^delete$/i }));

    expect(onDelete).toHaveBeenCalledWith(2);
  });

  it('Campaign tab: exit to title confirms and calls onExitToTitle', async () => {
    const onExitToTitle = vi.fn();

    render(
      <GameMenu
        slots={slots}
        onSave={vi.fn()}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        engineLabel="test"
        onExitToTitle={onExitToTitle}
        onRestartCampaign={vi.fn()}
      />,
    );

    const dialog = await openMenu();
    fireEvent.click(within(dialog).getByRole('tab', { name: /^campaign$/i }));

    const panel = getActiveTabPanel(dialog);
    fireEvent.click(within(panel).getByRole('button', { name: /^exit to title$/i }));

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByRole('heading', { name: /^exit to title$/i })).toBeInTheDocument();

    fireEvent.click(within(confirm).getByRole('button', { name: /^exit to title$/i }));

    expect(onExitToTitle).toHaveBeenCalledTimes(1);
  });

  it('Campaign tab: restart campaign confirms and calls onRestartCampaign', async () => {
    const onRestartCampaign = vi.fn();

    render(
      <GameMenu
        slots={slots}
        onSave={vi.fn()}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        engineLabel="test"
        onExitToTitle={vi.fn()}
        onRestartCampaign={onRestartCampaign}
      />,
    );

    const dialog = await openMenu();
    fireEvent.click(within(dialog).getByRole('tab', { name: /^campaign$/i }));

    const panel = getActiveTabPanel(dialog);
    fireEvent.click(within(panel).getByRole('button', { name: /^restart campaign$/i }));

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByRole('heading', { name: /^restart campaign$/i })).toBeInTheDocument();

    fireEvent.click(within(confirm).getByRole('button', { name: /^restart campaign$/i }));

    expect(onRestartCampaign).toHaveBeenCalledTimes(1);
  });
});
