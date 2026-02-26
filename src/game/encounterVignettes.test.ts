import { describe, expect, it } from 'vitest';

import type { SecondaryEncounter } from './types';

import { buildEncounterDialogueNode } from './encounters';

describe('encounter vignette templates', () => {
  it('is deterministic for the same encounter.id/kind/title/description', () => {
    const encounter: SecondaryEncounter = {
      id: 'enc-vignette-embargo-1',
      kind: 'embargo',
      routeId: 'ashroad',
      title: 'Embargo crisis',
      description: 'Trade has halted; petitions flood the hall.',
      relatedFactions: ['ember-throne', 'iron-pact'],
      expiresOnTurn: 12,
    };

    const a = buildEncounterDialogueNode(encounter);
    const b = buildEncounterDialogueNode({ ...encounter });

    expect(a.text).toBe(b.text);
    expect(a.text).toMatchInlineSnapshot(`"A clerk lays fresh tariff ledgers on the table. Ink still glistens.\n\nEmbargo crisis\n\nTrade has halted; petitions flood the hall.\n\n“If this embargo holds another week, the docks will choke. What is your instruction?”"`);
  });

  it('produces different variants for different encounter IDs', () => {
    const base: Omit<SecondaryEncounter, 'id'> = {
      kind: 'raid',
      routeId: 'ashroad',
      title: 'Raid report',
      description: 'The road is unsafe; merchants refuse to travel.',
      relatedFactions: ['iron-pact', 'ember-throne'],
      expiresOnTurn: 12,
    };

    const baseline = buildEncounterDialogueNode({ ...base, id: 'enc-vignette-raid-0' }).text;

    let sawDifferent = false;
    for (let i = 1; i <= 200; i++) {
      const next = buildEncounterDialogueNode({ ...base, id: `enc-vignette-raid-${i}` }).text;
      if (next !== baseline) {
        sawDifferent = true;
        break;
      }
    }

    expect(sawDifferent).toBe(true);
  });
});
