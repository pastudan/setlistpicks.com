import React, { useRef, useEffect, useCallback } from 'react';
import { SCHEDULE, DAYS } from '../../../shared/schedule.js';
import { ShowBlock, TOTAL_SLOTS, STAGE_COL, minToSlot, GRID_START_MIN } from './ShowBlock.jsx';

const STAGE_HEADERS = {
  prudential: 'Prudential Stage',
  tmobile:    'T-Mobile Stage',
  hellofresh: 'HelloFresh Stage',
  northbay:   'NorthBay Health Stage',
};

const STAGES_ORDER = ['prudential', 'tmobile', 'hellofresh', 'northbay'];

function timeAxisLabel(slotIndex) {
  const totalMin = GRID_START_MIN + slotIndex * 15;
  const hour = Math.floor(totalMin / 60);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  if (slotIndex === 0)           return <>{12}<span className="time-pm"> PM</span></>;
  if (slotIndex === TOTAL_SLOTS) return <>{10}<span className="time-pm"> PM</span></>;
  return String(h12);
}

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function DayGrid({ day, myVotes, perArtistRaw, memberKey, memberDisplayName, groupId, onVoteChange, onLongPress }) {
  const daySets = SCHEDULE.filter((s) => s.dayId === day.id);
  const dayNum = parseInt(day.date.split(' ')[1], 10);
  const dayDate = `${dayNum}${ordinalSuffix(dayNum)}`;

  return (
    <div data-day={day.id}>
      <div className="day-heading">
        <span className="day-name">{day.name}</span>
        <span className="day-date">May {dayDate}</span>
      </div>
      <div className="schedule-wrap">
        <div className="schedule-grid">
          {/* Stage headers */}
          {STAGES_ORDER.map((stageId, i) => (
            <div key={stageId} className="stage-header" data-stage={stageId}
              style={{ gridColumn: i + 2, gridRow: 1 }}>
              {STAGE_HEADERS[stageId]}
            </div>
          ))}

          {/* Time axis labels */}
          {Array.from({ length: TOTAL_SLOTS / 4 + 1 }, (_, i) => i * 4).map((slot) => (
            <div key={slot} className="time-label"
              style={{ gridColumn: 1, gridRow: slot + 2 }}>
              {timeAxisLabel(slot)}
            </div>
          ))}

          {/* Show blocks */}
          {daySets.map((s) => (
            <ShowBlock
              key={s.id}
              s={s}
              myVote={myVotes[s.id] || 0}
              groupVotes={perArtistRaw[s.id] || []}
              memberKey={memberKey}
              memberDisplayName={memberDisplayName}
              groupId={groupId}
              onVoteChange={onVoteChange}
              onLongPress={onLongPress}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const LAST_SCROLL_KEY = 'brsp.lastScroll.v1';

export default function ScheduleGrid({
  myVotes, perArtistRaw, memberKey, memberDisplayName,
  groupId, activeDay, setActiveDay, onVoteChange, onLongPress,
}) {
  const bodyRef = useRef(null);
  const observerRef = useRef(null);

  // Restore saved scroll position after first paint.
  // Using rAF ensures the page has laid out before we scroll, which avoids
  // confusing iOS Safari's viewport after a pull-to-refresh.
  useEffect(() => {
    const saved = localStorage.getItem(LAST_SCROLL_KEY);
    if (!saved) return;
    const y = parseInt(saved, 10);
    if (!isNaN(y) && y > 0) {
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' }));
    }
  }, []); // eslint-disable-line

  // Save scroll position on every scroll
  useEffect(() => {
    const onScroll = () => localStorage.setItem(LAST_SCROLL_KEY, String(Math.round(window.scrollY)));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // IntersectionObserver: track which day is most visible → update active tab
  useEffect(() => {
    if (!bodyRef.current) return;
    observerRef.current?.disconnect();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const dayId = entry.target.dataset.day;
            if (dayId) setActiveDay(dayId);
          }
        }
      },
      { threshold: 0.3 },
    );
    bodyRef.current.querySelectorAll('[data-day]').forEach((el) => obs.observe(el));
    observerRef.current = obs;
    return () => obs.disconnect();
  }, []); // eslint-disable-line

  return (
    <div ref={bodyRef}>
      {DAYS.map((day) => (
        <DayGrid
          key={day.id}
          day={day}
          myVotes={myVotes}
          perArtistRaw={perArtistRaw}
          memberKey={memberKey}
          memberDisplayName={memberDisplayName}
          groupId={groupId}
          onVoteChange={onVoteChange}
          onLongPress={onLongPress}
        />
      ))}
      <footer style={{
        marginTop: '100px',
        paddingBottom: '40px',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--ink-soft)',
      }}>
        <a href="https://stuffbydan.com" target="_blank" rel="noopener noreferrer" style={{
          color: 'inherit',
          textDecoration: 'none',
          fontWeight: 600,
        }}>
          Made with ♥ in San Francisco
        </a>
      </footer>
    </div>
  );
}
