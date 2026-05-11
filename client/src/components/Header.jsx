import React, { useState } from 'react';
import { api } from '../api.js';
import { setIdentity, clearIdentity } from '../storage.js';
import { toast } from '../toast.js';

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"
      style={{ width: 10, height: 10, opacity: 0.75, flexShrink: 0 }}>
      <path d="M2 4l4 4 4-4z" />
    </svg>
  );
}

export default function Header({
  groupId, member, groupName, setGroupName,
  memberDisplayName, setMemberDisplayName,
  mutedMembers, onLeave,
}) {
  const [editing, setEditing] = useState(false);
  const [groupInput, setGroupInput] = useState(groupName);
  const [nameInput, setNameInput] = useState(memberDisplayName);

  function openEdit() {
    setGroupInput(groupName);
    setNameInput(memberDisplayName);
    setEditing(true);
  }

  async function save() {
    const newGroup = groupInput.trim() || groupName;
    const newName  = nameInput.trim()  || memberDisplayName;
    const prevGroup = groupName;
    const prevName  = memberDisplayName;

    setGroupName(newGroup);
    setMemberDisplayName(newName);
    setIdentity(groupId, { ...member, displayName: newName });
    setEditing(false);

    try {
      await Promise.all([
        newGroup !== prevGroup ? api.updateGroup(groupId, newGroup) : Promise.resolve(),
        newName  !== prevName  ? api.updateMember(groupId, member.key, newName) : Promise.resolve(),
      ]);
    } catch (e) {
      setGroupName(prevGroup);
      setMemberDisplayName(prevName);
      setIdentity(groupId, { ...member, displayName: prevName });
      toast(`Couldn\u2019t save: ${e.message}`);
    }
  }

  function handleLeave() {
    if (!confirm('Leave this group on this device? Your votes stay saved.')) return;
    clearIdentity(groupId);
    onLeave();
  }

  if (editing) {
    return (
      <div className="brand" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 10 }}>
        <div className="brand-logo">BottleRock</div>
        <div style={{ width: '100%', display: 'grid', gap: 6 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
            Crew name
          </label>
          <input type="text" value={groupInput} maxLength={64}
            placeholder="Crew name"
            style={{ fontSize: '0.88rem', padding: '6px 10px' }}
            onChange={(e) => setGroupInput(e.target.value)} />
          <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginTop: 2 }}>
            Your name
          </label>
          <input type="text" value={nameInput} maxLength={64}
            placeholder="Your name"
            style={{ fontSize: '0.88rem', padding: '6px 10px' }}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()} />
          <div style={{ display: 'flex', gap: 8, marginTop: 2, alignItems: 'center' }}>
            <button className="btn" onClick={save}>Save</button>
            <button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button onClick={handleLeave} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px',
              fontSize: '0.75rem', color: 'var(--ink-dim)', marginLeft: 'auto',
              textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px',
            }}>Leave group</button>
          </div>
        </div>
      </div>
    );
  }

  const memberCount = mutedMembers.length;
  return (
    <div className="brand">
      <div className="brand-logo">BottleRock</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="brand-title">{groupName}</div>
        <div className="brand-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
          <span style={{ color: 'var(--ink-dim)', userSelect: 'none' }}>&middot;</span>
          <button onClick={openEdit} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 'inherit', fontWeight: 600, color: 'var(--ink-dim)',
            textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px',
          }}>edit</button>
        </div>
      </div>
      <button className="profile-badge" onClick={openEdit} title="Edit your name & crew">
        <span className="profile-avatar">{initials(memberDisplayName)}</span>
        <span className="profile-name">{memberDisplayName}</span>
        <ChevronIcon />
      </button>
    </div>
  );
}
