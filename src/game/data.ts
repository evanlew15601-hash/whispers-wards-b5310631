import { Faction, DialogueNode, GameEvent } from './types';

export const initialFactions: Faction[] = [
  {
    id: 'iron-pact',
    name: 'The Iron Pact',
    description: 'A coalition of fortress cities united by discipline and steel. They value order, oaths, and military strength above all else.',
    motto: '"The oath endures where flesh does not."',
    color: 'iron',
    reputation: 0,
    traits: ['Militaristic', 'Honorbound', 'Traditionalist'],
  },
  {
    id: 'verdant-court',
    name: 'The Verdant Court',
    description: 'Druids, scholars, and hedge-mages who govern the deep forests. They wield ancient magic and guard knowledge jealously.',
    motto: '"What the roots know, the crown remembers."',
    color: 'verdant',
    reputation: 0,
    traits: ['Arcane', 'Secretive', 'Patient'],
  },
  {
    id: 'ember-throne',
    name: 'The Ember Throne',
    description: 'A merchant empire built on volcanic trade routes. They deal in gold, favors, and information with equal appetite.',
    motto: '"Every flame begins with a spark of ambition."',
    color: 'ember',
    reputation: 0,
    traits: ['Mercantile', 'Ambitious', 'Pragmatic'],
  },
];

export const dialogueTree: Record<string, DialogueNode> = {
  'opening': {
    id: 'opening',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'You arrive at the Concord Hall as the last light of dusk bleeds through the stained glass. Commander Aldric Vane of the Iron Pact studies you with cold, appraising eyes.\n\n"So. The envoy arrives. I had expected someone... taller. No matter. The border dispute with the Verdant Court has claimed seventeen lives this moon. We need resolution—or we need war. Which do you bring?"',
    choices: [
      {
        id: 'diplomatic',
        text: '"I bring words first, Commander. Let us hear all sides before steel speaks."',
        effects: [
          { factionId: 'iron-pact', reputationChange: -5 },
          { factionId: 'verdant-court', reputationChange: 10 },
        ],
        nextNodeId: 'aldric-diplomatic',
      },
      {
        id: 'pragmatic',
        text: '"I bring what serves the realm. Tell me what the Iron Pact truly needs."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 10 },
        ],
        nextNodeId: 'aldric-pragmatic',
      },
      {
        id: 'information',
        text: '"Before I answer—what aren\'t you telling me about those seventeen deaths?"',
        effects: [
          { factionId: 'iron-pact', reputationChange: -3 },
          { factionId: 'ember-throne', reputationChange: 5 },
        ],
        nextNodeId: 'aldric-suspicious',
        revealsInfo: 'The border deaths may not be from the Verdant Court at all.',
      },
    ],
  },
  'aldric-diplomatic': {
    id: 'aldric-diplomatic',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'Vane\'s jaw tightens. "Words." He spits the concept like ash. "The Verdant Court has had months of words. Their druids weave excuses like spider silk—beautiful, fragile, and ultimately meant to trap."\n\nHe leans forward. "But very well. If you wish to hear their honeyed lies, the Court\'s emissary waits in the eastern wing. A woman called Thessaly. Careful with that one—she sees more than she shows."',
    choices: [
      {
        id: 'ask-about-thessaly',
        text: '"What do you know of Thessaly? Any leverage I should be aware of?"',
        effects: [
          { factionId: 'iron-pact', reputationChange: 5 },
          { factionId: 'verdant-court', reputationChange: -5 },
        ],
        nextNodeId: 'thessaly-intro',
        revealsInfo: 'Thessaly is rumored to be the Verdant Court\'s spymaster, not merely an emissary.',
      },
      {
        id: 'thank-proceed',
        text: '"Thank you, Commander. I will hear all voices before I counsel action."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 0 },
        ],
        nextNodeId: 'thessaly-intro',
      },
    ],
  },
  'aldric-pragmatic': {
    id: 'aldric-pragmatic',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'A thin smile cracks Vane\'s weathered face. "Now that is a useful question. We need the Greenmarch Pass. It controls trade from the southern valleys. The Verdant Court claims it as sacred ground—ancient wards, sleeping spirits, the usual druid mysticism."\n\nHe drops a leather map case on the table. "The Ember Throne has offered to mediate. For a price, naturally. Everything with them is a transaction. But their maps show the old boundaries clearly. The pass was ours before the Court\'s wards existed."',
    choices: [
      {
        id: 'examine-maps',
        text: '"Let me see those maps. The truth often hides in the margins."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 5 },
          { factionId: 'ember-throne', reputationChange: 5 },
        ],
        nextNodeId: 'map-revelation',
        revealsInfo: 'The Ember Throne\'s maps may have been altered to favor whoever pays most.',
      },
      {
        id: 'question-motive',
        text: '"Why would the Ember Throne help you for free? What do they gain?"',
        effects: [
          { factionId: 'ember-throne', reputationChange: -5 },
          { factionId: 'iron-pact', reputationChange: 3 },
        ],
        nextNodeId: 'ember-motives',
      },
    ],
  },
  'aldric-suspicious': {
    id: 'aldric-suspicious',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'Vane goes still. Very still. The kind of stillness that precedes either honesty or violence.\n\n"You\'re perceptive. I\'ll grant you that." He lowers his voice. "Three of the dead bore wounds no druid spell could make. Burns. Deep, alchemical burns. The Verdant Court doesn\'t use fire magic—it\'s anathema to their creed."\n\nHis eyes narrow. "Someone wants this war. Someone who profits from chaos between the Pact and the Court. I have my suspicions, but no proof."',
    choices: [
      {
        id: 'name-ember',
        text: '"The Ember Throne deals in fire and profit. Could they be behind this?"',
        effects: [
          { factionId: 'iron-pact', reputationChange: 10 },
          { factionId: 'ember-throne', reputationChange: -15 },
        ],
        nextNodeId: 'ember-accusation',
        revealsInfo: 'Commander Vane suspects the Ember Throne of orchestrating the border killings.',
      },
      {
        id: 'stay-neutral',
        text: '"Suspicions without proof are dangerous weapons. I\'ll investigate carefully."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 5 },
          { factionId: 'verdant-court', reputationChange: 5 },
          { factionId: 'ember-throne', reputationChange: 5 },
        ],
        nextNodeId: 'investigation-start',
      },
    ],
  },
  'thessaly-intro': {
    id: 'thessaly-intro',
    speaker: 'Emissary Thessaly',
    speakerFaction: 'verdant-court',
    text: 'The eastern wing smells of moss and old rain. Thessaly sits cross-legged on the stone floor, eyes closed, vines crawling lazily up the walls around her. She speaks without opening her eyes.\n\n"The envoy. I felt your footsteps three corridors ago. The stones here remember everything—every boot, every blade, every lie spoken in these halls."\n\nHer eyes open—green as deep forest canopy. "Tell me, envoy. Did the Commander send you to negotiate, or to spy?"',
    choices: [
      {
        id: 'honest',
        text: '"Neither. I came of my own accord. The realm needs peace more than any faction needs victory."',
        effects: [
          { factionId: 'verdant-court', reputationChange: 15 },
          { factionId: 'iron-pact', reputationChange: -5 },
        ],
        nextNodeId: null,
      },
      {
        id: 'strategic',
        text: '"He told me to be careful with you. That you see more than you show. Was he right?"',
        effects: [
          { factionId: 'verdant-court', reputationChange: 5 },
        ],
        nextNodeId: null,
      },
    ],
  },
  'map-revelation': {
    id: 'map-revelation',
    speaker: 'Narrator',
    text: 'You unroll the Ember Throne\'s maps across the war table. The cartography is exquisite—too exquisite. The ink on the border markings is subtly different from the rest. Newer. Someone has redrawn the boundaries.\n\nThe original lines, faintly visible beneath, tell a different story: the Greenmarch Pass was neutral ground. Neither the Iron Pact nor the Verdant Court held it. It was shared.\n\nThis changes everything.',
    choices: [
      {
        id: 'reveal-forgery',
        text: '"Commander, these maps have been altered. The pass was shared territory."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 5 },
          { factionId: 'ember-throne', reputationChange: -20 },
          { factionId: 'verdant-court', reputationChange: 10 },
        ],
        nextNodeId: null,
        revealsInfo: 'The Ember Throne forged maps to manipulate the border dispute.',
      },
      {
        id: 'keep-secret',
        text: 'Say nothing for now. This information could be worth more as leverage later.',
        effects: [
          { factionId: 'ember-throne', reputationChange: 5 },
        ],
        nextNodeId: null,
        revealsInfo: 'The Ember Throne forged maps to manipulate the border dispute.',
      },
    ],
  },
  'ember-motives': {
    id: 'ember-motives',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: '"A fair question." Vane strokes his beard. "The Ember Throne controls the eastern trade routes. If the Greenmarch Pass falls under either our control or the Court\'s, it creates a new trade corridor that bypasses their monopoly. But if we\'re at war..." He lets the implication hang.\n\n"War is expensive. Weapons, supplies, mercenaries—all flow through Ember markets. They profit from conflict without ever drawing a blade."',
    choices: [
      {
        id: 'acknowledge',
        text: '"Then perhaps the true negotiation isn\'t between you and the Court at all."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 10 },
          { factionId: 'ember-throne', reputationChange: -10 },
        ],
        nextNodeId: null,
        revealsInfo: 'The Ember Throne profits from prolonged conflict between the Iron Pact and Verdant Court.',
      },
    ],
  },
  'ember-accusation': {
    id: 'ember-accusation',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'Vane nods slowly. "Fire and profit. Yes. But the Merchant Prince is clever—too clever for direct accusations. If we move against them without proof, we face two enemies instead of one."\n\nHe places a heavy hand on your shoulder. "Find the proof, envoy. The Ember Throne\'s trade consul, a man called Renzo, arrived three days before the first killing. Coincidence? Perhaps. But coincidences make me reach for my sword."',
    choices: [
      {
        id: 'investigate-renzo',
        text: '"I\'ll speak with this Renzo. Where can I find him?"',
        effects: [
          { factionId: 'iron-pact', reputationChange: 10 },
          { factionId: 'ember-throne', reputationChange: -5 },
        ],
        nextNodeId: null,
        revealsInfo: 'Trade Consul Renzo of the Ember Throne arrived suspiciously before the border killings began.',
      },
    ],
  },
  'investigation-start': {
    id: 'investigation-start',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: '"Careful investigation." Vane considers this. "Very well. You have the bearing of someone who finishes what they start. The Concord Hall has emissaries from all three factions. Speak to whom you wish. But remember—every question you ask reveals what you\'re looking for."\n\nHe turns back to the window. "In this game, envoy, information is the sharpest blade."',
    choices: [
      {
        id: 'begin',
        text: '"Then I\'ll wield it carefully. Thank you, Commander."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 5 },
        ],
        nextNodeId: null,
      },
    ],
  },
};

export const initialEvents: GameEvent[] = [
  {
    id: 'iron-pact-alliance',
    title: 'The Iron Alliance',
    description: 'The Iron Pact offers you formal recognition as a trusted ally.',
    triggered: false,
    triggerCondition: { factionId: 'iron-pact', reputationThreshold: 30, direction: 'above' },
  },
  {
    id: 'verdant-suspicion',
    title: 'Roots of Suspicion',
    description: 'The Verdant Court begins to doubt your intentions.',
    triggered: false,
    triggerCondition: { factionId: 'verdant-court', reputationThreshold: -20, direction: 'below' },
  },
  {
    id: 'ember-offer',
    title: 'A Gilded Proposition',
    description: 'The Ember Throne approaches you with a private offer.',
    triggered: false,
    triggerCondition: { factionId: 'ember-throne', reputationThreshold: 20, direction: 'above' },
  },
];
