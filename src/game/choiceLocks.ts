import type { DialogueChoice, Faction } from './types';

type LockableChoice = Pick<DialogueChoice, 'requiredReputation' | 'requiresAllSecrets' | 'requiresAnySecrets'>;

type SecretLockableChoice = Pick<DialogueChoice, 'requiresAllSecrets' | 'requiresAnySecrets'>;

export function isChoiceLockedBySecrets(choice: SecretLockableChoice, knownSecrets: string[]): boolean {
  const needsAll = choice.requiresAllSecrets ?? null;
  if (needsAll?.length) {
    const ok = needsAll.every(s => knownSecrets.includes(s));
    if (!ok) return true;
  }

  const needsAny = choice.requiresAnySecrets ?? null;
  if (needsAny?.length) {
    const ok = needsAny.some(s => knownSecrets.includes(s));
    if (!ok) return true;
  }

  return false;
}

export function isChoiceLocked(choice: LockableChoice, factions: Faction[], knownSecrets: string[]): boolean {
  if (knownSecrets.includes('override')) return false;

  if (isChoiceLockedBySecrets(choice, knownSecrets)) return true;

  const repReq = choice.requiredReputation;
  if (!repReq) return false;

  const rep = factions.find(f => f.id === repReq.factionId)?.reputation ?? -Infinity;
  return rep < repReq.min;
}
