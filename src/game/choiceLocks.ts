import type { DialogueChoice, Faction } from './types';

export function isChoiceLocked(choice: Pick<DialogueChoice, 'requiredReputation'>, factions: Faction[], knownSecrets: string[]): boolean {
  const repReq = choice.requiredReputation;
  if (!repReq) return false;

  if (knownSecrets.includes('override')) return false;

  const rep = factions.find(f => f.id === repReq.factionId)?.reputation ?? -Infinity;
  return rep < repReq.min;
}
