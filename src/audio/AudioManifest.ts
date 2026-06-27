export interface AudioClip {
  file?: string // path under /audio/, e.g. '/audio/nest_intro.mp3' — optional; absent during dev
  text?: string // Dutch text spoken via nl-NL TTS when no file (or file fails)
  loop?: boolean // for ambient
  volume?: number // 0..1
}

export const CLIPS: Record<string, AudioClip> = {
  // Creator
  creator_intro: {
    file: 'audio/creator_intro.ogg',
    text: 'Maak je eigen dino! Kies een kleur, een buikje, een patroon en leuke spullen.',
  },

  // ── Chapter 1: Thuis (nest) ────────────────────────────────────────────────
  nest_intro: {
    file: 'audio/nest_intro.ogg',
    text: 'Goedemorgen! Wat een mooie dag in Zonnig Dal. Word jij ook wakker?',
  },
  choice_stretch: { file: 'audio/choice_stretch.ogg', text: 'Lekker uitrekken!' },
  choice_bounce: { file: 'audio/choice_bounce.ogg', text: 'Stuiter uit bed!' },
  choice_yawn: { file: 'audio/choice_yawn.ogg', text: 'Eerst nog even gapen.' },
  nest_breakfast: { file: 'audio/nest_breakfast.ogg', text: 'Eerst smikkelen. Wat lust jij vandaag?' },
  choice_bessen: { file: 'audio/choice_bessen.ogg', text: 'Sappige bessen!' },
  choice_groen: { file: 'audio/choice_groen.ogg', text: 'Knapperig groen blad!' },
  choice_zaden: { file: 'audio/choice_zaden.ogg', text: 'Krokante zaden!' },
  nest_dress: { file: 'audio/nest_dress.ogg', text: 'En nu aankleden voor het feest. Wat trek je aan?' },
  choice_sunhat: { file: 'audio/choice_sunhat.ogg', text: 'Een zonnehoed!' },
  choice_raincape: { file: 'audio/choice_raincape.ogg', text: 'Een regencape!' },
  choice_rugzak: { file: 'audio/choice_rugzak.ogg', text: 'Een handige rugzak!' },
  choice_crown: { file: 'audio/choice_crown.ogg', text: 'Een feestkroontje!' },

  // ── Chapter 2: De Wijde Wereld In (wereld) ─────────────────────────────────
  wereld_intro: { file: 'audio/wereld_intro.ogg', text: 'De zon schijnt buiten. Eerst gedag zeggen!' },
  choice_mama: { file: 'audio/choice_mama.ogg', text: 'Een dikke knuffel voor mama.' },
  choice_papa: { file: 'audio/choice_papa.ogg', text: 'Een dikke knuffel voor papa.' },
  choice_pip: { file: 'audio/choice_pip.ogg', text: 'Broertje Pip mag mee!' },
  wereld_fork: { file: 'audio/wereld_fork.ogg', text: 'Kijk, een splitsing in het pad. Waar gaan we eerst heen?' },
  choice_meadow: { file: 'audio/choice_meadow.ogg', text: 'Eerst naar de bloemenwei, met allemaal bloemen!' },
  choice_river: { file: 'audio/choice_river.ogg', text: 'Eerst naar de rivier, met fris water!' },

  // ── Chapter 3: Bloemenwei (wei) ────────────────────────────────────────────
  wei_intro: { file: 'audio/wei_intro.ogg', text: 'In de bloemenwei zoekt Trix haar stuiterbal. Help je haar zoeken?' },
  choice_search: { file: 'audio/choice_search.ogg', text: 'Zoeken in het hoge gras.' },
  choice_butterfly: { file: 'audio/choice_butterfly.ogg', text: 'Aan de vlinders vragen.' },
  choice_snack: { file: 'audio/choice_snack.ogg', text: 'Haar lokken met een lekker snoepje.' },
  wei_found: { file: 'audio/wei_found.ogg', text: 'Hoera! De bal is terug. Trix is nu je vriendje en gaat mee!' },
  wei_shell: { file: 'audio/wei_shell.ogg', text: 'Kijk, een glinsterende schelp in het gras.' },
  choice_keep: { file: 'audio/choice_keep.ogg', text: 'De mooie schelp zelf houden.' },
  choice_share: { file: 'audio/choice_share.ogg', text: 'De schelp aan een klein dino-tje geven.' },
  wei_done: { file: 'audio/wei_done.ogg', text: 'Wat een fijne wei. Kom, we lopen verder!' },

  // ── Chapter 4: Rivier (rivier) ─────────────────────────────────────────────
  rivier_intro: { file: 'audio/rivier_intro.ogg', text: 'Bij de rivier wil je naar de overkant. Hoe steek je over?' },
  choice_stones: { file: 'audio/choice_stones.ogg', text: 'Over de stapstenen springen.' },
  choice_log: { file: 'audio/choice_log.ogg', text: 'Over de boomstam lopen.' },
  choice_bronto: { file: 'audio/choice_bronto.ogg', text: 'De lieve grote Bronto om een lift vragen.' },
  rivier_cross: { file: 'audio/rivier_cross.ogg', text: 'Joepie, je bent overgestoken! Bronto is nu je vriendje en gaat mee!' },
  rivier_ptera: { file: 'audio/rivier_ptera.ogg', text: 'Baby Ptera kan haar nestje niet bereiken. Help je haar omhoog?' },
  choice_ramp: { file: 'audio/choice_ramp.ogg', text: 'Een lieve hellingbaan bouwen.' },
  choice_call: { file: 'audio/choice_call.ogg', text: 'De grote dino-s erbij roepen.' },
  choice_carry: { file: 'audio/choice_carry.ogg', text: 'Haar op je rug omhoog dragen.' },
  rivier_ptera_done: { file: 'audio/rivier_ptera_done.ogg', text: 'Veilig in het nest! Ptera tjilpt blij en gaat mee.' },

  // ── Chapter 5: Fluisterbos (bos) + Glittergrotten (grot) ───────────────────
  bos_intro: { file: 'audio/bos_intro.ogg', text: 'Het Fluisterbos ruist zachtjes. Knus en veilig, hoor.' },
  choice_paw: { file: 'audio/choice_paw.ogg', text: 'Een pootje vasthouden.' },
  choice_hum: { file: 'audio/choice_hum.ogg', text: 'Een dapper liedje neuriën.' },
  choice_lantern: { file: 'audio/choice_lantern.ogg', text: 'Een glimpaddenstoel-lantaarn aansteken.' },
  bos_done: { file: 'audio/bos_done.ogg', text: 'Wat een dappere wandeling door het bos!' },
  grot_intro: { file: 'audio/grot_intro.ogg', text: 'De Glittergrotten fonkelen vol kristallen. Welke kleur kies jij?' },
  choice_crystal_pink: { file: 'audio/choice_crystal_pink.ogg', text: 'Een roze kristal!' },
  choice_crystal_blue: { file: 'audio/choice_crystal_blue.ogg', text: 'Een blauw kristal!' },
  choice_crystal_yellow: { file: 'audio/choice_crystal_yellow.ogg', text: 'Een geel kristal!' },
  grot_done: { file: 'audio/grot_done.ogg', text: 'Een glinsterend kristal voor in je zak!' },

  // ── Chapter 6: De Verrassing (regen) ───────────────────────────────────────
  regen_intro: { file: 'audio/regen_intro.ogg', text: 'Plots begint het te regenen! Pitter-patter-pitter.' },
  regen_cozy: { file: 'audio/regen_cozy.ogg', text: 'Lekker droog onder je regencape. Slim van je!' },
  regen_umbrella: { file: 'audio/regen_umbrella.ogg', text: 'Een vriendje deelt zijn paraplu met je. Wat lief!' },
  regen_prompt: { file: 'audio/regen_prompt.ogg', text: 'Wat doen jullie gezellig samen in de regen?' },
  choice_huddle: { file: 'audio/choice_huddle.ogg', text: 'Lekker dicht tegen elkaar kruipen.' },
  choice_rainsnack: { file: 'audio/choice_rainsnack.ogg', text: 'Een lekker snoepje delen.' },
  choice_rainsong: { file: 'audio/choice_rainsong.ogg', text: 'Een vrolijk regenliedje zingen.' },
  regen_done: { file: 'audio/regen_done.ogg', text: 'Samen is regen juist hartstikke gezellig!' },

  // ── Chapter 7: Klaarmaken (klaar) ──────────────────────────────────────────
  klaar_intro: { file: 'audio/klaar_intro.ogg', text: 'Bijna feest! Wat ga jij doen op het podium?' },
  choice_dans: { file: 'audio/choice_dans.ogg', text: 'Een vrolijke dans!' },
  choice_zang: { file: 'audio/choice_zang.ogg', text: 'Een mooi liedje zingen!' },
  choice_mode: { file: 'audio/choice_mode.ogg', text: 'Een glitter-modeshow!' },
  choice_vrienden: { file: 'audio/choice_vrienden.ogg', text: 'Vertellen over al je vrienden!' },
  klaar_done: { file: 'audio/klaar_done.ogg', text: 'Klaar voor de show!' },

  // ── Chapter 8: Het Grote Dino Feest (festival) ─────────────────────────────
  festival_intro: { file: 'audio/festival_intro.ogg', text: 'Het Grote Dino Feest begint! Al je vriendjes zijn er.' },
  festival_dans: { file: 'audio/festival_dans.ogg', text: 'Dino danst en iedereen klapt vrolijk mee!' },
  festival_zang: { file: 'audio/festival_zang.ogg', text: 'Dino zingt het allermooiste liedje.' },
  festival_mode: { file: 'audio/festival_mode.ogg', text: 'Dino showt de allermooiste outfit van het feest.' },
  festival_vrienden: { file: 'audio/festival_vrienden.ogg', text: 'Dino vertelt trots over alle nieuwe vrienden.' },

  // Endings
  ending_vriendschap: {
    file: 'audio/ending_vriendschap.ogg',
    text: 'Wat een groot vriendschapsfeest met al je vriendjes en Pip erbij. Knuffels voor iedereen! Het einde.',
  },
  ending_liefzijn: {
    file: 'audio/ending_liefzijn.ogg',
    text: 'Jij was zo lief vandaag, jij bent de Lief-zijn-Kampioen van Zonnig Dal! Het einde.',
  },
  ending_ontdekker: {
    file: 'audio/ending_ontdekker.ogg',
    text: 'Wat was je dapper vandaag, jij bent de Dappere Ontdekker! Iedereen juicht voor jou. Het einde.',
  },
  ending_modester: {
    file: 'audio/ending_modester.ogg',
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
