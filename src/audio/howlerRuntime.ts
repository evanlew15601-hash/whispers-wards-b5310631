export const getHowlerRuntime = () => {
  if (typeof window === 'undefined') return null;
  const { Howl, Howler } = window;
  if (!Howl || !Howler) return null;
  return { Howl, Howler };
};
