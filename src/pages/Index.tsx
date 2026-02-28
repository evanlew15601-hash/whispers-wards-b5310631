import TitleScreen from '@/components/TitleScreen';
import CharacterCreatorScreen from '@/components/CharacterCreatorScreen';
import GameScreen from '@/components/GameScreen';
import LoadScreen from '@/components/LoadScreen';
import { useGameState } from '@/game/useGameState';

const Index = () => {
  const {
    state,
    engineLabel,
    choiceLockedFlags,
    choiceUiHints,
    startGame,
    confirmNewGame,
    openLoadScreen,
    backToTitle,
    saveToSlot,
    loadFromSlot,
    deleteSlot,
    listSlots,
    makeChoice,
    resetGame,
    enterPendingEncounter,
  } = useGameState();

  const slots = listSlots();

  if (state.currentScene === 'title') {
    return (
      <TitleScreen
        onStart={startGame}
        onContinue={loadFromSlot}
        slots={slots}
        onLoad={openLoadScreen}
      />
    );
  }

  if (state.currentScene === 'load') {
    return (
      <LoadScreen
        slots={slots}
        onLoad={loadFromSlot}
        onDelete={deleteSlot}
        onBack={backToTitle}
        onNewGame={startGame}
      />
    );
  }

  if (state.currentScene === 'create') {
    return (
      <CharacterCreatorScreen
        initialProfile={state.player}
        onConfirm={confirmNewGame}
        onBack={backToTitle}
      />
    );
  }

  return (
    <GameScreen
      state={state}
      engineLabel={engineLabel}
      makeChoice={makeChoice}
      resetGame={resetGame}
      saveSlots={slots}
      saveToSlot={saveToSlot}
      loadFromSlot={loadFromSlot}
      deleteSlot={deleteSlot}
      exitToTitle={backToTitle}
      enterPendingEncounter={enterPendingEncounter}
      choiceLockedFlags={choiceLockedFlags}
      choiceUiHints={choiceUiHints}
    />
  );
};

export default Index;
