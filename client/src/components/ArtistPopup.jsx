import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function MemberRow({ v, memberKey }) {
  return (
    <div className="picks-member">
      <span className="chip-avatar">{initials(v.displayName)}</span>
      <span>{v.displayName}</span>
      {v.key === memberKey && <span className="chip-you">(you)</span>}
    </div>
  );
}

export default function ArtistPopup({ artistId, artistName, votes, memberKey, onClose }) {
  const musts = votes.filter((v) => v.score === 3);
  const wants = votes.filter((v) => v.score === 1);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="picks-backdrop" onClick={onClose}>
      <div className="picks-popup" onClick={(e) => e.stopPropagation()}>
        <div className="picks-artist">{artistName}</div>
        {musts.length > 0 && (
          <div className="picks-section">
            <div className="picks-section-head">🔥 Must See</div>
            {musts.map((v) => <MemberRow key={v.key} v={v} memberKey={memberKey} />)}
          </div>
        )}
        {wants.length > 0 && (
          <div className="picks-section">
            <div className="picks-section-head">
              <svg viewBox="0 0 28 28" overflow="visible" aria-hidden="true"
                style={{ width: 12, height: 12, opacity: 1, verticalAlign: 'middle', marginRight: 4 }}>
                <use href="#mark-check" />
              </svg>
              Want
            </div>
            {wants.map((v) => <MemberRow key={v.key} v={v} memberKey={memberKey} />)}
          </div>
        )}
        {!musts.length && !wants.length && (
          <div className="picks-empty">No group picks yet</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
