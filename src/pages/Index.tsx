import TitleScreen from '@/components/TitleScreen';
import GameScreen from '@/components/GameScreen';
import { useGameState } from '@/game/useGameState';

const Index = () => {
  const { state, startGame, makeChoice, resetGame } = useGameState();

  if (state.currentScene === 'title') {
    return <TitleScreen onStart={startGame} />;
  }

  return <GameScreen state={state} makeChoice={makeChoice} resetGame={resetGame} />;
};

export default Index;
