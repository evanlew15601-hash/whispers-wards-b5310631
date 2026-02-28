import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import heroImage from '@/assets/hero-throne.jpg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlayerProfile } from '@/game/types';
import { getPortraitById, isPortraitId, playerPortraits } from '@/game/portraits';

interface CharacterCreatorScreenProps {
  initialProfile: PlayerProfile;
  onConfirm: (profile: PlayerProfile) => void;
  onBack: () => void;
}

const CharacterCreatorScreen = ({ initialProfile, onConfirm, onBack }: CharacterCreatorScreenProps) => {
  const initialPortraitId = isPortraitId(initialProfile.portraitId)
    ? initialProfile.portraitId
    : playerPortraits[0]?.id ?? 'envoy-default';

  const [name, setName] = useState(initialProfile.name);
  const [pronouns, setPronouns] = useState<PlayerProfile['pronouns']>(initialProfile.pronouns);
  const [portraitId, setPortraitId] = useState(initialPortraitId);

  const selectedPortrait = useMemo(() => getPortraitById(portraitId), [portraitId]);

  const canConfirm = name.trim().length > 0 && selectedPortrait;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-10">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/50" />

      <motion.div
        className="relative z-10 w-full max-w-4xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="font-display text-xs tracking-[0.4em] text-muted-foreground uppercase">
              Crown & Concord
            </div>
            <h1 className="mt-2 font-display text-3xl tracking-[0.18em] gold-text-gradient uppercase">
              Character
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Your envoy is the fixed point others orbit. Pick a face that reads like truth.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={onBack}
            className="h-auto rounded-sm px-5 py-2 font-display text-xs tracking-[0.25em] uppercase"
          >
            Back
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div
            className="parchment-border relative overflow-hidden rounded-sm bg-card/40 p-4"
            style={{ ['--cc-aura' as any]: 'var(--gold-glow)' }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm">
              <div className="cc-dialogue-aura absolute inset-0 opacity-70" />
              <div className="cc-dialogue-grain absolute inset-0" />
              <div className="cc-comm-scanlines absolute inset-0" />
            </div>

            <div className="relative">
              <div className="mb-3 font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
                Portrait
              </div>

              <div className="cc-comm-frame relative overflow-hidden rounded-sm">
                {selectedPortrait ? (
                  <img
                    src={selectedPortrait.src}
                    alt={selectedPortrait.label}
                    className={`h-64 w-full object-cover ${selectedPortrait.filterClassName ?? ''}`}
                    style={{ objectPosition: selectedPortrait.objectPosition }}
                  />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center bg-secondary/40">
                    <span className="font-display text-sm tracking-[0.25em] text-muted-foreground uppercase">No portrait</span>
                  </div>
                )}

                <div className="cc-comm-frame-border pointer-events-none absolute inset-0" />
              </div>

              <div className="mt-4 text-[11px] text-muted-foreground">
                This project is moving toward a curated set of grounded CC0/PD portraits. These are placeholders.
              </div>
            </div>
          </div>

          <div className="parchment-border rounded-sm bg-card/40 p-6">
            <div className="grid gap-5">
              <div>
                <Label className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  Name
                </Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Envoy name"
                  className="mt-2 rounded-sm"
                />
              </div>

              <div>
                <Label className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  Pronouns
                </Label>
                <select
                  value={pronouns}
                  onChange={e => setPronouns(e.target.value as PlayerProfile['pronouns'])}
                  className="mt-2 w-full rounded-sm border border-border bg-background/40 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <option value="they/them">they/them</option>
                  <option value="she/her">she/her</option>
                  <option value="he/him">he/him</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <Label className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
                    Select portrait
                  </Label>
                  <div className="text-[10px] font-display tracking-[0.2em] text-muted-foreground/60 uppercase">
                    {playerPortraits.length} available
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {playerPortraits.map(p => {
                    const active = p.id === portraitId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPortraitId(p.id)}
                        className={`group relative overflow-hidden rounded-sm border bg-secondary/40 transition-colors
                          ${active ? 'border-primary/70' : 'border-border hover:border-primary/40'}`}
                        title={p.label}
                      >
                        <img
                          src={p.src}
                          alt={p.label}
                          className={`h-16 w-full object-cover transition-transform group-hover:scale-[1.03] ${p.filterClassName ?? ''}`}
                          style={{ objectPosition: p.objectPosition }}
                        />
                        {active && <span className="absolute inset-0 ring-2 ring-primary/40" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  size="lg"
                  disabled={!canConfirm}
                  onClick={() => {
                    if (!selectedPortrait) return;
                    onConfirm({
                      name: name.trim(),
                      pronouns,
                      portraitId,
                    });
                  }}
                  className="h-auto w-full rounded-sm px-8 py-3 font-display text-sm tracking-[0.3em] uppercase"
                >
                  Enter Concord Hall
                </Button>

                {!canConfirm && (
                  <div className="mt-2 text-center text-xs text-muted-foreground">
                    Choose a name and portrait to proceed.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CharacterCreatorScreen;
