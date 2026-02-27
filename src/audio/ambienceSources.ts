import type { AmbienceId } from '@/audio/proceduralAmbience';

const withBase = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export const getAuthoredAmbienceSources = (id: AmbienceId): string[] => {
  switch (id) {
    case 'title':
      return [
        withBase('audio/ambience/title_regal.ogg'),
        withBase('audio/ambience/title_regal.mp3'),
      ];
    case 'game':
      return [
        withBase('audio/ambience/game_intrigue.ogg'),
        withBase('audio/ambience/game_intrigue.mp3'),
      ];
    default:
      return [];
  }
};
