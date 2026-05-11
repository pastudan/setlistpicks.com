import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api.js';
import { setIdentity } from '../storage.js';

export default function NamePrompt({ groupId, member, memberDisplayName, groupName, onDismiss }) {
  const autoName = memberDisplayName;
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function dismiss(chosenName) {
    if (chosenName && chosenName !== autoName) {
      try {
        await api.updateMember(groupId, member.key, chosenName);
        setIdentity(groupId, { ...member, displayName: chosenName });
        onDismiss(chosenName);
      } catch {
        onDismiss(autoName);
      }
    } else {
      onDismiss(null);
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
        {/* <div style={{ borderTop: '1px solid rgba(36,103,177,0.12)', margin: '4px 0 10px' }} /> */}
        {/* {groupName && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Joining Group
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '4px 14px',
              border: '1.5px solid var(--ink)',
              borderRadius: '3px',
              fontSize: '0.92rem', fontWeight: 800,
              color: 'var(--ink)',
              letterSpacing: '0.02em',
              background: 'rgba(36,103,177,0.06)',
            }}>
              {groupName}
            </span>
          </div>
        )} */}
        <div style={{ borderTop: '1px solid rgba(36,103,177,0.12)', margin: '10px 0 8px' }} />
        <div style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
          style={{ fontSize: '1rem' }}
        />
        <button className="btn" onClick={submit}>Let&rsquo;s go</button>
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
