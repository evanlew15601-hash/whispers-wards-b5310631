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
    text: 'Dusk darkens the stained glass as you step into Concord Hall. Commander Aldric Vane of the Iron Pact looks you over like a quartermaster—quick, unsentimental.\n\n"So. The envoy." His gaze flicks up and down. "I\'d pictured someone taller. No matter. Seventeen bodies this moon on the Greenmarch. We don\'t get another month of speeches. We get an answer. Treaty… or war. Which did you ride in on?"',
    choices: [
      {
        id: 'diplomatic',
        text: '"Words first, Commander. Let me hear the Court before we bare steel."',
        effects: [
          { factionId: 'iron-pact', reputationChange: -5 },
          { factionId: 'verdant-court', reputationChange: 10 },
        ],
        nextNodeId: 'aldric-diplomatic',
      },
      {
        id: 'pragmatic',
        text: '"Tell me what you need—without the ceremony."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 10 },
        ],
        nextNodeId: 'aldric-pragmatic',
      },
      {
        id: 'information',
        text: '"Seventeen dead is a story. Who\'s shaping it?"',
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
    text: 'Vane\'s jaw tightens. "Words." He says it like an insult. "The Verdant Court has had months to talk. Months to explain why my patrols keep coming back with fewer men."\n\nHe leans forward. "But very well. If you want their side, the Court\'s emissary is in the eastern wing. A woman called Thessaly. Watch her. She listens more than she speaks."',
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
    text: 'Vane goes still.\n\n"You\'re perceptive. I\'ll grant you that." He lowers his voice. "Three of the dead bore wounds no druid spell could make. Burns. Deep, alchemical burns. The Verdant Court doesn\'t use fire magic—it\'s anathema to their creed."\n\nHis eyes narrow. "Someone wants this war. Someone who profits from chaos between the Pact and the Court. I have suspicions, but no proof."',
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
    text: 'The eastern wing smells of moss and old rain. Thessaly sits cross-legged on the stone floor, eyes closed, vines looping up the walls like idle handwriting. She speaks without opening her eyes.\n\n"The envoy." A pause—just long enough to make you feel measured. "I heard you three corridors ago. These stones remember everything. Every boot. Every blade. Every lie."\n\nHer eyes open—green as deep canopy after rain. "So tell me. Did Vane send you to bargain… or to count my secrets?"',
    choices: [
      {
        id: 'honest',
        text: '"Neither. I came because the next funeral will be on all our hands."',
        effects: [
          { factionId: 'verdant-court', reputationChange: 15 },
          { factionId: 'iron-pact', reputationChange: -5 },
        ],
        nextNodeId: 'thessaly-honest',
      },
      {
        id: 'strategic',
        text: '"He warned me about you. Said you notice what others miss. Is that true?"',
        effects: [
          { factionId: 'verdant-court', reputationChange: 5 },
        ],
        nextNodeId: 'thessaly-strategic',
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
        nextNodeId: 'aldric-map-confront',
        revealsInfo: 'The Ember Throne forged maps to manipulate the border dispute.',
      },
      {
        id: 'keep-secret',
        text: 'Say nothing for now. This information could be worth more as leverage later.',
        effects: [
          { factionId: 'ember-throne', reputationChange: 5 },
        ],
        nextNodeId: 'concord-hub',
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
        nextNodeId: 'concord-hub',
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
        nextNodeId: 'renzo-intro',
        revealsInfo: 'Trade Consul Renzo of the Ember Throne arrived suspiciously before the border killings began.',
      },
    ],
  },
  'investigation-start': {
    id: 'investigation-start',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: '"Careful investigation." Vane considers this. "Very well. You have the bearing of someone who finishes what they start. The Concord Hall has emissaries from all three factions. Speak to whom you wish. But remember—every question you ask reveals what you\'re looking for."\n\nHe turns back to the window. "In this hall, information matters more than steel."',
    choices: [
      {
        id: 'begin',
        text: '"Then I\'ll wield it carefully. Thank you, Commander."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 5 },
        ],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'concord-hub': {
    id: 'concord-hub',
    speaker: 'Narrator',
    text: 'Concord Hall was built for discretion. Velvet muffles footsteps. Stone carries voices farther than it should. Every corridor has someone listening.\n\nThe delegations keep to their corners, watching one another, waiting for you to blink first.\n\nIf you want peace, you\'ll have to earn it: with proof, with favors, or by giving someone a way to back down without humiliation.',
    choices: [
      {
        id: 'hub-aldric',
        text: 'Go back to Vane and see what he\'ll give when pressed.',
        effects: [],
        nextNodeId: 'aldric-followup',
      },
      {
        id: 'hub-thessaly',
        text: 'Find Thessaly in the eastern wing and read what she\'s not saying.',
        effects: [],
        nextNodeId: 'thessaly-followup',
      },
      {
        id: 'hub-renzo',
        text: 'Ask for Renzo. Merchants always want something.',
        effects: [],
        nextNodeId: 'renzo-intro',
      },
      {
        id: 'hub-archives',
        text: 'Dig through the archives for treaties, loopholes, and rot.',
        effects: [],
        nextNodeId: 'hall-archives',
      },
      {
        id: 'hub-summit',
        text: 'Call the summit and force everyone into the same light.',
        effects: [],
        nextNodeId: 'summit-start',
      },
    ],
  },
  'aldric-map-confront': {
    id: 'aldric-map-confront',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'For a heartbeat Vane says nothing. Then the map case snaps shut under his fist.\n\n"Neutral ground," he repeats. "So Ember redraws ink and sells us a war."\n\nHis gaze hardens. "If Renzo forged this, I want him in the chamber. But I won\'t swing without witnesses. Not here."',
    choices: [
      {
        id: 'map-demand-renzo',
        text: '"Then let\'s speak to Renzo—with the map in plain sight."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 5 },
        ],
        nextNodeId: 'renzo-intro',
      },
      {
        id: 'map-call-summit',
        text: '"We\'ll settle this publicly. Call the summit and force the truth into the light."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 3 },
          { factionId: 'verdant-court', reputationChange: 3 },
        ],
        nextNodeId: 'summit-start',
      },
      {
        id: 'map-hold-leverage',
        text: 'Keep quiet for now. This could be leverage later.',
        effects: [
          { factionId: 'ember-throne', reputationChange: 3 },
        ],
        nextNodeId: 'concord-hub',
        revealsInfo: 'You confirmed the Ember Throne\'s cartography is forged, and chose to keep it as leverage.',
      },
    ],
  },
  'aldric-followup': {
    id: 'aldric-followup',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'Vane waits beside the war table, fingers drumming a steady cadence against the hilt of his sword.\n\n"Well, envoy? Are the druids willing to stop bleeding my border patrols? Or do I send steel into the trees?"',
    choices: [
      {
        id: 'aldric-council',
        text: '"There\'s a third path: shared stewardship of the Pass. No banners. No monopolies."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 3 },
          { factionId: 'verdant-court', reputationChange: 3 },
        ],
        nextNodeId: 'aldric-council-proposal',
      },
      {
        id: 'aldric-war',
        text: '"If you want the Pass, take it. I\'ll argue your case at the summit."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 10 },
          { factionId: 'verdant-court', reputationChange: -5 },
        ],
        nextNodeId: 'aldric-war-urge',
      },
      {
        id: 'aldric-burns',
        text: '"Tell me more about the burns. I think the killer wants you to blame the Court."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 5 },
        ],
        nextNodeId: 'aldric-burns-details',
      },
      {
        id: 'aldric-dispatches',
        text: '"Show me the patrol orders. Who put them on that route?"',
        effects: [
          { factionId: 'iron-pact', reputationChange: 3 },
        ],
        nextNodeId: 'iron-dispatch-audit',
      },
      {
        id: 'aldric-back',
        text: 'Step back and pursue other leads first.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'aldric-council-proposal': {
    id: 'aldric-council-proposal',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'Vane\'s expression twists—part irritation, part reluctant interest.\n\n"Shared ground means shared risk. But it also keeps the route open." He exhales through his nose. "If the Court can stop treating every patrol like a raid, I can listen."\n\n"Bring me something I can hold them to."',
    choices: [
      {
        id: 'council-archives',
        text: '"Then I\'ll find the oldest law in this hall and make it binding again."',
        effects: [],
        nextNodeId: 'hall-archives',
      },
      {
        id: 'council-summit',
        text: '"No more private corners. We settle this at the summit."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 3 },
        ],
        nextNodeId: 'summit-start',
      },
      {
        id: 'council-back',
        text: '"I\'ll speak with the Court and return."',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'aldric-war-urge': {
    id: 'aldric-war-urge',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'The Commander\'s smile is small and sharp.\n\n"Finally. Someone who understands that peace is what you have after victory." He straightens. "If you\'re with us, say it plainly in front of the others. Let them see where the realm\'s spine is."',
    choices: [
      {
        id: 'war-to-summit',
        text: 'Go to the summit and press the Iron Pact\'s claim.',
        effects: [],
        nextNodeId: 'summit-start',
      },
      {
        id: 'war-doubt',
        text: 'Hesitate. "I\'ll weigh every cost before I recommend war."',
        effects: [
          { factionId: 'iron-pact', reputationChange: -5 },
          { factionId: 'verdant-court', reputationChange: 5 },
        ],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'aldric-burns-details': {
    id: 'aldric-burns-details',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'Vane opens a cloth-wrapped bundle on the table: a splinter of blackened wood, edges bubbled like wax.\n\n"From a watchtower. The men were found with their throats intact—no vines, no thorns, no choking pollen. Just heat. And this." He taps the char. "Smells like sulfur. And someone paid for it."\n\n"If you find a ledger, a name, a single merchant seal tied to those patrol routes... I\'ll have proof enough."',
    choices: [
      {
        id: 'burns-renzo',
        text: '"I\'ll speak to Renzo. Merchants leave trails."',
        effects: [
          { factionId: 'ember-throne', reputationChange: -3 },
        ],
        nextNodeId: 'renzo-intro',
        revealsInfo: 'The burns match alchemical fire, not Verdant magic. Aldric needs merchant proof to move.',
      },
      {
        id: 'burns-thessaly',
        text: '"I\'ll compare this with what Thessaly knows."',
        effects: [
          { factionId: 'verdant-court', reputationChange: 3 },
        ],
        nextNodeId: 'thessaly-followup',
      },
      {
        id: 'burns-back',
        text: 'Return to the wider hall and keep digging.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'iron-dispatch-audit': {
    id: 'iron-dispatch-audit',
    speaker: 'Quartermaster Ilya Rook',
    speakerFaction: 'iron-pact',
    text: 'Vane waves you through a side door into a cramped records room. A quartermaster waits with a stack of forms and a face that says she has stopped being surprised.\n\n"This is the patrol order," Rook says, tapping the reroute slip. "Iron seal. Correct phrasing. The problem is the docket number."\n\nShe slides another sheet across. "That number belongs to an Ember filing with the Hall clerks. Grain storage. East wing. Last week. Someone reused it so a clerk would wave the order through without reading."\n\nRook meets your eyes. "Either Ember\'s paperwork was copied, or someone wants you to think it was."',
    choices: [
      {
        id: 'dispatch-archives',
        text: 'Take the docket number to the archives and confirm the filing.',
        effects: [
          { factionId: 'iron-pact', reputationChange: 3 },
        ],
        nextNodeId: 'hall-archives',
        revealsInfo: 'A patrol reroute order carried a real Concord docket number tied to an Ember filing.',
      },
      {
        id: 'dispatch-renzo',
        text: 'Go to Renzo and ask why Hall docket numbers are showing up on Iron orders.',
        effects: [
          { factionId: 'ember-throne', reputationChange: -3 },
        ],
        nextNodeId: 'renzo-intro',
        revealsInfo: 'A patrol reroute order carried a real Concord docket number tied to an Ember filing.',
      },
      {
        id: 'dispatch-back',
        text: 'Return to the hall and keep pulling threads.',
        effects: [],
        nextNodeId: 'concord-hub',
        revealsInfo: 'A patrol reroute order carried a real Concord docket number tied to an Ember filing.',
      },
    ],
  },
  'thessaly-honest': {
    id: 'thessaly-honest',
    speaker: 'Emissary Thessaly',
    speakerFaction: 'verdant-court',
    text: 'Thessaly watches you with a patient, unsettling stillness.\n\n"Peace takes work," she says. "It takes restraint. It takes people giving up what they\'re sure they\'re owed."\n\nA vine curls around her wrist. "Ask, envoy. If you\'re truly here for the realm, I\'ll answer what I can."',
    choices: [
      {
        id: 'honest-pass',
        text: '"Tell me what makes the Greenmarch Pass sacred."',
        effects: [
          { factionId: 'verdant-court', reputationChange: 5 },
        ],
        nextNodeId: 'thessaly-pass',
      },
      {
        id: 'honest-burns',
        text: '"The dead were burned. Not by forest magic. Who benefits from that?"',
        effects: [
          { factionId: 'verdant-court', reputationChange: 3 },
          { factionId: 'ember-throne', reputationChange: -3 },
        ],
        nextNodeId: 'thessaly-burns',
      },
      {
        id: 'honest-oath',
        text: '"If we stop this war, I\'ll need allies. Will the Court stand with me?"',
        effects: [
          { factionId: 'verdant-court', reputationChange: 5 },
        ],
        nextNodeId: 'thessaly-oath',
      },
      {
        id: 'honest-back',
        text: 'Leave Thessaly to her vines and return to the hall.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'thessaly-strategic': {
    id: 'thessaly-strategic',
    speaker: 'Emissary Thessaly',
    speakerFaction: 'verdant-court',
    text: 'A smile ghosts across Thessaly\'s mouth.\n\n"He warned you about me." She tilts her head. "Good. It means he\'s afraid of the same thing I am: an enemy neither of us can name. The sort that buys wars and sells peace."\n\n"If you want to play at shadows, envoy, I can teach you. But every lesson costs."',
    choices: [
      {
        id: 'strategic-trade',
        text: 'Offer a sliver of Iron Pact intent—just enough to earn Thessaly\'s trust.',
        effects: [
          { factionId: 'verdant-court', reputationChange: 10 },
          { factionId: 'iron-pact', reputationChange: -10 },
        ],
        nextNodeId: 'thessaly-burns',
        revealsInfo: 'You hinted that Aldric is ready for war if negotiations fail.',
      },
      {
        id: 'strategic-refuse',
        text: '"No games. Give me the truth, and I\'ll give you mine."',
        effects: [
          { factionId: 'verdant-court', reputationChange: 5 },
        ],
        nextNodeId: 'thessaly-honest',
      },
      {
        id: 'strategic-back',
        text: 'Withdraw before you owe Thessaly anything.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'thessaly-followup': {
    id: 'thessaly-followup',
    speaker: 'Emissary Thessaly',
    speakerFaction: 'verdant-court',
    text: 'Thessaly is exactly where you left her.\n\n"Back again," she says. "Either you\'ve found a truth, or you\'ve found a lie worth chasing."',
    choices: [
      {
        id: 'followup-pass',
        text: 'Ask again about the Pass and the wards beneath it.',
        effects: [
          { factionId: 'verdant-court', reputationChange: 3 },
        ],
        nextNodeId: 'thessaly-pass',
      },
      {
        id: 'followup-ledger',
        text: '"If I bring you proof of Ember meddling, will you meet Aldric halfway?"',
        effects: [
          { factionId: 'verdant-court', reputationChange: 3 },
        ],
        nextNodeId: 'concord-hub',
      },
      {
        id: 'followup-back',
        text: 'Return to the corridor-crossroads.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'thessaly-pass': {
    id: 'thessaly-pass',
    speaker: 'Emissary Thessaly',
    speakerFaction: 'verdant-court',
    text: '"Sacred is a lazy word," Thessaly says. "The Pass is a hinge. Beneath its stone is an old binding—older than the Pact\'s oaths and older than Ember coin.\n\nBreak the hinge and the door swings open. Something wakes."\n\nShe studies you. "The Court wards it because no one else will. But I\'m not blind to what Aldric fears: being choked off from the south."',
    choices: [
      {
        id: 'pass-shared',
        text: '"Then help me sell a shared solution. Wardens from all sides, no single claim."',
        effects: [
          { factionId: 'verdant-court', reputationChange: 5 },
          { factionId: 'iron-pact', reputationChange: 5 },
        ],
        nextNodeId: 'concord-hub',
        revealsInfo: 'Thessaly admits the Pass is an ancient binding point, and is open to shared wardenship if it protects the seal.',
      },
      {
        id: 'pass-proof',
        text: '"If there\'s an old binding, there\'s an old record. Where is it written?"',
        effects: [
          { factionId: 'verdant-court', reputationChange: 3 },
        ],
        nextNodeId: 'hall-archives',
      },
      {
        id: 'pass-pledge',
        text: '"Let me swear to the Court\'s cause. If the Pass is a seal, I\'ll defend it."',
        effects: [
          { factionId: 'verdant-court', reputationChange: 10 },
          { factionId: 'iron-pact', reputationChange: -5 },
        ],
        nextNodeId: 'thessaly-oath',
      },
      {
        id: 'pass-inspect',
        text: '"Show me one of the warding points. If someone is tampering with it, I need to see how."',
        effects: [
          { factionId: 'verdant-court', reputationChange: 3 },
        ],
        nextNodeId: 'verdant-ward-inspection',
      },
      {
        id: 'pass-back',
        text: 'Return to the hall and gather more leverage.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'verdant-ward-inspection': {
    id: 'verdant-ward-inspection',
    speaker: 'Emissary Thessaly',
    speakerFaction: 'verdant-court',
    text: 'Thessaly leads you down a servants\' stair to an older part of the hall. The air is cooler here. The stone feels damp even when it\'s dry.\n\nShe stops at an archway marked with shallow carvings. "One of the anchors," she says. "A place the ward holds onto."\n\nIn the mortar line, someone has scraped at the seam. Grey grit clings to the groove, and it smells faintly of sulfur.\n\n"Furnace salt," Thessaly says. "Not ours. It doesn\'t shatter a ward. It makes it slip for a short time. Long enough for someone to pass and leave you arguing about who was allowed to be there."',
    choices: [
      {
        id: 'ward-sample',
        text: 'Take a pinch of the grit and bring it to Vane.',
        effects: [
          { factionId: 'verdant-court', reputationChange: 3 },
          { factionId: 'iron-pact', reputationChange: 3 },
          { factionId: 'ember-throne', reputationChange: -3 },
        ],
        nextNodeId: 'aldric-ward-sample',
        revealsInfo: 'A Verdant ward anchor was scraped and dusted with furnace salt to make the ward slip temporarily.',
      },
      {
        id: 'ward-renzo',
        text: 'Go to Renzo and ask why his merchants trade in furnace salt.',
        effects: [
          { factionId: 'ember-throne', reputationChange: -3 },
        ],
        nextNodeId: 'renzo-intro',
        revealsInfo: 'A Verdant ward anchor was scraped and dusted with furnace salt to make the ward slip temporarily.',
      },
      {
        id: 'ward-back',
        text: 'Return to the hall and keep digging.',
        effects: [],
        nextNodeId: 'concord-hub',
        revealsInfo: 'A Verdant ward anchor was scraped and dusted with furnace salt to make the ward slip temporarily.',
      },
    ],
  },
  'aldric-ward-sample': {
    id: 'aldric-ward-sample',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'Vane pinches the grey grit between thumb and forefinger and smells it.\n\n"Sulfur," he says. He glances at the charred splinter on the table. "Same family."\n\nHe looks up. "That isn\'t druid work. It\'s sabotage."\n\nHe calls toward the door. "No retaliation patrols without my mark. Not until the summit." Then, quieter, to you: "Now give me the name that bought this."',
    choices: [
      {
        id: 'sample-archives',
        text: 'Take the lead to the archives and look for the matching docket.',
        effects: [
          { factionId: 'iron-pact', reputationChange: 3 },
        ],
        nextNodeId: 'hall-archives',
      },
      {
        id: 'sample-renzo',
        text: 'Go back to Renzo. If his ledgers mention furnace salt, you want to see it.',
        effects: [
          { factionId: 'ember-throne', reputationChange: -3 },
        ],
        nextNodeId: 'renzo-ledger-request',
      },
      {
        id: 'sample-back',
        text: 'Return to the hall and keep pulling threads.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'thessaly-burns': {
    id: 'thessaly-burns',
    speaker: 'Emissary Thessaly',
    speakerFaction: 'verdant-court',
    text: 'Thessaly\'s eyes narrow, and for the first time the vines on the wall stop moving.\n\n"Fire is taboo to us," she says. "Not because we can\'t wield it—but because fire doesn\'t stop when it\'s sated."\n\nShe leans in. "Alchemical burns smell like furnaces and contracts. If you seek who profits, follow the people who speak in invoices."',
    choices: [
      {
        id: 'burns-spies',
        text: '"Can the Court watch Renzo without being seen?"',
        effects: [
          { factionId: 'verdant-court', reputationChange: 10 },
          { factionId: 'ember-throne', reputationChange: -5 },
        ],
        nextNodeId: 'thessaly-spies',
        revealsInfo: 'Thessaly can place Verdant eyes in Ember quarters—vines that listen through stone.',
      },
      {
        id: 'burns-warn-aldric',
        text: '"I\'ll warn Aldric that the burns implicate Ember, not the Court."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 5 },
          { factionId: 'verdant-court', reputationChange: 5 },
          { factionId: 'ember-throne', reputationChange: -5 },
        ],
        nextNodeId: 'aldric-burns-warning',
      },
      {
        id: 'burns-back',
        text: 'Return to the corridor-crossroads.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'thessaly-spies': {
    id: 'thessaly-spies',
    speaker: 'Narrator',
    text: 'Thessaly presses two fingers to the stone. The air tastes suddenly of sap.\n\n"I\'ll know who enters Renzo\'s rooms, and what they carry," she murmurs. "But remember: when you ask a forest to listen, it hears more than you intend."',
    choices: [
      {
        id: 'spies-back',
        text: 'Return to the hall and let Thessaly\'s vines work.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'thessaly-oath': {
    id: 'thessaly-oath',
    speaker: 'Emissary Thessaly',
    speakerFaction: 'verdant-court',
    text: 'Thessaly holds out her hand. A thin cut opens on her palm without a blade, and a single drop of blood beads like a ruby.\n\n"We bind with living things," she says softly. "Words rot. Blood remembers."\n\n"Swear to protect the seal beneath Greenmarch, and the Court will treat you as kin. Or walk away, and we\'ll treat you as any other visitor with sharp intentions."',
    choices: [
      {
        id: 'oath-accept',
        text: 'Take the Root-Oath. "I swear."',
        effects: [
          { factionId: 'verdant-court', reputationChange: 15 },
          { factionId: 'ember-throne', reputationChange: -3 },
        ],
        nextNodeId: 'concord-hub',
        revealsInfo: 'You swore the Root-Oath to protect the binding beneath Greenmarch Pass.',
      },
      {
        id: 'oath-half',
        text: 'Avoid the cut. "I\'ll protect the realm first. Your seal is part of that."',
        effects: [
          { factionId: 'verdant-court', reputationChange: 5 },
        ],
        nextNodeId: 'concord-hub',
      },
      {
        id: 'oath-refuse',
        text: 'Refuse. "I can\'t swear what I haven\'t seen."',
        effects: [
          { factionId: 'verdant-court', reputationChange: -5 },
        ],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'aldric-burns-warning': {
    id: 'aldric-burns-warning',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'Vane listens without interruption. When you finish, he exhales slowly.\n\n"Then my suspicions weren\'t paranoia." His eyes flick toward the hall doors. "If Ember lit the match, they\'ll try to sell us the bucket next."\n\n"Bring me proof. Not poetry."',
    choices: [
      {
        id: 'warning-back',
        text: 'Return to the hall and hunt the proof.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'renzo-intro': {
    id: 'renzo-intro',
    speaker: 'Trade Consul Renzo',
    speakerFaction: 'ember-throne',
    text: 'Renzo receives you in a chamber that smells of spiced wine and polished brass. He is polished and careful, dressed to look harmless.\n\n"Envoy," he says warmly, as if you\'ve been friends for years. "You\'re standing at the edge of a very expensive misunderstanding. Allow me to make it profitable for everyone involved."',
    choices: [
      {
        id: 'renzo-hear',
        text: '"Speak your offer plainly."',
        effects: [
          { factionId: 'ember-throne', reputationChange: 5 },
        ],
        nextNodeId: 'renzo-offer',
      },
      {
        id: 'renzo-accuse',
        text: '"Seventeen are dead, and you arrived before the first. Convince me you\'re not the spark."',
        effects: [
          { factionId: 'ember-throne', reputationChange: -5 },
          { factionId: 'iron-pact', reputationChange: 3 },
        ],
        nextNodeId: 'renzo-deflect',
      },
      {
        id: 'renzo-ledgers',
        text: '"If you\'re a mediator, you won\'t mind showing me your ledgers."',
        effects: [
          { factionId: 'ember-throne', reputationChange: -3 },
        ],
        nextNodeId: 'renzo-ledger-request',
      },
      {
        id: 'renzo-leave',
        text: 'Leave Renzo to his perfume and return to the hall.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'renzo-offer': {
    id: 'renzo-offer',
    speaker: 'Trade Consul Renzo',
    speakerFaction: 'ember-throne',
    text: 'Renzo produces a parchment already bearing Ember seals.\n\n"A simple charter," he says. "The Greenmarch Pass becomes a neutral exchange administered by Ember accountants. The Iron Pact gets predictable tariffs. The Verdant Court gets assurances no one digs into their sacred mud. You get to claim you prevented a war."\n\nHis smile never touches his eyes. "And Ember gets stability. Stability is profitable."',
    choices: [
      {
        id: 'offer-sign',
        text: 'Sign the charter and accept Ember arbitration.',
        effects: [
          { factionId: 'ember-throne', reputationChange: 20 },
          { factionId: 'iron-pact', reputationChange: -10 },
          { factionId: 'verdant-court', reputationChange: -10 },
        ],
        nextNodeId: 'renzo-charter-signed',
        revealsInfo: 'You signed Renzo\'s charter: Ember-administered neutrality with Ember-held ledgers and tariffs.',
      },
      {
        id: 'offer-snoop',
        text: '"I\'ll consider it. But I want to see your expense ledgers first."',
        effects: [
          { factionId: 'ember-throne', reputationChange: 5 },
        ],
        nextNodeId: 'renzo-ledger-request',
      },
      {
        id: 'offer-refuse',
        text: 'Refuse. "I won\'t put the realm\'s throat in a merchant\'s hand."',
        effects: [
          { factionId: 'ember-throne', reputationChange: -10 },
        ],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'renzo-deflect': {
    id: 'renzo-deflect',
    speaker: 'Trade Consul Renzo',
    speakerFaction: 'ember-throne',
    text: 'Renzo laughs quietly.\n\n"If I could kill seventeen people by arriving at a city three days early, I\'d charge more for my carriage." He spreads his hands. "I\'m guilty only of being where coin is moving."\n\n"But I\'m happy to ease your suspicions—provided you\'re willing to treat this like business."',
    choices: [
      {
        id: 'deflect-press',
        text: 'Press harder. "Then show me numbers. Coin doesn\'t lie."',
        effects: [
          { factionId: 'ember-throne', reputationChange: -3 },
        ],
        nextNodeId: 'renzo-ledger-request',
      },
      {
        id: 'deflect-play',
        text: 'Play along. "Fine. Let\'s talk business."',
        effects: [
          { factionId: 'ember-throne', reputationChange: 3 },
        ],
        nextNodeId: 'renzo-offer',
      },
      {
        id: 'deflect-leave',
        text: 'Withdraw and report back later.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'renzo-ledger-request': {
    id: 'renzo-ledger-request',
    speaker: 'Trade Consul Renzo',
    speakerFaction: 'ember-throne',
    text: 'Renzo\'s smile tightens. Still a smile—just smaller.\n\n"Ledgers are private," he says. "But perhaps we can compromise." He gestures, and a guard places a thick book on the table. The ink is fresh. Some pages are newer than others.\n\n"You may read," Renzo says. "Not copy. Not take. Trust is a currency too."',
    choices: [
      {
        id: 'ledger-steal',
        text: 'Wait for a distraction and steal a copy of the relevant pages.',
        effects: [
          { factionId: 'ember-throne', reputationChange: -15 },
        ],
        nextNodeId: 'renzo-ledger-stolen',
        revealsInfo: 'You stole a copy of Renzo\'s ledger pages while his guards were distracted.',
      },
      {
        id: 'ledger-buy',
        text: 'Offer payment for an "official" copy. Let Renzo think you\'re buying peace.',
        effects: [
          { factionId: 'ember-throne', reputationChange: 10 },
        ],
        nextNodeId: 'renzo-ledger-bought',
      },
      {
        id: 'ledger-manifests',
        text: '"Numbers are only half the story. Show me the manifests that match these entries."',
        effects: [
          { factionId: 'ember-throne', reputationChange: 3 },
        ],
        nextNodeId: 'ember-manifest-check',
      },
      {
        id: 'ledger-back',
        text: 'Leave before you owe him anything else.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'ember-manifest-check': {
    id: 'ember-manifest-check',
    speaker: 'Trade Consul Renzo',
    speakerFaction: 'ember-throne',
    text: 'Renzo watches you read for a minute, then taps the table. "If you want to understand the code, look at what moved."\n\nA clerk brings a slimmer manifest book. Most lines are ordinary: lamp oil, wax, spiced wine. One entry catches your eye. A margin mark matches the symbol you saw beside "furnace salts." The item is written as "road salt." Next to it is a Concord Hall docket number.\n\nRenzo follows your gaze. "We file through the Hall like everyone else," he says. "The realm runs on paperwork."',
    choices: [
      {
        id: 'manifest-archives',
        text: 'Take the docket number to the archives and see who filed it.',
        effects: [],
        nextNodeId: 'hall-archives',
        revealsInfo: 'Renzo\'s manifests list furnace salts disguised as "road salt" under a Concord Hall docket number.',
      },
      {
        id: 'manifest-quartermaster',
        text: 'Take the docket number to Iron records and compare it to the patrol order.',
        effects: [
          { factionId: 'iron-pact', reputationChange: 3 },
        ],
        nextNodeId: 'iron-dispatch-audit',
        revealsInfo: 'Renzo\'s manifests list furnace salts disguised as "road salt" under a Concord Hall docket number.',
      },
      {
        id: 'manifest-back',
        text: 'Return to the hall with the docket number in your head.',
        effects: [],
        nextNodeId: 'concord-hub',
        revealsInfo: 'Renzo\'s manifests list furnace salts disguised as "road salt" under a Concord Hall docket number.',
      },
    ],
  },
  'renzo-ledger-stolen': {
    id: 'renzo-ledger-stolen',
    speaker: 'Narrator',
    text: 'A spilled goblet. A momentary flare of temper. While eyes turn, your hand moves.\n\nLater, in the quiet of a corridor, you unfold the copied pages. The entries are coded—but a repeated symbol appears beside payments made to "ash-cloaks" and "furnace salts". The dates match the first border deaths.\n\nIt doesn\'t name the killers, but it ties Ember coin to the same week the border began to burn.',
    choices: [
      {
        id: 'stolen-to-aldric',
        text: 'Take the ledger pages to Commander Vane.',
        effects: [
          { factionId: 'iron-pact', reputationChange: 10 },
          { factionId: 'ember-throne', reputationChange: -10 },
        ],
        nextNodeId: 'aldric-ledger',
        revealsInfo: 'Renzo\'s ledger pages show coded payments tied to the border killings.',
      },
      {
        id: 'stolen-to-thessaly',
        text: 'Take the ledger pages to Thessaly.',
        effects: [
          { factionId: 'verdant-court', reputationChange: 10 },
          { factionId: 'ember-throne', reputationChange: -10 },
        ],
        nextNodeId: 'thessaly-ledger',
        revealsInfo: 'Renzo\'s ledger pages show coded payments tied to the border killings.',
      },
      {
        id: 'stolen-sell',
        text: 'Return to Renzo and sell the pages back to him. Betrayal has a price.',
        effects: [
          { factionId: 'ember-throne', reputationChange: 20 },
          { factionId: 'iron-pact', reputationChange: -15 },
          { factionId: 'verdant-court', reputationChange: -15 },
        ],
        nextNodeId: 'renzo-ledger-sell',
        revealsInfo: 'You returned the stolen ledger pages to Renzo for coin and favor.',
      },
      {
        id: 'stolen-summit',
        text: 'Keep the pages and use them at the summit when all eyes are watching.',
        effects: [],
        nextNodeId: 'summit-start',
      },
    ],
  },
  'renzo-ledger-bought': {
    id: 'renzo-ledger-bought',
    speaker: 'Narrator',
    text: 'Renzo provides a neat copy, stamped and ribboned like a gift. It contains just enough truth to be credible—and just enough absence to be useful.\n\nStill, some numbers slip through: payments to "salts" and "guards" that spike precisely when the border began to burn.\n\nEven a curated ledger can implicate its author.',
    choices: [
      {
        id: 'bought-to-hub',
        text: 'Pocket what you\'ve learned and return to the hall.',
        effects: [],
        nextNodeId: 'concord-hub',
        revealsInfo: 'Renzo sold you a curated ledger copy; it still suggests payments aligned with the killings.',
      },
      {
        id: 'bought-summit',
        text: 'Use the ledger copy as a wedge at the summit.',
        effects: [],
        nextNodeId: 'summit-start',
      },
    ],
  },
  'renzo-charter-signed': {
    id: 'renzo-charter-signed',
    speaker: 'Trade Consul Renzo',
    speakerFaction: 'ember-throne',
    text: 'Renzo rolls the charter and seals it again, satisfied.\n\n"Excellent," he says. "Now we just have to convince the others it\'s in their interest."\n\nHe offers you a ring of lacquered obsidian. It\'s too heavy for decoration. It\'s a mark.',
    choices: [
      {
        id: 'charter-summit',
        text: 'Go to the summit and argue for Ember arbitration.',
        effects: [],
        nextNodeId: 'summit-start',
      },
      {
        id: 'charter-back',
        text: 'Return to the hall and test how the others react before you reveal the charter.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'renzo-ledger-sell': {
    id: 'renzo-ledger-sell',
    speaker: 'Trade Consul Renzo',
    speakerFaction: 'ember-throne',
    text: 'Renzo doesn\'t look surprised. He looks pleased.\n\n"Practical," he says, sliding a purse across the table. "You\'d be amazed how many idealists think evidence is worth more than comfort."\n\n"Keep your comfort, envoy. And remember who paid for it."',
    choices: [
      {
        id: 'sell-back',
        text: 'Return to the hall, heavier by coin and lighter by conscience.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'aldric-ledger': {
    id: 'aldric-ledger',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'Vane reads the coded entries once, then again.\n\n"Ash-cloaks." His mouth turns into a line. "Mercenaries. The sort Ember hires when they want a blade without a banner."\n\nHe folds the pages with deliberate care. "This is enough to shame them. Maybe enough to hang someone. But only if I can get the Court to see it as well."',
    choices: [
      {
        id: 'ledger-summit',
        text: '"Then we take it to the summit and make Ember answer."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 5 },
          { factionId: 'verdant-court', reputationChange: 3 },
        ],
        nextNodeId: 'summit-start',
      },
      {
        id: 'ledger-back',
        text: 'Hold the proof for now and keep negotiating in the corridors.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'thessaly-ledger': {
    id: 'thessaly-ledger',
    speaker: 'Emissary Thessaly',
    speakerFaction: 'verdant-court',
    text: 'Thessaly\'s eyes move over the pages without changing expression.\n\n"These marks are mercenary cant," she murmurs. A vine brushes the paper, and for a moment the ink seems to darken. "I\'ve seen it before—always near places merchants want softened up."\n\n"If we expose this, Ember will strike back. If we keep it quiet, we can steer Aldric away from war."',
    choices: [
      {
        id: 'tledger-summit',
        text: 'Expose Ember at the summit. Let retaliation come in the open.',
        effects: [
          { factionId: 'verdant-court', reputationChange: 5 },
          { factionId: 'iron-pact', reputationChange: 3 },
          { factionId: 'ember-throne', reputationChange: -10 },
        ],
        nextNodeId: 'summit-start',
      },
      {
        id: 'tledger-quiet',
        text: 'Let Thessaly work in shadows while you keep negotiating.',
        effects: [
          { factionId: 'verdant-court', reputationChange: 5 },
        ],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'hall-archives': {
    id: 'hall-archives',
    speaker: 'Narrator',
    text: 'The Concord Hall archives are colder than the rest of the building.\n\nYou find dusty binders of treaties, border surveys, and oath-logs. One parchment stands out: a brittle accord signed by all three factions generations ago.\n\nIt names the Greenmarch Pass as "neutral hinge-ground"—shared stewardship, shared tolls, and a clause written in Verdant hand about "keeping the binding unbroken."',
    choices: [
      {
        id: 'archives-summit',
        text: 'Take the treaty to the summit as leverage.',
        effects: [
          { factionId: 'iron-pact', reputationChange: 3 },
          { factionId: 'verdant-court', reputationChange: 3 },
        ],
        nextNodeId: 'summit-start',
        revealsInfo: 'An old tripartite accord names Greenmarch Pass neutral hinge-ground and warns to keep the binding unbroken.',
      },
      {
        id: 'archives-aldric',
        text: 'Show the accord to Aldric first. Soldiers respect paper when it\'s stamped with oaths.',
        effects: [
          { factionId: 'iron-pact', reputationChange: 5 },
        ],
        nextNodeId: 'aldric-archives',
        revealsInfo: 'The archives confirm Greenmarch Pass was once neutral ground under a tripartite accord.',
      },
      {
        id: 'archives-thessaly',
        text: 'Show the accord to Thessaly. Druids respect old bindings.',
        effects: [
          { factionId: 'verdant-court', reputationChange: 5 },
        ],
        nextNodeId: 'thessaly-archives',
        revealsInfo: 'The archives confirm Greenmarch Pass was once neutral ground under a tripartite accord.',
      },
      {
        id: 'archives-renzo',
        text: 'Sell the accord to Renzo. If history is a weapon, Ember will pay for ammunition.',
        effects: [
          { factionId: 'ember-throne', reputationChange: 15 },
          { factionId: 'iron-pact', reputationChange: -10 },
          { factionId: 'verdant-court', reputationChange: -10 },
        ],
        nextNodeId: 'renzo-archives',
        revealsInfo: 'You sold the old Greenmarch accord to Renzo.',
      },
      {
        id: 'archives-back',
        text: 'Leave the archives and return to the hall.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'aldric-archives': {
    id: 'aldric-archives',
    speaker: 'Commander Aldric Vane',
    speakerFaction: 'iron-pact',
    text: 'Vane reads the old accord, lips moving silently over each clause.\n\n"Neutral hinge-ground," he mutters. "So the Pass was never ours to claim outright. Nor theirs."\n\nHe looks up. "This could end the dispute—if the Court admits it\'s bound by the same ink. Or it could be the excuse Ember uses to squeeze us all."',
    choices: [
      {
        id: 'aarchives-summit',
        text: '"Then we put it on the table at the summit and force a new pact."',
        effects: [
          { factionId: 'iron-pact', reputationChange: 3 },
        ],
        nextNodeId: 'summit-start',
      },
      {
        id: 'aarchives-back',
        text: 'Return to the hall and gather more support first.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'thessaly-archives': {
    id: 'thessaly-archives',
    speaker: 'Emissary Thessaly',
    speakerFaction: 'verdant-court',
    text: 'Thessaly\'s fingers hover above the Verdant script for a long moment.\n\n"Yes," she whispers. "They wrote it down in a language even soldiers would respect."\n\nShe meets your eyes. "If you want peace, use this to bind Aldric to restraint. If you want power, use it to bind him to you."',
    choices: [
      {
        id: 'tarchives-summit',
        text: 'Take the accord to the summit and argue for shared stewardship.',
        effects: [
          { factionId: 'verdant-court', reputationChange: 3 },
          { factionId: 'iron-pact', reputationChange: 3 },
        ],
        nextNodeId: 'summit-start',
      },
      {
        id: 'tarchives-back',
        text: 'Return to the hall and keep negotiating.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'renzo-archives': {
    id: 'renzo-archives',
    speaker: 'Trade Consul Renzo',
    speakerFaction: 'ember-throne',
    text: 'Renzo\'s eyes shine when he sees the old accord.\n\n"A lovely artifact," he says, turning it carefully in his hands. "And artifacts are best kept safe."\n\nHe tucks it away with practiced care. "You\'ve made a sensible choice, envoy. The realm will thank you later—after it forgets how it was saved."',
    choices: [
      {
        id: 'rarchives-back',
        text: 'Return to the hall, wondering what you\'ve just sold away.',
        effects: [],
        nextNodeId: 'concord-hub',
      },
    ],
  },
  'summit-start': {
    id: 'summit-start',
    speaker: 'Narrator',
    text: 'At your request, the three emissaries gather in the central chamber beneath the stained glass. Aldric stands rigid, a hand never far from his sword. Thessaly sits still, watching every face. Renzo smiles as if the outcome is already a number on a page.\n\nAll three look to you. In this moment, your words become policy. Your silence becomes a sentence.',
    choices: [
      {
        id: 'summit-compact',
        text: 'Propose joint stewardship of the Pass: a council with shared patrol rights, shared wards, and shared tolls.',
        effects: [
          { factionId: 'iron-pact', reputationChange: 10 },
          { factionId: 'verdant-court', reputationChange: 10 },
          { factionId: 'ember-throne', reputationChange: -10 },
        ],
        nextNodeId: 'ending-greenmarch-compact',
        revealsInfo: 'You forced a shared-wardenship solution based on the old Greenmarch accord.',
      },
      {
        id: 'summit-iron',
        text: 'Back the Iron Pact: recommend occupation of the Pass and punishment for Verdant trespass.',
        effects: [
          { factionId: 'iron-pact', reputationChange: 20 },
          { factionId: 'verdant-court', reputationChange: -30 },
          { factionId: 'ember-throne', reputationChange: 5 },
        ],
        nextNodeId: 'ending-iron-march',
        requiredReputation: { factionId: 'iron-pact', min: 15 },
      },
      {
        id: 'summit-verdant',
        text: 'Back the Verdant Court: seal the Pass, forbid garrisons, and treat the binding as paramount.',
        effects: [
          { factionId: 'verdant-court', reputationChange: 20 },
          { factionId: 'iron-pact', reputationChange: -25 },
          { factionId: 'ember-throne', reputationChange: -10 },
        ],
        nextNodeId: 'ending-verdant-seal',
        requiredReputation: { factionId: 'verdant-court', min: 15 },
      },
      {
        id: 'summit-ember',
        text: 'Accept Ember arbitration: tariffs, ledgers, and "neutral" accountants to keep the Pass open.',
        effects: [
          { factionId: 'ember-throne', reputationChange: 25 },
          { factionId: 'iron-pact', reputationChange: -15 },
          { factionId: 'verdant-court', reputationChange: -15 },
        ],
        nextNodeId: 'ending-ember-web',
        requiredReputation: { factionId: 'ember-throne', min: 15 },
      },
      {
        id: 'summit-expose',
        text: 'Accuse the Ember Throne of fueling the conflict and demand sanctions.',
        effects: [
          { factionId: 'iron-pact', reputationChange: 10 },
          { factionId: 'verdant-court', reputationChange: 10 },
          { factionId: 'ember-throne', reputationChange: -40 },
        ],
        requiresAnySecrets: [
          'The Ember Throne forged maps to manipulate the border dispute.',
          'Renzo\'s ledger pages show coded payments tied to the border killings.',
          'Renzo\'s manifests list furnace salts disguised as "road salt" under a Concord Hall docket number.',
          'Renzo sold you a curated ledger copy; it still suggests payments aligned with the killings.',
        ],
        nextNodeId: 'ending-embers-fall',
        requiredReputation: { factionId: 'iron-pact', min: 5 },
        revealsInfo: 'You publicly accused the Ember Throne of engineering the conflict, citing maps, burns, and ledgers.',
      },
    ],
  },
  'ending-greenmarch-compact': {
    id: 'ending-greenmarch-compact',
    speaker: 'Narrator',
    text: 'The argument is hard and public. Aldric demands patrol rights. Thessaly demands the binding remain untouched. Renzo demands that someone—anyone—pay Ember for its "troubles."\n\nYou hold to the old accord until it becomes a new one. The Pass is declared neutral hinge-ground once more. A joint council is formed: iron to keep bandits out, verdant to keep the binding intact, and ember merchants allowed passage under transparent tolls rather than private tariffs.\n\nNo one leaves satisfied. But the border quiets, and the agreement has a chance to survive the winter.',
    choices: [
      {
        id: 'end-compact',
        text: 'Let the ink dry.',
        effects: [],
        nextNodeId: null,
      },
    ],
  },
  'ending-iron-march': {
    id: 'ending-iron-march',
    speaker: 'Narrator',
    text: 'Your words give Aldric permission. Within days, iron banners move through the Greenmarch Pass. The first clashes in the treeline are small—then they aren\'t.\n\nThe Iron Pact calls it "restoring order." The Verdant Court calls it "a wound in the world." Ember merchants sell both sides what they need to keep bleeding.\n\nHistory will record the Pass was taken. It will forget the price paid in sap and smoke.',
    choices: [
      {
        id: 'end-iron',
        text: 'Accept the consequences.',
        effects: [],
        nextNodeId: null,
      },
    ],
  },
  'ending-verdant-seal': {
    id: 'ending-verdant-seal',
    speaker: 'Narrator',
    text: 'Thessaly does not applaud. She acts.\n\nWithin a week, the Greenmarch Pass is a living labyrinth of thorn and mist. The binding beneath it is reinforced, the wards thick enough to turn a regiment around in circles until their supplies run dry.\n\nThe Iron Pact does not forgive humiliation. Ember does not forgive a closed trade route. But the border deaths stop, and something ancient under the stone settles back into its sleep.\n\nPeace holds, but it is kept behind a locked door.',
    choices: [
      {
        id: 'end-verdant',
        text: 'Leave the door locked.',
        effects: [],
        nextNodeId: null,
      },
    ],
  },
  'ending-ember-web': {
    id: 'ending-ember-web',
    speaker: 'Narrator',
    text: 'Renzo\'s smile widens as the others protest. You call it "neutral arbitration". Aldric calls it a leash. Thessaly calls it blight.\n\nBut the charter is signed. The Pass opens—not to soldiers or druids, but to auditors. Ember ledgers become the law, and every wagon crossing Greenmarch pays a toll that turns into influence, influence into obligation.\n\nThe killings end because the incentives change. The people who paid for the murders no longer need them.',
    choices: [
      {
        id: 'end-ember',
        text: 'Count the profits.',
        effects: [],
        nextNodeId: null,
      },
    ],
  },
  'ending-embers-fall': {
    id: 'ending-embers-fall',
    speaker: 'Narrator',
    text: 'The room turns cold when you lay the proof on the table. Forged borders. Alchemical burns. Mercenary payments hidden behind coded entries.\n\nRenzo\'s charm fails him for the first time; it cracks like lacquer. Aldric reaches for steel. Thessaly reaches for roots.\n\nYou stop it from becoming a murder. You turn it into a judgment. Ember\'s delegation is expelled, their trade privileges suspended until a full inquiry.\n\nThe Iron Pact and Verdant Court do not become friends. But they stop being used, and sometimes that\'s the first step toward peace.',
    choices: [
      {
        id: 'end-embers-fall',
        text: 'Watch the puppeteer\'s strings snap.',
        effects: [],
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
  {
    id: 'verdant-oathbound',
    title: 'Oathbound to the Canopy',
    description: 'The Verdant Court begins to treat you as kin, and expects you to protect the binding beneath Greenmarch.',
    triggered: false,
    triggerCondition: { factionId: 'verdant-court', reputationThreshold: 30, direction: 'above' },
  },
  {
    id: 'ember-charter-ring',
    title: 'Ink and Obsidian',
    description: 'The Ember Throne offers you an official mark of patronage: a charter ring and a private promise.',
    triggered: false,
    triggerCondition: { factionId: 'ember-throne', reputationThreshold: 35, direction: 'above' },
  },
  {
    id: 'iron-distrust',
    title: 'Whispers of Oathbreaking',
    description: 'Iron Pact officers begin to whisper that you are compromised.',
    triggered: false,
    triggerCondition: { factionId: 'iron-pact', reputationThreshold: -25, direction: 'below' },
  },
  {
    id: 'ember-reprisal',
    title: 'Smoke in the Corridors',
    description: 'Ember agents start shadowing you. Someone wants your evidence—or your silence.',
    triggered: false,
    triggerCondition: { factionId: 'ember-throne', reputationThreshold: -25, direction: 'below' },
  },
  {
    id: 'verdant-blessing',
    title: 'The Canopy\'s Blessing',
    description: 'Verdant watchers stop treating you like prey. For now, you walk unchased in their sight.',
    triggered: false,
    triggerCondition: { factionId: 'verdant-court', reputationThreshold: 20, direction: 'above' },
  },
];
