// BottleRock Napa Valley 2026 schedule.
// Source: https://riffmagazine.com/festivals/bottlerock-napa-2026-stage-times/
// Cross-checked against https://www.bottlerocknapavalley.com/schedule/
//
// Format per set: [stageId, 'HH:MM start', 'HH:MM end', 'Artist']
// Friday end times are from the official daily-schedule image.
// Saturday/Sunday end times: next_show_start − 30 min; last shows on each
// stage get durations that match Friday's pattern (headliners ≈ 90–120 min,
// secondary closers ≈ 75 min, small-stage closers ≈ 75–90 min).
//
// All times are PT (24h).

export const STAGES = [
  { id: 'prudential', name: 'Prudential', short: 'PRU' },
  { id: 'tmobile',    name: 'T-Mobile',   short: 'TMO' },
  { id: 'hellofresh', name: 'HelloFresh', short: 'HF'  },
  { id: 'northbay',   name: 'NorthBay Health', short: 'NBH' },
];

export const DAYS = [
  { id: 'fri', name: 'Friday',   date: 'May 22' },
  { id: 'sat', name: 'Saturday', date: 'May 23' },
  { id: 'sun', name: 'Sunday',   date: 'May 24' },
];

// Helper: 'HH:MM' → minutes since midnight.
const t = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

// Each set: [stageId, start, end, artist]
const sets = {
  fri: [
    // ── Prudential Stage (from official schedule image) ──────────────
    ['prudential', '12:00', '13:00', 'Indy'],
    ['prudential', '13:30', '14:30', 'The Beths'],
    ['prudential', '15:00', '16:00', 'Del Water Gap'],
    ['prudential', '16:30', '17:30', 'Chaka Khan'],
    ['prudential', '18:15', '19:30', 'Teddy Swims'],
    ['prudential', '20:15', '21:45', 'Lorde'],

    // ── T-Mobile Stage ───────────────────────────────────────────────
    ['tmobile', '13:00', '13:45', 'Hannah Cohen'],
    ['tmobile', '14:15', '15:15', 'Natasha Bedingfield'],
    ['tmobile', '15:45', '16:45', 'Tash Sultana'],
    ['tmobile', '17:15', '18:15', 'Jon Bellion'],
    ['tmobile', '18:45', '20:00', 'Papa Roach'],
    ['tmobile', '20:30', '21:45', 'Lil Wayne'],

    // ── HelloFresh Stage ─────────────────────────────────────────────
    ['hellofresh', '12:00', '12:40', 'Malick Koly'],
    ['hellofresh', '13:15', '14:15', 'Penelope Road'],
    ['hellofresh', '14:45', '15:45', 'The Paradox'],
    ['hellofresh', '16:15', '17:15', 'Chevy Metal'],
    ['hellofresh', '17:45', '18:45', 'Rev Run'],
    ['hellofresh', '19:15', '20:15', 'Børns'],
    ['hellofresh', '20:45', '22:00', 'Men At Work'],

    // ── NorthBay Health Stage ────────────────────────────────────────
    ['northbay', '12:00', '12:45', 'The Rookies'],
    ['northbay', '13:15', '14:00', 'Khatumu'],
    ['northbay', '14:30', '15:30', 'The Chin Chins'],
    ['northbay', '16:00', '17:00', 'New Constellations'],
    ['northbay', '17:30', '18:30', 'Melt'],
    ['northbay', '19:00', '20:00', 'Treach (of Naughty By Nature)'],
    ['northbay', '20:30', '22:00', 'Meredith Marks (Silent Disco)'],
  ],

  sat: [
    // ── Prudential Stage ─────────────────────────────────────────────
    ['prudential', '12:00', '13:00', 'The Alive'],
    ['prudential', '13:30', '14:15', 'The Return of Jackie & Judy'],
    ['prudential', '14:45', '15:45', 'Joan Jett & the Blackhearts'],
    ['prudential', '16:15', '17:15', 'AJR'],
    ['prudential', '17:45', '19:15', 'LCD Soundsystem'],
    ['prudential', '19:45', '21:45', 'Foo Fighters'],        // 120 min headliner

    // ── T-Mobile Stage ───────────────────────────────────────────────
    ['tmobile', '13:00', '13:45', 'Paris Jackson'],
    ['tmobile', '14:15', '15:15', 'Flipturn'],
    ['tmobile', '15:45', '16:45', 'Bush'],
    ['tmobile', '17:15', '18:15', 'Busta Rhymes'],
    ['tmobile', '18:45', '20:00', 'Rilo Kiley'],
    ['tmobile', '20:30', '21:45', 'Zedd'],                   // 75 min closer

    // ── HelloFresh Stage ─────────────────────────────────────────────
    ['hellofresh', '12:00', '12:45', 'Bettina Maureenji'],
    ['hellofresh', '13:15', '14:15', 'Moonalice'],
    ['hellofresh', '14:45', '15:45', 'Saxsquatch'],
    ['hellofresh', '16:15', '17:15', 'Midnight Generation'],
    ['hellofresh', '17:45', '18:45', 'The Warning'],
    ['hellofresh', '19:15', '20:15', 'Arrested Development'],
    ['hellofresh', '20:45', '22:00', 'Maoli'],               // 75 min closer

    // ── NorthBay Health Stage ────────────────────────────────────────
    ['northbay', '12:00', '12:30', 'Jake Zimma'],
    ['northbay', '13:00', '14:00', 'Folk Bitch Trio'],
    ['northbay', '14:30', '15:15', 'Zinadelphia'],
    ['northbay', '15:45', '16:45', 'Charlotte Lawrence'],
    ['northbay', '17:15', '18:15', 'Almost Monday'],
    ['northbay', '18:45', '19:45', 'Better Than Ezra'],
    ['northbay', '20:15', '22:00', 'DJ Pauly D (Silent Disco)'], // 105 min
  ],

  sun: [
    // ── Prudential Stage ─────────────────────────────────────────────
    ['prudential', '12:00', '13:00', 'Betty Taylor'],
    ['prudential', '13:30', '14:30', 'Larkin Poe'],
    ['prudential', '15:00', '16:00', 'Kool & the Gang'],
    ['prudential', '16:30', '17:45', 'Mt. Joy'],
    ['prudential', '18:15', '19:30', 'Sombr'],
    ['prudential', '20:00', '21:45', 'Backstreet Boys'],     // 105 min headliner

    // ── T-Mobile Stage ───────────────────────────────────────────────
    ['tmobile', '12:00', '12:45', 'Nat Myers'],
    ['tmobile', '13:15', '14:00', 'Izzy Escobar'],
    ['tmobile', '14:30', '15:15', 'Absolutely'],
    ['tmobile', '15:45', '16:45', 'Paulo Londra'],
    ['tmobile', '17:15', '18:15', 'Bigxthaplug'],
    ['tmobile', '18:45', '20:00', 'Slightly Stoopid'],
    ['tmobile', '20:30', '21:45', 'Ludacris'],               // 75 min closer

    // ── HelloFresh Stage ─────────────────────────────────────────────
    ['hellofresh', '12:00', '12:30', 'Napa Valley Youth Symphony'],
    ['hellofresh', '13:00', '14:00', 'The Silverado Pickups'],
    ['hellofresh', '14:30', '15:30', 'The Paper Kites'],
    ['hellofresh', '16:00', '17:00', 'Paco Versailles'],
    ['hellofresh', '17:30', '18:30', 'Good Neighbours'],
    ['hellofresh', '19:00', '20:00', 'The California Honeydrops'],
    ['hellofresh', '20:30', '22:00', 'Cut Copy'],            // 90 min closer

    // ── NorthBay Health Stage ────────────────────────────────────────
    ['northbay', '12:00', '12:45', 'Alec Shaw'],
    ['northbay', '13:15', '14:00', 'Girl Tones'],
    ['northbay', '14:30', '15:30', 'Buffalo Traffic Jam'],
    ['northbay', '16:00', '17:00', 'The Heavy Heavy'],
    ['northbay', '17:30', '18:30', 'Sons of the East'],
    ['northbay', '19:00', '20:00', 'Matt Maeson'],
    ['northbay', '20:30', '22:00', 'Jess King (Silent Disco)'], // 90 min
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
