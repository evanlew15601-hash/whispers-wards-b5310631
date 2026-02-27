export type CodexCategory =
  | 'Realm'
  | 'Law & Custom'
  | 'Factions'
  | 'Places'
  | 'Roles'
  | 'Magic';

export type CodexEntry = {
  id: string;
  title: string;
  category: CodexCategory;
  summary: string;
  paragraphs: string[];
};

export const codexCategories: CodexCategory[] = [
  'Realm',
  'Law & Custom',
  'Factions',
  'Places',
  'Roles',
  'Magic',
];

export const codexEntries: CodexEntry[] = [
  {
    id: 'concord',
    title: 'The Concord',
    category: 'Realm',
    summary: 'A legitimacy system built from witnessed oaths, precedent, and public memory.',
    paragraphs: [
      'The Concord is the shared system for deciding who has authority: recorded titles, witnessed oaths, and precedent that courts agree to follow.',
      'A bloodline can put someone in a chair. Recognition is what makes other people obey: guards, clerks, judges, and merchants treating a title as binding.',
      'Because of that, politics is often a fight over legitimacy: who gets to tax, who gets to patrol, and whose claims will be treated as lawful.',
    ],
  },
  {
    id: 'concord-hall',
    title: 'Concord Hall',
    category: 'Places',
    summary: 'A neutral seat for negotiation where etiquette is a weapon and silence is policy.',
    paragraphs: [
      'Concord Hall forces disputes into a process: meetings in daylight, witnesses in the room, and arguments put on record.',
      'Delegations gather here because it is safer than bargaining in the field. If a deal breaks, everyone can point to what was said and what was sworn.',
      'Treaties, sealed letters, and oath-logs are kept in the archives. A stamped clause can decide who is "allowed" to move troops, collect tolls, or punish a breach.',
    ],
  },
  {
    id: 'envoy',
    title: 'Envoy of Concord',
    category: 'Roles',
    summary: 'A negotiator empowered to bind factions—while remaining personally expendable.',
    paragraphs: [
      'An envoy carries authority by mandate, not by force. Your protection is the Concord itself: harming you is treated as an attack on the negotiation process.',
      'Your job is to produce a settlement powerful people can accept without looking weak. That usually means trading concessions and writing them down in enforceable terms.',
      'In practice, you spend as much effort managing pride and optics as you do establishing facts.',
    ],
  },
  {
    id: 'iron-pact',
    title: 'The Iron Pact',
    category: 'Factions',
    summary: 'Fortress cities united by discipline, supply lines, and oaths that outlive their signers.',
    paragraphs: [
      'The Iron Pact fears chaos more than defeat. When roads fail, granaries empty. When granaries empty, people riot or march.',
      'They value procedures that prevent hesitation: clear ranks, clear orders, clear consequences.',
      'When Iron praises you, it usually comes with expectations. When they offer mercy, they expect the matter settled quickly—and they remember delays.',
    ],
  },
  {
    id: 'verdant-court',
    title: 'The Verdant Court',
    category: 'Factions',
    summary: 'Forest-governors of ward and root, patient enough to outwait a crisis.',
    paragraphs: [
      'The Verdant Court measures outcomes in seasons. They will accept a bad week if it prevents a permanent wound to the land.',
      'They keep lore and leverage close. Some secrets are sacred, some are defensive, and some are bargaining chips.',
      'Their magic is practical: wards, growth, and memory carried through living things.',
    ],
  },
  {
    id: 'ember-throne',
    title: 'The Ember Throne',
    category: 'Factions',
    summary: 'A merchant empire that uses routes, contracts, and debt as leverage.',
    paragraphs: [
      'The Ember Throne built power on trade routes, credit, and control of shipping. They prefer deals to battles.',
      'Their diplomats arrive smiling, with ledgers already open. Every favor becomes a recorded debt, and debts become pressure.',
      'They like stability when it keeps trade moving. If instability is more profitable, they know how to encourage it from a safe distance.',
    ],
  },
  {
    id: 'greenmarch-pass',
    title: 'Greenmarch Pass',
    category: 'Places',
    summary: 'A strategic corridor and a political fault line between iron roads and verdant wards.',
    paragraphs: [
      'Greenmarch is narrow enough that a few watchtowers can control trade, troop movement, and winter survival.',
      'Everyone argues about it like it is simple property. In practice, control of the pass changes prices, patrol routes, and which towns eat first when winter hits.',
      'When tempers rise, Greenmarch stops being a place and becomes a test of legitimacy: who gets to enforce rules on the border.',
    ],
  },
  {
    id: 'root-oath',
    title: 'The Root-Oath',
    category: 'Law & Custom',
    summary: 'A Verdant pledge witnessed in blood and bound to stewardship rather than conquest.',
    paragraphs: [
      'Verdant oaths are designed to last. Words can be reinterpreted; a ritual can be remembered.',
      'Taking a Root-Oath makes you accountable to a standard that does not care about court fashion.',
      'To Verdant eyes, refusing an oath can be wisdom—or it can signal that you intend to keep your options open.',
    ],
  },
  {
    id: 'ledgers',
    title: 'Ledgers and Charters',
    category: 'Law & Custom',
    summary: 'Ember paperwork that turns trade into influence and influence into obligation.',
    paragraphs: [
      'In Ember practice, contracts matter because other people will enforce them: courts, guilds, and creditors.',
      'A charter grants permissions (to travel, trade, collect tolls) and creates obligations (fees, reporting, enforcement).',
      'A wise envoy reads who benefits, who pays, and what happens when someone breaks the terms.',
    ],
  },
  {
    id: 'wards',
    title: 'Wards',
    category: 'Magic',
    summary: 'Defensive magic that redirects, delays, and restricts actions in a place.',
    paragraphs: [
      'Wards are common magic: stones that remember, corridors that miscount steps, doors that won’t open for armed intent, paths that loop when marched by a squad.',
      'Most wards do not punish. They make an action unreliable or expensive, which is often enough to stop an escalation.',
      'Because wards work best when understood by their makers, knowledge is power in a literal sense.',
    ],
  },
  {
    id: 'fire-taboo',
    title: 'The Fire Taboo',
    category: 'Magic',
    summary: 'A Verdant restraint: a cultural refusal, enforced by custom and distrust.',
    paragraphs: [
      'Verdant doctrine treats fire as the easiest way to cause permanent damage. A forest that burns can take generations to return.',
      'To Verdant speakers, “you smell of fire” is a warning. It means they suspect you of reckless harm—or a planned provocation.',
      'In diplomacy, taboos matter because they make blame easier. If Verdant "never" uses fire, then a burn looks like a frame job.',
    ],
  },
];
