// Build-time SEO prerender helpers.
// Imported by vite.config.js via transformIndexHtml.
// Generates static HTML (lineup) and JSON-LD (MusicFestival schema) from the
// shared schedule so Googlebot sees real content at `/` without running JS.

import { SCHEDULE, STAGES, DAYS } from './shared/schedule.js';

const STAGE_NAMES = Object.fromEntries(STAGES.map((s) => [s.id, s.name]));

// 'HH:MM' (24h) → '12:30 PM' display form
function fmtTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, '0');
  return `${h12}:${mm} ${ampm}`;
}

// 'HH:MM' + date string → ISO 8601 datetime with PT offset
function toIso(hhmm, dateStr) {
  // dateStr is like 'May 22'
  const monthMap = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
  const [mon, day] = dateStr.split(' ');
  const month = String(monthMap[mon]).padStart(2, '0');
  const dayPad = String(day).padStart(2, '0');
  return `2026-${month}-${dayPad}T${hhmm}:00-07:00`;
}

export function renderLineupHtml() {
  const dayGroups = DAYS.map((day) => {
    const sets = SCHEDULE.filter((s) => s.dayId === day.id);
    // Group by stage, in STAGES order
    const stageBlocks = STAGES.map((stage) => {
      const stageSets = sets
        .filter((s) => s.stageId === stage.id)
        .sort((a, b) => a.startMin - b.startMin);
      if (!stageSets.length) return '';
      const items = stageSets
        .map((s) => `<li><time datetime="${toIso(s.start, day.date)}">${fmtTime(s.start)}</time> &ndash; ${escHtml(s.artist)}</li>`)
        .join('');
      return `<div class="seo-stage"><h3>${escHtml(STAGE_NAMES[stage.id])}</h3><ul>${items}</ul></div>`;
    }).join('');
    return `<section class="seo-day"><h2>${escHtml(day.name)}, ${escHtml(day.date)}</h2>${stageBlocks}</section>`;
  }).join('');

  const artistCount = SCHEDULE.length;

  return `<div id="seo-prerender" aria-hidden="true" style="display:none">
<h1>Outside Lands 2026 Lineup &amp; Schedule</h1>
<p>Outside Lands 2026 runs August 7&ndash;9 at Golden Gate Park in San Francisco. ${artistCount} sets across 4 stages &mdash; Lands End, Twin Peaks, Sutro, and Panhandle. Headliners include Charli xcx, The Strokes, R&Uuml;F&Uuml;S DU SOL, Baby Keem, Turnstile, The xx, and Death Cab for Cutie. Use this tool to pick your must-see shows and plan with your crew.</p>
<p><em>Note: set times are estimated &mdash; official times will be published in the Outside Lands app closer to the festival.</em></p>
<p><a href="https://www.sfoutsidelands.com/lineup" rel="noopener noreferrer">Official Outside Lands lineup &rarr;</a></p>
${dayGroups}
</div>`;
}

export function renderJsonLd() {
  const subEvents = SCHEDULE.map((s) => {
    const day = DAYS.find((d) => d.id === s.dayId);
    return {
      '@type': 'MusicEvent',
      name: s.artist,
      startDate: toIso(s.start, day.date),
      endDate: toIso(s.end, day.date),
      location: {
        '@type': 'Place',
        name: `${STAGE_NAMES[s.stageId]} — Golden Gate Park`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Golden Gate Park',
          addressLocality: 'San Francisco',
          addressRegion: 'CA',
          postalCode: '94122',
          addressCountry: 'US',
        },
      },
      performer: { '@type': 'MusicGroup', name: s.artist },
    };
  });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'MusicFestival',
    name: 'Outside Lands 2026',
    startDate: '2026-08-07T12:00:00-07:00',
    endDate: '2026-08-09T22:00:00-07:00',
    location: {
      '@type': 'Place',
      name: 'Golden Gate Park',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Golden Gate Park',
        addressLocality: 'San Francisco',
        addressRegion: 'CA',
        postalCode: '94122',
        addressCountry: 'US',
      },
    },
    url: 'https://setlistpicks.com/',
    subEvent: subEvents,
  };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
