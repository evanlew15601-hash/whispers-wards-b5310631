import TitleScreen from '@/components/TitleScreen';
import GameScreen from '@/components/GameScreen';
import LoadScreen from '@/components/LoadScreen';
import { useGameState } from '@/game/useGameState';

const Index = () => {
  const {
    state,
    startGame,
    openLoadScreen,
    backToTitle,
    saveToSlot,
    loadFromSlot,
    deleteSlot,
    listSlots,
    makeChoice,
    resetGame,
  } = useGameState();

  const slots = listSlots();

  if (state.currentScene === 'title') {
    return <TitleScreen onStart={startGame} onLoad={openLoadScreen} />;
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

  return (
    <GameScreen
      state={state}
      makeChoice={makeChoice}
      resetGame={resetGame}
      saveSlots={slots}
      saveToSlot={saveToSlot}
      loadFromSlot={loadFromSlot}
      deleteSlot={deleteSlot}
      exitToTitle={backToTitle}
    />
  );
};

export default Index;
