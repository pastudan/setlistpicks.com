// BottleRock Napa Valley 2026 schedule.
// Source: https://riffmagazine.com/festivals/bottlerock-napa-2026-stage-times/
// Cross-checked against https://www.bottlerocknapavalley.com/schedule/
//
// All start times are PT. End time = next set's start on the same stage, or 30
// min after start for the final slot of the day on that stage (best guess).

export const STAGES = [
  { id: 'prudential', name: 'Prudential', short: 'PRU' },
  { id: 'tmobile', name: 'T-Mobile', short: 'TMO' },
  { id: 'hellofresh', name: 'HelloFresh', short: 'HF' },
  { id: 'northbay', name: 'NorthBay Health', short: 'NBH' },
];

export const DAYS = [
  { id: 'fri', name: 'Friday', date: 'May 22' },
  { id: 'sat', name: 'Saturday', date: 'May 23' },
  { id: 'sun', name: 'Sunday', date: 'May 24' },
];

// Helper: HH:MM (24h) → minutes since midnight.
const t = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

// Each set: [stage, "HH:MM" start, artist]
const sets = {
  fri: [
    ['prudential', '12:00', 'Indy'],
    ['prudential', '13:30', 'The Beths'],
    ['prudential', '15:00', 'Del Water Gap'],
    ['prudential', '16:30', 'Chaka Khan'],
    ['prudential', '18:15', 'Teddy Swims'],
    ['prudential', '20:15', 'Lorde'],

    ['tmobile', '13:00', 'Hannah Cohen'],
    ['tmobile', '14:15', 'Natasha Bedingfield'],
    ['tmobile', '15:45', 'Tash Sultana'],
    ['tmobile', '17:15', 'Jon Bellion'],
    ['tmobile', '18:45', 'Papa Roach'],
    ['tmobile', '20:30', 'Lil Wayne'],

    ['hellofresh', '12:00', 'Malick Koly'],
    ['hellofresh', '13:15', 'Penelope Road'],
    ['hellofresh', '14:45', 'The Paradox'],
    ['hellofresh', '16:15', 'Chevy Metal'],
    ['hellofresh', '17:45', 'Rev Run'],
    ['hellofresh', '19:15', 'Børns'],
    ['hellofresh', '20:45', 'Men At Work'],

    ['northbay', '12:00', 'The Rookies'],
    ['northbay', '13:15', 'Khatumu'],
    ['northbay', '14:30', 'The Chin Chins'],
    ['northbay', '16:00', 'New Constellations'],
    ['northbay', '17:30', 'Melt'],
    ['northbay', '19:00', 'Treach (of Naughty By Nature)'],
    ['northbay', '20:30', 'Meredith Marks (Silent Disco)'],
  ],
  sat: [
    ['prudential', '12:00', 'The Alive'],
    ['prudential', '13:30', 'The Return of Jackie & Judy'],
    ['prudential', '14:45', 'Joan Jett & the Blackhearts'],
    ['prudential', '16:15', 'AJR'],
    ['prudential', '17:45', 'LCD Soundsystem'],
    ['prudential', '19:45', 'Foo Fighters'],

    ['tmobile', '13:00', 'Paris Jackson'],
    ['tmobile', '14:15', 'Flipturn'],
    ['tmobile', '15:45', 'Bush'],
    ['tmobile', '17:15', 'Busta Rhymes'],
    ['tmobile', '18:45', 'Rilo Kiley'],
    ['tmobile', '20:30', 'Zedd'],

    ['hellofresh', '12:00', 'Bettina Maureenji'],
    ['hellofresh', '13:15', 'Moonalice'],
    ['hellofresh', '14:45', 'Saxsquatch'],
    ['hellofresh', '16:15', 'Midnight Generation'],
    ['hellofresh', '17:45', 'The Warning'],
    ['hellofresh', '19:15', 'Arrested Development'],
    ['hellofresh', '20:45', 'Maoli'],

    ['northbay', '12:00', 'Jake Zimma'],
    ['northbay', '13:00', 'Folk Bitch Trio'],
    ['northbay', '14:30', 'Zinadelphia'],
    ['northbay', '15:45', 'Charlotte Lawrence'],
    ['northbay', '17:15', 'Almost Monday'],
    ['northbay', '18:45', 'Better Than Ezra'],
    ['northbay', '20:15', 'DJ Pauly D (Silent Disco)'],
  ],
  sun: [
    ['prudential', '12:00', 'Betty Taylor'],
    ['prudential', '13:30', 'Larkin Poe'],
    ['prudential', '15:00', 'Kool & the Gang'],
    ['prudential', '16:30', 'Mt. Joy'],
    ['prudential', '18:15', 'Sombr'],
    ['prudential', '20:00', 'Backstreet Boys'],

    ['tmobile', '12:00', 'Nat Myers'],
    ['tmobile', '13:15', 'Izzy Escobar'],
    ['tmobile', '14:30', 'Absolutely'],
    ['tmobile', '15:45', 'Paulo Londra'],
    ['tmobile', '17:15', 'Bigxthaplug'],
    ['tmobile', '18:45', 'Slightly Stoopid'],
    ['tmobile', '20:30', 'Ludacris'],

    ['hellofresh', '12:00', 'Napa Valley Youth Symphony'],
    ['hellofresh', '13:00', 'The Silverado Pickups'],
    ['hellofresh', '14:30', 'The Paper Kites'],
    ['hellofresh', '16:00', 'Paco Versailles'],
    ['hellofresh', '17:30', 'Good Neighbours'],
    ['hellofresh', '19:00', 'The California Honeydrops'],
    ['hellofresh', '20:30', 'Cut Copy'],

    ['northbay', '12:00', 'Alec Shaw'],
    ['northbay', '13:15', 'Girl Tones'],
    ['northbay', '14:30', 'Buffalo Traffic Jam'],
    ['northbay', '16:00', 'The Heavy Heavy'],
    ['northbay', '17:30', 'Sons of the East'],
    ['northbay', '19:00', 'Matt Maeson'],
    ['northbay', '20:30', 'Jess King (Silent Disco)'],
  ],
};

// Build sets with end times (= next set start on same stage that day, or +60min
// for the last slot of the day on that stage).
function buildSchedule() {
  const all = [];
  for (const day of DAYS) {
    const byStage = {};
    for (const stage of STAGES) byStage[stage.id] = [];
    for (const [stageId, start, artist] of sets[day.id]) {
      byStage[stageId].push({ stageId, start, artist });
    }
    for (const stage of STAGES) {
      const list = byStage[stage.id].sort((a, b) => t(a.start) - t(b.start));
      for (let i = 0; i < list.length; i++) {
        const cur = list[i];
        const startMin = t(cur.start);
        const endMin = i < list.length - 1 ? t(list[i + 1].start) : startMin + 60;
        const id = `${day.id}-${stage.id}-${i}`;
        all.push({
          id,
          dayId: day.id,
          stageId: stage.id,
          artist: cur.artist,
          start: cur.start,
          startMin,
          endMin,
          end: `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`,
        });
      }
    }
  }
  return all;
}

export const SCHEDULE = buildSchedule();

export const SCHEDULE_BY_ID = Object.fromEntries(SCHEDULE.map((s) => [s.id, s]));

// Format "HH:MM" (24h) into "H:MMa/p" friendly form.
export function fmtTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'p' : 'a';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}
