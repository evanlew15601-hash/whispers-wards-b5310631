import { useEffect } from 'react';
import { useAudio } from '@/audio/useAudio';
import type { AmbienceId } from '@/audio/proceduralAmbience';

export const useAmbience = (id: AmbienceId | null) => {
  const { setAmbience } = useAudio();

  useEffect(() => {
    setAmbience(id);
    return () => setAmbience(null);
  }, [id, setAmbience]);
};
