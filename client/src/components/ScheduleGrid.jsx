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
  if (slotIndex === 0)         return '12 PM';
  if (slotIndex === TOTAL_SLOTS) return '10 PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
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
  const headingRef = useRef(null);
  const gridRef    = useRef(null);

  // On mobile only: show/hide the time axis depending on whether the day
  // heading is still visible. Once scrolled past it, the time column slides in.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    if (!mq.matches) return;

    function update() {
      if (!headingRef.current || !gridRef.current) return;
      const { bottom } = headingRef.current.getBoundingClientRect();
      // Hide time axis once the day heading has scrolled above the viewport
      gridRef.current.classList.toggle('time-hidden', bottom < 10);
    }

    window.addEventListener('scroll', update, { passive: true });
    update(); // run once on mount
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div data-day={day.id}>
      <div className="day-heading" ref={headingRef}>
        <span className="day-name">{day.name}</span>
        <span className="day-date">May {dayDate}</span>
      </div>
      <div className="schedule-wrap">
        <div className="schedule-grid" ref={gridRef}>
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

const LAST_DAY_KEY = 'brsp.lastDay.v1';

export default function ScheduleGrid({
  myVotes, perArtistRaw, memberKey, memberDisplayName,
  groupId, activeDay, setActiveDay, onVoteChange, onLongPress,
}) {
  const bodyRef = useRef(null);
  const observerRef = useRef(null);

  // Scroll to saved day on first render
  useEffect(() => {
    const saved = localStorage.getItem(LAST_DAY_KEY);
    if (saved && saved !== DAYS[0].id && bodyRef.current) {
      const el = bodyRef.current.querySelector(`[data-day="${saved}"]`);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, []); // eslint-disable-line

  // IntersectionObserver: track which day is most visible → update active tab
  useEffect(() => {
    if (!bodyRef.current) return;
    observerRef.current?.disconnect();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const dayId = entry.target.dataset.day;
            if (dayId) {
              setActiveDay(dayId);
              localStorage.setItem(LAST_DAY_KEY, dayId);
            }
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
    </div>
  );
}
