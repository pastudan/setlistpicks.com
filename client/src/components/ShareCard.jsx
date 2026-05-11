import React from 'react';
import { toast } from '../toast.js';

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ShareCard({ groupId, memberKey, mutedMembers }) {
  const url = `${location.origin}/${groupId}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast('Invite link copied');
    } catch {
      toast('Invite link copied');
    }
  }

  return (
    <div className="card stack share-card">
      <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Invite your crew
      </div>
      <div className="share-row">
        <input type="text" readOnly value={url} style={{ fontSize: '0.82rem' }} />
        <button className="btn secondary" onClick={copy}>Copy invite link</button>
      </div>
      {mutedMembers.length > 0 && (
        <div className="members">
          {mutedMembers.map((m) => (
            <span key={m.key} className={`member-chip${m.key === memberKey ? ' you' : ''}`}>
              <span className="chip-avatar">{initials(m.displayName)}</span>
              {m.displayName}
              {m.key === memberKey && <span className="chip-you">(you)</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
