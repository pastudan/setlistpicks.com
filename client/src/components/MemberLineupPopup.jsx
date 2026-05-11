import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SCHEDULE, DAYS, fmtTime } from '../../../shared/schedule.js';

export default function MemberLineupPopup({ memberKey, memberDisplayName, perArtistRaw, onClose }) {
  // Build a votes map for this member from the already-fetched perArtistRaw
  const votes = {};
  for (const [artistId, voters] of Object.entries(perArtistRaw)) {
    const v = voters.find((v) => v.key === memberKey);
    if (v && v.score > 0) votes[artistId] = v.score;
  }

  // Group picked shows by day, sorted chronologically
  const byDay = DAYS.map((day) => {
    const shows = SCHEDULE
      .filter((s) => s.dayId === day.id && votes[s.id])
      .sort((a, b) => a.startMin - b.startMin);
    return { day, shows };
  }).filter(({ shows }) => shows.length > 0);

  const isEmpty = byDay.length === 0;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="picks-backdrop" onClick={onClose}>
      <div className="picks-popup" onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        <div className="picks-artist">{memberDisplayName}&rsquo;s picks</div>
        {isEmpty ? (
          <div className="picks-empty">No picks yet</div>
        ) : (
          byDay.map(({ day, shows }) => (
            <div key={day.id} className="picks-section">
              <div className="picks-section-head">{day.name}</div>
              {shows.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>
                    {votes[s.id] === 3 ? '🔥' : (
                      <svg viewBox="0 0 28 28" overflow="visible" aria-hidden="true"
                        style={{ width: 12, height: 12, opacity: 1, verticalAlign: 'middle' }}>
                        <use href="#mark-check" />
                      </svg>
                    )}
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.artist}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', flexShrink: 0 }}>
                    {fmtTime(s.start)}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>,
    document.body,
  );
}
