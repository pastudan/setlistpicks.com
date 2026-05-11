import React from 'react';
import { toast } from '../toast.js';

export default function ShareCard({ groupId, memberKey, mutedMembers, memberVoteCounts = {}, onMemberClick }) {
  const url = `${location.origin}/${groupId}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast('Invite link copied');
    } catch {
      toast('Invite link copied');
    }
  }

  const linkStyle = {
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    fontWeight: 600, color: 'var(--ink)',
    textDecoration: 'underline', textDecorationStyle: 'solid',
    textUnderlineOffset: '2px', fontSize: 'inherit', fontFamily: 'inherit',
  };

  return (
    <div className="card stack share-card">
      <div style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Invite your crew
      </div>
      <div className="share-row">
        <input type="text" readOnly value={url} style={{ fontSize: '0.82rem' }} />
        <button className="btn secondary" onClick={copy}>Copy</button>
      </div>
      {mutedMembers.length > 0 && (
        <div style={{ fontSize: '0.88rem', lineHeight: 1.6, display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
          {mutedMembers.map((m) => (
            <span key={m.key} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <button style={linkStyle} onClick={() => onMemberClick?.(m)}>
                {m.displayName}
              </button>
              {memberVoteCounts[m.key] > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--ink-soft)', color: '#fff',
                  borderRadius: '999px', fontWeight: 700,
                  fontSize: '0.62rem', lineHeight: 1,
                  minWidth: '1.35em', height: '1.35em',
                  padding: '0 0.3em',
                  marginLeft: '4px',
                  verticalAlign: 'middle',
                  position: 'relative', top: '-1px',
                }}>
                  {memberVoteCounts[m.key]}
                </span>
              )}
              {m.key === memberKey && (
                <span style={{ color: 'var(--ink-soft)', fontWeight: 400, fontSize: '0.7em', marginLeft: 3, position: 'relative', top: '-2px' }}>(you)</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
