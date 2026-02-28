import type { DialogueChoice } from './types';

export function makeChoiceKey(nodeId: string, choiceId: string): string {
  return `${nodeId}::${choiceId}`;
}

export function choiceHasNonZeroReputationEffects(choice: DialogueChoice): boolean {
  return choice.effects.some(e => e.reputationChange !== 0);
}

/**
 * "One-off" actions that should not be repeatable at all.
 *
 * Convention: these choices reveal a past-tense, player-centric secret ("You ...").
 */
export function isOneTimeActionChoice(choice: DialogueChoice): boolean {
  return typeof choice.revealsInfo === 'string' && choice.revealsInfo.startsWith('You ');
}

export function isChoiceUsed(usedChoiceKeys: string[], nodeId: string, choiceId: string): boolean {
  return usedChoiceKeys.includes(makeChoiceKey(nodeId, choiceId));
}

export function shouldBlockRepeat(
  choice: DialogueChoice,
  usedChoiceKeys: string[],
  nodeId: string,
  knownSecrets?: string[],
): boolean {
  if (!isOneTimeActionChoice(choice)) return false;

  if (isChoiceUsed(usedChoiceKeys, nodeId, choice.id)) return true;

  // Back/forward compatibility: older saves may not have `usedChoiceKeys`, but they
  // *will* have the revealed secret.
  if (knownSecrets && choice.revealsInfo && knownSecrets.includes(choice.revealsInfo)) return true;

  return false;
}

export function shouldConsumeReputationEffects(choice: DialogueChoice, usedChoiceKeys: string[], nodeId: string): boolean {
  return choiceHasNonZeroReputationEffects(choice) && isChoiceUsed(usedChoiceKeys, nodeId, choice.id);
}

export function shouldRecordChoiceUse(choice: DialogueChoice): boolean {
  // If you add new persistent choice consequences (items, resources, flags, etc.),
  // include them here so they cannot be farmed by revisiting the same choice.
  return isOneTimeActionChoice(choice) || choiceHasNonZeroReputationEffects(choice);
}
