import heroImage from '@/assets/hero-throne.jpg';

export type PortraitId =
  | 'envoy-default'
  | 'envoy-alternate'
  | 'envoy-shadow';

export type Pronouns = 'they/them' | 'she/her' | 'he/him';

export type PortraitAsset = {
  id: PortraitId;
  label: string;
  src: string;
  /** Optional CSS styling hooks for quick, coherent variations while art is in flux. */
  objectPosition?: string;
  filterClassName?: string;
  /**
   * Asset provenance (keep updated when replacing placeholders).
   *
   * NOTE: hero-throne.jpg is a temporary stand-in; replace with curated CC0/PD portraits.
   */
  credit?: {
    sourceUrl?: string;
    license?: string;
    author?: string;
  };
};

export const playerPortraits: PortraitAsset[] = [
  {
    id: 'envoy-default',
    label: 'Envoy (Default)',
    src: heroImage,
    objectPosition: '50% 20%',
    credit: {
      sourceUrl: 'local:src/assets/hero-throne.jpg',
      license: 'placeholder',
    },
  },
  {
    id: 'envoy-alternate',
    label: 'Envoy (Alternate)',
    src: heroImage,
    objectPosition: '50% 35%',
    filterClassName: 'cc-portrait-alt',
    credit: {
      sourceUrl: 'local:src/assets/hero-throne.jpg',
      license: 'placeholder',
    },
  },
  {
    id: 'envoy-shadow',
    label: 'Envoy (Shadow)',
    src: heroImage,
    objectPosition: '50% 25%',
    filterClassName: 'cc-portrait-shadow',
    credit: {
      sourceUrl: 'local:src/assets/hero-throne.jpg',
      license: 'placeholder',
    },
  },
];

export function isPortraitId(id: string): id is PortraitId {
  return playerPortraits.some(p => p.id === id);
}

export function getPortraitById(id: string): PortraitAsset | null {
  return playerPortraits.find(p => p.id === id) ?? null;
}

export type SpeakerPortraitSpec =
  | {
      kind: 'image';
      src: string;
      alt: string;
      objectPosition?: string;
      filterClassName?: string;
    }
  | {
      kind: 'sigil';
      alt: string;
      initials: string;
      auraVar: string;
    };

function initialsFromName(name: string): string {
  const cleaned = name.replace(/\(.*?\)/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const take = parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
  return take || '?';
}

export function getSpeakerPortrait(speaker: string, speakerFaction?: string): SpeakerPortraitSpec {
  const normalized = speaker.toLowerCase();

  // Named NPC portraits (placeholder crops/grades until bespoke art is added).
  if (normalized.includes('aldric')) {
    return {
      kind: 'image',
      src: heroImage,
      alt: speaker,
      objectPosition: '52% 15%',
      filterClassName: 'cc-portrait-iron',
    };
  }

  if (normalized.includes('thessaly')) {
    return {
      kind: 'image',
      src: heroImage,
      alt: speaker,
      objectPosition: '45% 30%',
      filterClassName: 'cc-portrait-verdant',
    };
  }

  if (normalized.includes('renzo')) {
    return {
      kind: 'image',
      src: heroImage,
      alt: speaker,
      objectPosition: '60% 28%',
      filterClassName: 'cc-portrait-ember',
    };
  }

  if (speakerFaction) {
    const auraVar =
      speakerFaction === 'iron-pact'
        ? '--faction-iron'
        : speakerFaction === 'verdant-court'
          ? '--faction-verdant'
          : speakerFaction === 'ember-throne'
            ? '--faction-ember'
            : '--gold-glow';

    return {
      kind: 'sigil',
      alt: speaker,
      initials: initialsFromName(speaker),
      auraVar,
    };
  }

  return {
    kind: 'sigil',
    alt: speaker,
    initials: initialsFromName(speaker),
    auraVar: '--gold-glow',
  };
}
