import { CSSProperties } from 'react';

import type { SpeakerPortraitSpec } from '@/game/portraits';

interface CommPortraitProps {
  portrait: SpeakerPortraitSpec;
}

const CommPortrait = ({ portrait }: CommPortraitProps) => {
  if (portrait.kind === 'image') {
    return (
      <div className="cc-comm-frame relative h-full w-full overflow-hidden rounded-sm">
        <img
          src={portrait.src}
          alt={portrait.alt}
          className={`h-full w-full object-cover ${portrait.filterClassName ?? ''}`}
          style={{ objectPosition: portrait.objectPosition }}
        />
        <div className="cc-comm-frame-border pointer-events-none absolute inset-0" />
      </div>
    );
  }

  return (
    <div
      className="cc-comm-frame relative flex h-full w-full items-center justify-center overflow-hidden rounded-sm"
      style={{ ['--cc-aura' as any]: `var(${portrait.auraVar})` } as CSSProperties}
      aria-label={portrait.alt}
      role="img"
    >
      <div className="cc-comm-scanlines pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/10 to-background/25" />
      <div className="cc-comm-sigil relative flex h-24 w-24 items-center justify-center rounded-sm border border-border bg-card/50">
        <span className="font-display text-3xl tracking-[0.25em] text-primary/90">
          {portrait.initials}
        </span>
      </div>
      <div className="cc-comm-frame-border pointer-events-none absolute inset-0" />
    </div>
  );
};

export default CommPortrait;
