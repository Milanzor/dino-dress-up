export interface AudioClip {
  file?: string // path under /audio/, e.g. '/audio/nest_intro.mp3' — optional; absent during dev
  text?: string // Dutch text spoken via nl-NL TTS when no file (or file fails)
  loop?: boolean // for ambient
  volume?: number // 0..1
}

export const CLIPS: Record<string, AudioClip> = {
  // Creator
  creator_intro: {
    text: 'Maak je eigen dino! Kies een kleur, een buikje, een patroon en leuke spullen.',
  },

  // ── Chapter 1: Thuis (nest) ────────────────────────────────────────────────
  nest_intro: {
    text: 'Goedemorgen! Wat een mooie dag in Zonnig Dal. Word jij ook wakker?',
  },
  choice_stretch: { text: 'Lekker uitrekken!' },
  choice_bounce: { text: 'Stuiter uit bed!' },
  choice_yawn: { text: 'Eerst nog even gapen.' },
  nest_breakfast: { text: 'Eerst smikkelen. Wat lust jij vandaag?' },
  choice_bessen: { text: 'Sappige bessen!' },
  choice_groen: { text: 'Knapperig groen blad!' },
  choice_zaden: { text: 'Krokante zaden!' },
  nest_dress: { text: 'En nu aankleden voor het feest. Wat trek je aan?' },
  choice_sunhat: { text: 'Een zonnehoed!' },
  choice_raincape: { text: 'Een regencape!' },
  choice_rugzak: { text: 'Een handige rugzak!' },
  choice_crown: { text: 'Een feestkroontje!' },

  // ── Chapter 2: De Wijde Wereld In (wereld) ─────────────────────────────────
  wereld_intro: { text: 'De zon schijnt buiten. Eerst gedag zeggen!' },
  choice_mama: { text: 'Een dikke knuffel voor mama.' },
  choice_papa: { text: 'Een dikke knuffel voor papa.' },
  choice_pip: { text: 'Broertje Pip mag mee!' },
  wereld_fork: { text: 'Kijk, een splitsing in het pad. Waar gaan we eerst heen?' },
  choice_meadow: { text: 'Eerst naar de bloemenwei, met allemaal bloemen!' },
  choice_river: { text: 'Eerst naar de rivier, met fris water!' },

  // ── Chapter 3: Bloemenwei (wei) ────────────────────────────────────────────
  wei_intro: { text: 'In de bloemenwei zoekt Trix haar stuiterbal. Help je haar zoeken?' },
  choice_search: { text: 'Zoeken in het hoge gras.' },
  choice_butterfly: { text: 'Aan de vlinders vragen.' },
  choice_snack: { text: 'Haar lokken met een lekker snoepje.' },
  wei_found: { text: 'Hoera! De bal is terug. Trix is nu je vriendje en gaat mee!' },
  wei_shell: { text: 'Kijk, een glinsterende schelp in het gras.' },
  choice_keep: { text: 'De mooie schelp zelf houden.' },
  choice_share: { text: 'De schelp aan een klein dino-tje geven.' },
  wei_done: { text: 'Wat een fijne wei. Kom, we lopen verder!' },

  // ── Chapter 4: Rivier (rivier) ─────────────────────────────────────────────
  rivier_intro: { text: 'Bij de rivier wil je naar de overkant. Hoe steek je over?' },
  choice_stones: { text: 'Over de stapstenen springen.' },
  choice_log: { text: 'Over de boomstam lopen.' },
  choice_bronto: { text: 'De lieve grote Bronto om een lift vragen.' },
  rivier_cross: { text: 'Joepie, je bent overgestoken! Bronto is nu je vriendje en gaat mee!' },
  rivier_ptera: { text: 'Baby Ptera kan haar nestje niet bereiken. Help je haar omhoog?' },
  choice_ramp: { text: 'Een lieve hellingbaan bouwen.' },
  choice_call: { text: 'De grote dino-s erbij roepen.' },
  choice_carry: { text: 'Haar op je rug omhoog dragen.' },
  rivier_ptera_done: { text: 'Veilig in het nest! Ptera tjilpt blij en gaat mee.' },

  // ── Chapter 5: Fluisterbos (bos) + Glittergrotten (grot) ───────────────────
  bos_intro: { text: 'Het Fluisterbos ruist zachtjes. Knus en veilig, hoor.' },
  choice_paw: { text: 'Een pootje vasthouden.' },
  choice_hum: { text: 'Een dapper liedje neuriën.' },
  choice_lantern: { text: 'Een glimpaddenstoel-lantaarn aansteken.' },
  bos_done: { text: 'Wat een dappere wandeling door het bos!' },
  grot_intro: { text: 'De Glittergrotten fonkelen vol kristallen. Welke kleur kies jij?' },
  choice_crystal_pink: { text: 'Een roze kristal!' },
  choice_crystal_blue: { text: 'Een blauw kristal!' },
  choice_crystal_yellow: { text: 'Een geel kristal!' },
  grot_done: { text: 'Een glinsterend kristal voor in je zak!' },

  // ── Chapter 6: De Verrassing (regen) ───────────────────────────────────────
  regen_intro: { text: 'Plots begint het te regenen! Pitter-patter-pitter.' },
  regen_cozy: { text: 'Lekker droog onder je regencape. Slim van je!' },
  regen_umbrella: { text: 'Een vriendje deelt zijn paraplu met je. Wat lief!' },
  regen_prompt: { text: 'Wat doen jullie gezellig samen in de regen?' },
  choice_huddle: { text: 'Lekker dicht tegen elkaar kruipen.' },
  choice_rainsnack: { text: 'Een lekker snoepje delen.' },
  choice_rainsong: { text: 'Een vrolijk regenliedje zingen.' },
  regen_done: { text: 'Samen is regen juist hartstikke gezellig!' },

  // ── Chapter 7: Klaarmaken (klaar) ──────────────────────────────────────────
  klaar_intro: { text: 'Bijna feest! Wat ga jij doen op het podium?' },
  choice_dans: { text: 'Een vrolijke dans!' },
  choice_zang: { text: 'Een mooi liedje zingen!' },
  choice_mode: { text: 'Een glitter-modeshow!' },
  choice_vrienden: { text: 'Vertellen over al je vrienden!' },
  klaar_done: { text: 'Klaar voor de show!' },

  // ── Chapter 8: Het Grote Dino Feest (festival) ─────────────────────────────
  festival_intro: { text: 'Het Grote Dino Feest begint! Al je vriendjes zijn er.' },
  festival_dans: { text: 'Dino danst en iedereen klapt vrolijk mee!' },
  festival_zang: { text: 'Dino zingt het allermooiste liedje.' },
  festival_mode: { text: 'Dino showt de allermooiste outfit van het feest.' },
  festival_vrienden: { text: 'Dino vertelt trots over alle nieuwe vrienden.' },

  // Endings
  ending_vriendschap: {
    text: 'Wat een groot vriendschapsfeest met al je vriendjes en Pip erbij. Knuffels voor iedereen! Het einde.',
  },
  ending_liefzijn: {
    text: 'Jij was zo lief vandaag, jij bent de Lief-zijn-Kampioen van Zonnig Dal! Het einde.',
  },
  ending_ontdekker: {
    text: 'Wat was je dapper vandaag, jij bent de Dappere Ontdekker! Iedereen juicht voor jou. Het einde.',
  },
  ending_modester: {
    text: 'Wat een vrolijke feestdag was dat, kleine modester. Iedereen heeft genoten! Het einde.',
  },

  // Ambient beds (looping; silent placeholders until recorded files exist)
  ambient_home: { loop: true, volume: 0.4 },
  ambient_meadow: { loop: true, volume: 0.4 },
  ambient_river: { loop: true, volume: 0.4 },
  ambient_forest: { loop: true, volume: 0.4 },
  ambient_cave: { loop: true, volume: 0.4 },
  ambient_rain: { loop: true, volume: 0.45 },
  ambient_festival: { loop: true, volume: 0.5 },

  // Short sound effects (no text; file absent → no-op for now)
  sfx_confirm: {},
  sfx_pop: {},
  sfx_sparkle: {},
}

export function getClip(id: string): AudioClip | undefined {
  return CLIPS[id]
}
