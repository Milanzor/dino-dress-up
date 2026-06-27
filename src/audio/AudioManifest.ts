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

  // Nest
  nest_intro: {
    text: 'Goedemorgen! Wat een mooie dag in Zonnig Dal. Wat trek je vandaag aan?',
  },
  choice_sunhat: { text: 'Een zonnehoed!' },
  choice_raincape: { text: 'Een regencape!' },
  choice_crown: { text: 'Een feestkroontje!' },
  nest_done: { text: 'Wat zie je er mooi uit! Kom, we gaan op pad.' },

  // Fork
  fork_intro: { text: 'Kijk, een splitsing in het pad. Waar wil je heen?' },
  choice_meadow: { text: 'Naar de bloemenwei, met allemaal bloemen!' },
  choice_river: { text: 'Naar de rivier, met fris water!' },

  // Meadow
  meadow_intro: {
    text: 'In de bloemenwei zoekt Trix haar stuiterbal. Help je haar zoeken?',
  },
  choice_search: { text: 'Zoeken in het hoge gras.' },
  choice_butterfly: { text: 'Aan de vlinders vragen.' },
  meadow_found: {
    text: 'Hoera! Je vond de bal. Trix is nu je vriendje en gaat mee naar het feest!',
  },

  // River
  river_intro: { text: 'Bij de rivier wil je naar de overkant. Hoe steek je over?' },
  choice_stones: { text: 'Over de stapstenen springen.' },
  choice_bronto: { text: 'De lieve grote Bronto om hulp vragen.' },
  river_cross: {
    text: 'Joepie, je bent overgestoken! Bronto is nu je vriendje en gaat mee!',
  },

  // Festival
  festival_intro: { text: 'Het Grote Dino Feest begint! Al je vriendjes zijn er.' },

  // Endings
  ending_vriendschap: {
    text: 'Wat een fijn vriendschapsfeest met al je nieuwe vriendjes. Knuffels voor iedereen! Het einde.',
  },
  ending_avontuur: {
    text: 'Wat een dapper avontuur was dat! Iedereen juicht voor jou. Het einde.',
  },

  // Ambient beds (looping; silent placeholders until recorded files exist)
  ambient_home: { loop: true, volume: 0.4 },
  ambient_meadow: { loop: true, volume: 0.4 },
  ambient_river: { loop: true, volume: 0.4 },
  ambient_festival: { loop: true, volume: 0.5 },

  // Short sound effects (no text; file absent → no-op for now)
  sfx_confirm: {},
  sfx_pop: {},
  sfx_sparkle: {},
}

export function getClip(id: string): AudioClip | undefined {
  return CLIPS[id]
}
