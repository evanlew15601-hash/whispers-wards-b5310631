import { useContext } from 'react';
import { AudioContext } from '@/audio/AudioProvider';

export const useAudio = () => useContext(AudioContext);
