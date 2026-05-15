// Outside Lands 2026 schedule.
// Source: https://www.sfoutsidelands.com/news/daily-lineups-are-here
// Daily lineups announced March 11, 2026.
//
// ⚠️  Set times are ESTIMATED — official times have not yet been released.
//     Update this file once the app/official schedule drops closer to Aug 7.
//
// Format per set: [stageId, 'HH:MM start', 'HH:MM end', 'Artist']
// Stage order: Lands End (main) → Twin Peaks → Sutro → Panhandle
// All times are PT (24h).

export const STAGES = [
  { id: 'landsend',  name: 'Lands End',  short: 'LE'  },
  { id: 'twinpeaks', name: 'Twin Peaks', short: 'TP'  },
  { id: 'sutro',     name: 'Sutro',      short: 'SUT' },
  { id: 'panhandle', name: 'Panhandle',  short: 'PAN' },
];

export const DAYS = [
  { id: 'fri', name: 'Friday',   date: 'Aug 7'  },
  { id: 'sat', name: 'Saturday', date: 'Aug 8'  },
  { id: 'sun', name: 'Sunday',   date: 'Aug 9'  },
];

// Helper: 'HH:MM' → minutes since midnight.
const t = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

// Each set: [stageId, start, end, artist]
const sets = {
  fri: [
    // ── Lands End Stage ──────────────────────────────────────────────────
    ['landsend', '12:00', '12:45', 'Geese'],
    ['landsend', '13:15', '14:15', 'Sierra Ferrell'],
    ['landsend', '14:45', '15:45', 'Wet Leg'],
    ['landsend', '16:15', '17:15', 'Clipse'],
    ['landsend', '17:45', '18:45', 'Modest Mouse'],
    ['landsend', '19:15', '20:15', 'GloRilla'],
    ['landsend', '20:45', '22:00', 'Charli xcx'],

    // ── Twin Peaks Stage ─────────────────────────────────────────────────
    ['twinpeaks', '12:00', '12:30', 'Luke Alessi'],
    ['twinpeaks', '13:00', '13:45', 'Bad Nerves'],
    ['twinpeaks', '14:15', '15:15', 'Billie Marten'],
    ['twinpeaks', '15:45', '16:45', 'Faouzia'],
    ['twinpeaks', '17:15', '18:15', 'The Story So Far'],
    ['twinpeaks', '18:45', '19:45', 'Tinashe'],
    ['twinpeaks', '20:15', '21:30', 'Labrinth'],

    // ── Sutro Stage ──────────────────────────────────────────────────────
    ['sutro', '12:00', '12:30', 'MPH'],
    ['sutro', '13:00', '13:45', 'Tobiahs'],
    ['sutro', '14:15', '15:00', 'NEZZA'],
    ['sutro', '15:30', '16:30', 'Chezile'],
    ['sutro', '17:00', '18:00', 'Sawyer Hill'],
    ['sutro', '18:30', '19:30', '¥ØU$UK€ ¥UK1MAT$U'],
    ['sutro', '20:00', '21:15', 'Turnstile'],

    // ── Panhandle Stage ──────────────────────────────────────────────────
    ['panhandle', '12:00', '12:45', 'Die Spitz'],
    ['panhandle', '13:15', '14:00', 'Dylan Brady'],
    ['panhandle', '14:30', '15:30', 'Durand Bernarr'],
    ['panhandle', '16:00', '17:00', 'KI/KI'],
    ['panhandle', '17:30', '18:30', 'ALLEYCVT'],
    ['panhandle', '19:00', '20:15', 'Odd Mob & OMNOM'],
    ['panhandle', '20:45', '22:00', 'GRiZTRONICS'],
  ],

  sat: [
    // ── Lands End Stage ──────────────────────────────────────────────────
    ['landsend', '12:00', '12:45', 'RYMAN'],
    ['landsend', '13:15', '14:15', 'Silvana Estrada'],
    ['landsend', '14:45', '15:45', 'Wunderhorse'],
    ['landsend', '16:15', '17:15', 'Yard Act'],
    ['landsend', '17:45', '18:45', 'Lucy Dacus'],
    ['landsend', '19:15', '20:15', 'Ethel Cain'],
    ['landsend', '20:45', '22:00', 'The Strokes'],

    // ── Twin Peaks Stage ─────────────────────────────────────────────────
    ['twinpeaks', '12:00', '12:30', 'bad juuju'],
    ['twinpeaks', '13:00', '13:45', '1-800 GIRLS'],
    ['twinpeaks', '14:15', '15:15', 'Automatic'],
    ['twinpeaks', '15:45', '16:45', 'Bandalos Chinos'],
    ['twinpeaks', '17:15', '18:15', 'PinkPantheress'],
    ['twinpeaks', '18:45', '19:45', 'Djo'],
    ['twinpeaks', '20:15', '21:30', 'The xx'],

    // ── Sutro Stage ──────────────────────────────────────────────────────
    ['sutro', '12:00', '12:30', 'Mount Pleasant'],
    ['sutro', '13:00', '13:45', 'Red Leather Racing'],
    ['sutro', '14:15', '15:00', "it's murph"],
    ['sutro', '15:30', '16:30', 'Haute & Freddy'],
    ['sutro', '17:00', '18:00', 'Audrey Hobert'],
    ['sutro', '18:30', '19:30', 'Malcolm Todd'],
    ['sutro', '20:00', '21:15', 'Dijon'],

    // ── Panhandle Stage ──────────────────────────────────────────────────
    ['panhandle', '12:00', '12:45', 'KOSTA'],
    ['panhandle', '13:15', '14:00', 'camoufly'],
    ['panhandle', '14:30', '15:30', 'DJ Trixie Mattel'],
    ['panhandle', '16:00', '17:00', 'Sultan + Shepard'],
    ['panhandle', '17:30', '18:30', 'Snow Strippers'],
    ['panhandle', '19:00', '20:15', 'Lane 8'],
    ['panhandle', '20:45', '22:00', 'Ben Böhmer'],
  ],

  sun: [
    // ── Lands End Stage ──────────────────────────────────────────────────
    ['landsend', '12:00', '12:45', 'Day We Ran'],
    ['landsend', '13:15', '14:15', 'Infinity Song'],
    ['landsend', '14:45', '15:45', 'Night Tapes'],
    ['landsend', '16:15', '17:15', 'The Temper Trap'],
    ['landsend', '17:45', '18:45', 'Mariah the Scientist'],
    ['landsend', '19:15', '20:30', 'Death Cab for Cutie'],
    ['landsend', '20:45', '22:00', 'RÜFÜS DU SOL'],

    // ── Twin Peaks Stage ─────────────────────────────────────────────────
    ['twinpeaks', '12:00', '12:30', 'Cruz Beckham'],
    ['twinpeaks', '13:00', '13:45', 'Britton'],
    ['twinpeaks', '14:15', '15:00', 'Momma'],
    ['twinpeaks', '15:30', '16:30', 'Frost Children'],
    ['twinpeaks', '17:00', '18:00', 'JADE'],
    ['twinpeaks', '18:30', '19:45', 'Empire Of The Sun'],
    ['twinpeaks', '20:15', '21:30', 'Baby Keem'],

    // ── Sutro Stage ──────────────────────────────────────────────────────
    ['sutro', '12:00', '12:30', 'Amble'],
    ['sutro', '13:00', '13:45', 'Balu Brigada'],
    ['sutro', '14:15', '15:15', 'Carlita'],
    ['sutro', '15:45', '16:45', 'Miss Monique'],
    ['sutro', '17:15', '18:15', 'Boris Brejcha'],
    ['sutro', '18:45', '20:00', 'Boys Noize'],
    ['sutro', '20:30', '22:00', 'Disco Lines'],

    // ── Panhandle Stage ──────────────────────────────────────────────────
    ['panhandle', '12:00', '12:45', 'Sosocamo'],
    ['panhandle', '13:15', '14:00', 'Jim Legxacy'],
    ['panhandle', '14:30', '15:30', 'X CLUB.'],
    ['panhandle', '16:00', '17:00', 'Kingfishr'],
    ['panhandle', '17:30', '18:30', 'kwn'],
    ['panhandle', '19:00', '20:15', 'DESTIN CONRAD'],
    ['panhandle', '20:45', '22:00', 'Not for Radio'],
  ],
};

function buildSchedule() {
  const all = [];
  for (const day of DAYS) {
    const byStage = {};
    for (const stage of STAGES) byStage[stage.id] = [];
    for (const [stageId, start, end, artist] of sets[day.id]) {
      byStage[stageId].push({ stageId, start, end, artist });
    }
    for (const stage of STAGES) {
      const list = byStage[stage.id].sort((a, b) => t(a.start) - t(b.start));
      for (let i = 0; i < list.length; i++) {
        const cur = list[i];
        const startMin = t(cur.start);
        const endMin   = t(cur.end);
        const id = `${day.id}-${stage.id}-${i}`;
        all.push({
          id,
          dayId: day.id,
          stageId: stage.id,
          artist: cur.artist,
          start: cur.start,
          startMin,
          endMin,
          end: cur.end,
        });
      }
    }
  }
  return all;
}

export const SCHEDULE = buildSchedule();

export const SCHEDULE_BY_ID = Object.fromEntries(SCHEDULE.map((s) => [s.id, s]));

// Format 'HH:MM' (24h) into 'H:MMa/p' friendly form.
export function fmtTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'p' : 'a';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}
