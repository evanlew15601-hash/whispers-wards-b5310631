import { describe, expect, it } from 'vitest';

import { dialogueTree, initialFactions } from './data';

describe('dialogueTree integrity', () => {
  it('has valid edges and consistent ids', () => {
    const factionIds = new Set(initialFactions.map(f => f.id));

    for (const [key, node] of Object.entries(dialogueTree)) {
      expect(node.id).toBe(key);

      if (node.speakerFaction) {
        expect(factionIds.has(node.speakerFaction)).toBe(true);
      }

      const choiceIds = new Set<string>();

      for (const choice of node.choices) {
        expect(choiceIds.has(choice.id)).toBe(false);
        choiceIds.add(choice.id);

        if (choice.nextNodeId !== null) {
          expect(dialogueTree[choice.nextNodeId]).toBeTruthy();
        }

        if (choice.requiredReputation) {
          expect(factionIds.has(choice.requiredReputation.factionId)).toBe(true);
          expect(typeof choice.requiredReputation.min).toBe('number');
        }

        if (choice.requiresAllSecrets) {
          expect(Array.isArray(choice.requiresAllSecrets)).toBe(true);
          expect(choice.requiresAllSecrets.length).toBeGreaterThan(0);
          for (const secret of choice.requiresAllSecrets) {
            expect(typeof secret).toBe('string');
            expect(secret.trim().length).toBeGreaterThan(0);
          }
        }

        if (choice.requiresAnySecrets) {
          expect(Array.isArray(choice.requiresAnySecrets)).toBe(true);
          expect(choice.requiresAnySecrets.length).toBeGreaterThan(0);
          for (const secret of choice.requiresAnySecrets) {
            expect(typeof secret).toBe('string');
            expect(secret.trim().length).toBeGreaterThan(0);
          }
        }

        for (const eff of choice.effects) {
          expect(factionIds.has(eff.factionId)).toBe(true);
          expect(typeof eff.reputationChange).toBe('number');
        }
      }
    }
  });

  it('stays within the WASM secret limit (64 unique secrets across reveals + requirements)', () => {
    const secrets = new Set<string>();

    for (const node of Object.values(dialogueTree)) {
      for (const choice of node.choices) {
        if (choice.revealsInfo) secrets.add(choice.revealsInfo);
        for (const s of choice.requiresAllSecrets ?? []) secrets.add(s);
        for (const s of choice.requiresAnySecrets ?? []) secrets.add(s);
      }
    }

    // The minimal WASM conversation core stores secrets in a 64-bit mask (lo/hi u32).
    // The TS engine can exceed that, but the WASM engine will ignore extras.
    expect(secrets.size).toBeLessThanOrEqual(64);
  });

  it('only requires secrets that can actually be learned in the dialogue graph', () => {
    const learnableSecrets = new Set<string>();

    for (const node of Object.values(dialogueTree)) {
      for (const choice of node.choices) {
        if (choice.revealsInfo) learnableSecrets.add(choice.revealsInfo);
      }
    }

    for (const node of Object.values(dialogueTree)) {
      for (const choice of node.choices) {
        const required = [...(choice.requiresAllSecrets ?? []), ...(choice.requiresAnySecrets ?? [])];
        for (const secret of required) {
          if (secret === 'override') continue;
          expect(learnableSecrets.has(secret)).toBe(true);
        }
      }
    }
  });

  it('keeps new investigative nodes reachable from the opening', () => {
    const startId = 'opening';

    const visited = new Set<string>();
    const queue: string[] = [startId];

    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const node = dialogueTree[id];
      if (!node) continue;

      for (const choice of node.choices) {
        if (!choice.nextNodeId) continue;
        queue.push(choice.nextNodeId);
      }
    }

    const required = [
      'iron-dispatch-audit',
      'verdant-ward-inspection',
      'aldric-ward-sample',
      'ember-manifest-check',
    ];

    for (const id of required) {
      expect(visited.has(id)).toBe(true);
    }
  });
});
