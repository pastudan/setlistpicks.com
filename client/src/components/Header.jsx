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

const labelStyle = {
  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--ink-soft)',
};
const linkStyle = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  fontSize: '0.75rem', color: 'var(--ink-soft)',
  textDecoration: 'underline', textDecorationStyle: 'solid', textUnderlineOffset: '2px',
};
const dimLinkStyle = { ...linkStyle, color: 'var(--ink-dim)' };

export default function Header({
  groupId, member, groupName, setGroupName,
  memberDisplayName, setMemberDisplayName,
  mutedMembers, setMutedMembers, onLeave, onEditingChange,
}) {
  const [editing, setEditing] = useState(false);

  function applyEditing(val) {
    setEditing(val);
    onEditingChange?.(val);
  }
  const [groupInput, setGroupInput]     = useState(groupName);
  const [nameInput, setNameInput]       = useState(memberDisplayName);
  const [removingKey, setRemovingKey]   = useState(null); // member key being removed

  function openEdit() {
    setGroupInput(groupName);
    setNameInput(memberDisplayName);
    setRemovingKey(null);
    applyEditing(true);
  }

  function closeEdit() {
    setRemovingKey(null);
    applyEditing(false);
  }

  async function save() {
    const newGroup = groupInput.trim() || groupName;
    const newName  = nameInput.trim()  || memberDisplayName;
    const prevGroup = groupName;
    const prevName  = memberDisplayName;

    setGroupName(newGroup);
    setMemberDisplayName(newName);
    setIdentity(groupId, { ...member, displayName: newName });
    applyEditing(false);
    setRemovingKey(null);

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

  async function doRemoveMember(memberKey, { keepVotes = false } = {}) {
    try {
      await api.removeMember(groupId, memberKey, { keepVotes });
      setMutedMembers((prev) => prev.filter((m) => m.key !== memberKey));
    } catch (e) {
      toast(`Couldn\u2019t remove: ${e.message}`);
    }
    setRemovingKey(null);
  }

  async function doLeave(keepVotes) {
    try { await api.removeMember(groupId, member.key, { keepVotes }); } catch {}
    clearIdentity(groupId);
    onLeave();
  }

  function MemberRow({ m }) {
    const isYou = m.key === member.key;
    const avatar = (
      <span className="chip-avatar" style={isYou ? { background: 'var(--btn-primary)', color: '#fff' } : {}}>
        {initials(m.displayName)}
      </span>
    );
    const name = (
      <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {m.displayName}{isYou && <span className="chip-you"> (you)</span>}
      </span>
    );

    if (removingKey === m.key) {
      if (isYou) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, background: 'rgba(180,40,40,0.05)', border: '1px solid rgba(180,40,40,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{avatar}{name}</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#b42828' }}>
              ⚠️ Caution&mdash;you&rsquo;re removing yourself!
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ink-soft)', lineHeight: 1.55 }}>
              You&rsquo;ll leave the group on this device. Everyone else&rsquo;s choices and the group itself will remain.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              <button className="btn danger small" onClick={() => doLeave(false)}>Leave &amp; delete my picks</button>
              <button style={linkStyle} onClick={() => doLeave(true)}>Leave but keep my picks</button>
              <button style={dimLinkStyle} onClick={() => setRemovingKey(null)}>Never mind</button>
            </div>
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {avatar}{name}
          <button className="btn danger small" onClick={() => doRemoveMember(m.key, { keepVotes: false })}>Remove</button>
          <button style={dimLinkStyle} onClick={() => setRemovingKey(null)}>cancel</button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {avatar}{name}
        <button style={linkStyle} onClick={() => setRemovingKey(m.key)}>remove</button>
      </div>
    );
  }

  const memberCount = mutedMembers.length;

  // Live-preview values: when editing, reflect what's typed; otherwise show saved state
  const displayGroupName = editing ? (groupInput || groupName) : groupName;
  const displayMemberName = editing ? (nameInput || memberDisplayName) : memberDisplayName;

  const brandRow = (
    <div className="brand">
      <div className="brand-logo">BottleRock</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="brand-title">{displayGroupName}</div>
        <div className="brand-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
          {!editing && (
            <>
              <span style={{ color: 'var(--ink-dim)', userSelect: 'none' }}>&middot;</span>
              <button onClick={openEdit} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 'inherit', fontWeight: 600, color: 'var(--ink-dim)',
                textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px',
              }}>edit</button>
            </>
          )}
        </div>
      </div>
      <button className="profile-badge" onClick={editing ? undefined : openEdit}
        title={editing ? undefined : 'Edit your name & crew'}
        style={editing ? { cursor: 'default' } : {}}>
        <span className="profile-avatar">{initials(displayMemberName)}</span>
        <span className="profile-name">{displayMemberName}</span>
        {!editing && <ChevronIcon />}
      </button>
    </div>
  );

  if (editing) {
    const membersSection = mutedMembers.length > 0 && (
      <div style={{ display: 'grid', gap: 8, marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--rule)' }}>
        <label style={labelStyle}>Members</label>
        {mutedMembers.map((m) => <MemberRow key={m.key} m={m} />)}
      </div>
    );

    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {brandRow}
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={labelStyle}>Group name</label>
          <input type="text" value={groupInput} maxLength={64}
            placeholder="Crew name"
            style={{ fontSize: '0.88rem', padding: '6px 10px' }}
            onChange={(e) => setGroupInput(e.target.value)} />
          <label style={{ ...labelStyle, marginTop: 2 }}>Your name</label>
          <input type="text" value={nameInput} maxLength={64}
            placeholder="Your name"
            style={{ fontSize: '0.88rem', padding: '6px 10px' }}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()} />
          {membersSection}
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--rule)' }}>
            <button className="btn" onClick={save}>Save</button>
            <button className="btn ghost" onClick={closeEdit}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return brandRow;
}
