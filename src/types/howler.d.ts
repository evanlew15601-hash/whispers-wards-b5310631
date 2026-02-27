export {};

declare global {
  interface Howler {
    ctx?: AudioContext;
    volume: (volume?: number) => number;
    mute: (muted: boolean) => void;
  }

  interface HowlOptions {
    src: string[];
    loop?: boolean;
    volume?: number;
    autoplay?: boolean;
    html5?: boolean;
    onload?: () => void;
    onloaderror?: (id?: number, err?: unknown) => void;
    onplayerror?: (id?: number, err?: unknown) => void;
  }

  interface Howl {
    play: () => number;
    stop: () => void;
    unload: () => void;
    volume: (volume?: number) => number;
    fade: (from: number, to: number, durationMs: number) => void;
  }

  interface Window {
    Howler?: Howler;
    Howl?: new (options: HowlOptions) => Howl;
  }
}
