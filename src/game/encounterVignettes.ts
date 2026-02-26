import type { SecondaryEncounter, SecondaryEncounterKind } from './types';

export type EncounterVignette = {
  speaker: string;
  preface: string;
  prompt: string;
  choiceTexts: [string, string, string];
};

const hashFNV1a32 = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const indexFromId = (encounterId: string, count: number) => {
  if (count <= 0) return 0;
  return hashFNV1a32(encounterId) % count;
};

const vignettesByKind: Record<SecondaryEncounterKind, EncounterVignette[]> = {
  embargo: [
    {
      speaker: 'Concord Clerk',
      preface: 'A clerk lays fresh tariff ledgers on the table. Ink still glistens.',
      prompt: '“If this embargo holds another week, the docks will choke. What is your instruction?”',
      choiceTexts: [
        'Lean on both sides to lift the embargo before the markets seize.',
        'Propose a compromise charter and reopen trade under clear terms.',
        'Let the embargo bite; demand concessions before any reopening.',
      ],
    },
    {
      speaker: 'Hall Herald',
      preface: 'A herald arrives with a sealed writ and the smell of harbor smoke.',
      prompt: '“Merchants beg for a verdict they can repeat at the gates.”',
      choiceTexts: [
        'Issue an order to lift the embargo at once.',
        'Draft a middle path: reopen trade with inspections and limits.',
        'Affirm the embargo and make clear it will not soften yet.',
      ],
    },
  ],
  raid: [
    {
      speaker: 'Border Marshal',
      preface: 'A windburned marshal unrolls a map scored with red wax marks.',
      prompt: '“The raiders know our schedules. Give me authority, and I can make the road safe.”',
      choiceTexts: [
        'Send patrols to sweep the route and restore safe passage.',
        'Demand compensation and set escorted convoys as the new standard.',
        'Authorize reprisals and make an example of the raiders.',
      ],
    },
    {
      speaker: 'Route Warden',
      preface: 'A warden drops a broken seal onto the table; it still smells of ash.',
      prompt: '“Every delay teaches the thieves we hesitate. Which lesson do we teach back?”',
      choiceTexts: [
        'Deploy immediate patrols and reopen the route under guard.',
        'Compel repayment for losses and formalize future escorts.',
        'Strike back hard, even if it risks escalation.',
      ],
    },
  ],
  skirmish: [
    {
      speaker: 'Field Envoy',
      preface: 'A field envoy arrives with mud on their cloak and a hand on their sword-belt.',
      prompt: '“Both banners claim the same ridge. Choose, or the ridge chooses for them.”',
      choiceTexts: [
        'Call for a ceasefire and place neutral observers between the lines.',
        'Back the first claimant and press their advantage before doubt spreads.',
        'Back the second claimant and press their advantage before doubt spreads.',
      ],
    },
    {
      speaker: 'Concord Observer',
      preface: 'A tired observer sets down a bundle of witness notes, corners singed by campfires.',
      prompt: '“They are one mishap from a true war. Your word can pin the map in place.”',
      choiceTexts: [
        'Broker a ceasefire with neutral witnesses and clear boundaries.',
        'Endorse the first claimant and push the line forward.',
        'Endorse the second claimant and push the line forward.',
      ],
    },
  ],
  summit: [
    {
      speaker: 'Concord Chair',
      preface: 'In the Hall’s upper chamber, the air is warm with lamp-oil and withheld anger.',
      prompt: '“They will accept a binding accord, or they will leave with a grievance. Decide.”',
      choiceTexts: [
        'Draft a binding accord and demand signatures before anyone departs.',
        'Rebuke the first delegation in full view of the hall.',
        'Rebuke the second delegation in full view of the hall.',
      ],
    },
    {
      speaker: 'Protocol Steward',
      preface: 'A protocol steward whispers over seating charts and broken etiquette.',
      prompt: '“A word, a gesture, a pen-stroke—any of them will set the tone for a decade.”',
      choiceTexts: [
        'Press both sides into an accord, inked and witnessed.',
        'Make the first delegation swallow a public slight.',
        'Make the second delegation swallow a public slight.',
      ],
    },
  ],
};

export function pickEncounterVignette(encounter: SecondaryEncounter): EncounterVignette {
  const kind: SecondaryEncounterKind = encounter.kind ?? 'summit';
  const list = vignettesByKind[kind];
  const idx = indexFromId(encounter.id, list.length);
  return list[idx] ?? list[0];
}
