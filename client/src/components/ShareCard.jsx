import React, { useState, useRef } from 'react';

export default function ShareCard({ groupId, memberKey, mutedMembers, memberVoteCounts = {}, onMemberClick }) {
  const url = `${location.origin}/${groupId}`;
  const displayUrl = `${location.host}/${groupId}`;
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  async function copy() {
    try { await navigator.clipboard.writeText(url); } catch { /* fallback: still show feedback */ }
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
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
        <div onClick={copy} style={{
          flex: 1, fontSize: '0.82rem', fontFamily: 'inherit',
          padding: '12px 10px', display: 'flex', alignItems: 'center',
          background: 'var(--paper)', border: '1px solid rgba(36,103,177,0.35)',
          cursor: 'pointer', userSelect: 'none',
          overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--ink)',
        }}>
          {displayUrl}
        </div>
        <button
          className="btn secondary"
          onClick={copy}
          style={copied ? { background: 'var(--btn-primary)', color: '#fff', borderColor: 'var(--btn-primary)' } : undefined}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
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
