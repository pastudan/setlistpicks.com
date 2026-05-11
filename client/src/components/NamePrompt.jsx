import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api.js';
import { setIdentity } from '../storage.js';

const normalize = (s) => String(s || '').trim().toLowerCase();

export default function NamePrompt({ groupId, member, memberDisplayName, groupName, mutedMembers = [], onDismiss }) {
  const autoName = memberDisplayName;
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const trimmed = name.trim();
  // Match on normalized display name, not key — keys are now opaque nanoids
  const existingMatch = trimmed ? mutedMembers.find(m => normalize(m.displayName) === normalize(trimmed)) : null;
  const isSelf = existingMatch?.key === member.key;
  const isRecovery = existingMatch && !isSelf;

  async function dismiss(chosenName) {
    const t = chosenName?.trim();
    if (!t || t === autoName) { onDismiss(null); return; }

    if (mutedMembers.find(m => normalize(m.displayName) === normalize(t) && m.key !== member.key)) {
      // Recover existing session. The member.key is about to change so we can't
      // just update a display label — we need a clean re-mount with the correct key.
      // Reload the page: localStorage is already set to the recovered identity,
      // so App.jsx will read it and mount GroupView as the real user.
      try {
        const { member: recovered } = await api.join(groupId, t);
        setIdentity(groupId, recovered);
        // Remove the auto-generated placeholder before reloading
        await api.removeMember(groupId, member.key, { keepVotes: false }).catch(() => {});
        location.reload();
      } catch { onDismiss(autoName); }
    } else {
      // New name — just rename the auto-generated placeholder user
      try {
        await api.updateMember(groupId, member.key, t);
        setIdentity(groupId, { ...member, displayName: t });
        onDismiss(t);
      } catch { onDismiss(autoName); }
    }
  }

  function submit() { dismiss(name.trim() || autoName); }

  return (
    <div className="name-prompt-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(null); }}>
      <div className="name-prompt-card">
        <div style={{ fontWeight: 800, fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Plan BottleRock
        </div>
        <ul style={{ margin: '4px 0 0', paddingLeft: '18px', display: 'grid', gap: '4px', fontSize: '0.88rem', color: 'var(--ink-soft)' }}>
          <li>Save the shows you want to see</li>
          <li>Share a link with your crew</li>
          <li>See what the group decides on</li>
        </ul>

        {/* Show existing members when joining an existing group so they know
            to type their name to recover their session */}
        {groupName && (() => {
          const others = mutedMembers.filter(m => m.key !== member.key);
          if (!others.length) return null;
          return (
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.72rem' }}>
                Already in this group:
              </span>{' '}
              {others.map((m, i) => (
                <span key={m.key}>
                  {i > 0 && <span style={{ color: 'var(--ink-dim)' }}>, </span>}
                  <button onClick={() => setName(m.displayName)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontWeight: 700, color: 'var(--ink)', fontSize: 'inherit',
                    textDecoration: 'underline', textDecorationStyle: 'dotted',
                    textUnderlineOffset: '2px',
                  }}>
                    {m.displayName}
                  </button>
                </span>
              ))}
              <div style={{ marginTop: 3, fontSize: '0.75rem', fontStyle: 'italic' }}>
                Tap a name to rejoin as them.
              </div>
            </div>
          );
        })()}

        <div style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: groupName ? 12 : 0 }}>
          What&rsquo;s your name?
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--ink-soft)' }}>
          Your group will see this next to your picks.
        </p>
        <input
          ref={inputRef}
          type="text"
          placeholder="Name"
          maxLength={64}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          style={{ fontSize: '16px' }}
        />

        {/* Per-keystroke collision hint */}
        {isRecovery && (
          <div style={{
            fontSize: '0.82rem', fontWeight: 600,
            color: 'var(--ink)', lineHeight: 1.4,
            background: 'rgba(36,103,177,0.08)',
            border: '1px solid rgba(36,103,177,0.2)',
            borderRadius: '4px', padding: '8px 12px',
          }}>
            <strong>{existingMatch.displayName}</strong> is already in this group
            &mdash; you&rsquo;ll recover their picks on this device.
          </div>
        )}
        {isSelf && trimmed && (
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
            That&rsquo;s your current name.
          </div>
        )}

        <button className="btn" onClick={submit}>
          {isRecovery ? `Rejoin as ${existingMatch.displayName}` : "Let\u2019s go"}
        </button>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
            <button onClick={() => dismiss(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit',
              textDecoration: 'underline', textDecorationStyle: 'solid', textUnderlineOffset: '2px',
            }}>Skip</button>
            {' \u2014 use \u201c'}{autoName}{'\u201d'}
          </span>
        </div>
      </div>
    </div>
  );
}
