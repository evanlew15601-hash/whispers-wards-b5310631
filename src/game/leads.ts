import type { DialogueNode } from './types';

import { isChoiceLockedBySecrets } from './choiceLocks';

const proofLeadHintsBySecret: Record<string, string[]> = {
  'The Ember Throne forged maps to manipulate the border dispute.': [
    'Compare border maps against older surveys; look for recent revisions and mismatched seals.',
    'Cross-check patrol orders and witness accounts against what the maps claim.',
  ],
  'Renzo\'s ledger pages show coded payments tied to the border killings.': [
    'Obtain financial records from the Ember delegation—ledgers, receipts, or copied pages.',
  ],
  'Renzo sold you a curated ledger copy; it still suggests payments aligned with the killings.': [
    'Obtain financial records from the Ember delegation—ledgers, receipts, or copied pages.',
  ],
  'Renzo\'s manifests list furnace salts disguised as "road salt" under a Concord Hall docket number.': [
    'Cross-reference shipping manifests with Concord docket filings in the archives.',
  ],
};

function collectMissingProofSecrets(node: DialogueNode, knownSecrets: string[]): Set<string> {
  const missing = new Set<string>();

  for (const choice of node.choices) {
    if (!isChoiceLockedBySecrets(choice, knownSecrets)) continue;

    const needsAll = choice.requiresAllSecrets ?? null;
    if (needsAll?.length) {
      for (const s of needsAll) {
        if (!knownSecrets.includes(s)) missing.add(s);
      }
    }

    const needsAny = choice.requiresAnySecrets ?? null;
    if (needsAny?.length) {
      const hasAny = needsAny.some(s => knownSecrets.includes(s));
      if (!hasAny) {
        for (const s of needsAny) missing.add(s);
      }
    }
  }

  return missing;
}

export function getLeadHintsForCurrentDialogue(currentDialogue: DialogueNode | null, knownSecrets: string[]): string[] {
  if (!currentDialogue) return [];
  if (knownSecrets.includes('override')) return [];

  const missingSecrets = collectMissingProofSecrets(currentDialogue, knownSecrets);
  if (!missingSecrets.size) return [];

  const hints: string[] = [];
  const seen = new Set<string>();

  for (const secret of missingSecrets) {
    const mapped = proofLeadHintsBySecret[secret] ?? null;
    if (!mapped?.length) continue;

    for (const hint of mapped) {
      if (seen.has(hint)) continue;
      seen.add(hint);
      hints.push(hint);
    }
  }

  if (!hints.length) {
    hints.push('Seek credible documentation or witnesses before pressing claims that would escalate the summit.');
  }

  return hints.slice(0, 4);
}
