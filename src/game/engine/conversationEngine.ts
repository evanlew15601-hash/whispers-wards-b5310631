import type { DialogueChoice, GameState } from '../types';

export type ChoiceUiHint = {
  locked: boolean;
  requiredReputation: { factionId: string; min: number } | null;
  effects: { factionId: string; reputationChange: number }[];
  revealsInfo: string | null;
};

/**
 * Minimal interface to allow swapping the conversation/state-transition engine.
 */
export interface ConversationEngine {
  /** Create a fresh initial state (title screen, fresh world, etc.). */
  createInitialState(): GameState;

  /** Create a fresh game state and jump into the first dialogue node. */
  startNewGame(): GameState;

  /** Apply a player choice and return the next state (pure). */
  applyChoice(prev: GameState, choice: DialogueChoice): GameState;

  /**
   * Optional: compute which choices are currently locked.
   *
   * The UI can use this to stay aligned with whichever engine is active.
   */
  getChoiceLockedFlags?: (state: GameState) => boolean[] | null;

  /**
   * Optional: compute UI-oriented choice metadata (lock reason, rep deltas, intel flags)
   * using the active engine as the source of truth.
   */
  getChoiceUiHints?: (state: GameState) => ChoiceUiHint[] | null;
}
