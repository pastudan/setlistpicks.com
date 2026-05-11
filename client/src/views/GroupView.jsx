import React, {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import { DAYS } from '../../../shared/schedule.js';
import { api } from '../api.js';
import Header from '../components/Header.jsx';
import ShareCard from '../components/ShareCard.jsx';
import Legend from '../components/Legend.jsx';
import ScheduleGrid from '../components/ScheduleGrid.jsx';
import NamePrompt from '../components/NamePrompt.jsx';
import ArtistPopup from '../components/ArtistPopup.jsx';
import MemberLineupPopup from '../components/MemberLineupPopup.jsx';

export default function GroupView({ groupId, member, groupMeta, freshJoin, onLeave }) {
  const [myVotes,          setMyVotes]          = useState({});
  const [perArtistRaw,     setPerArtistRaw]     = useState({});
  const [mutedMembers,     setMutedMembers]     = useState(groupMeta?.members || []);
  const [groupName,        setGroupName]        = useState(groupMeta?.name || 'Napa Squad');
  const [memberDisplayName, setMemberDisplayName] = useState(member.displayName);
  const [activeDay,        setActiveDay]        = useState(DAYS[0].id);
  const [showNamePrompt,   setShowNamePrompt]   = useState(freshJoin);
  const [headerEditing,    setHeaderEditing]    = useState(false);
  // True only when joining a pre-existing group (others already present)
  const isJoiner = (groupMeta?.members ?? []).some((m) => m.key !== member.key);
  const [popup,            setPopup]            = useState(null); // { id, artist }
  const [memberPopup,      setMemberPopup]      = useState(null); // { key, displayName }



  // ── Fetch my votes ───────────────────────────────────────────────────────────
  useEffect(() => {
    api.myVotes(groupId, member.key)
      .then(({ votes }) => setMyVotes(votes || {}))
      .catch(console.error);
  }, [groupId, member.key]);

  // ── WebSocket: live group vote sync ─────────────────────────────────────────
  useEffect(() => {
    let ws;
    let reconnectTimer;

    function connect() {
      clearTimeout(reconnectTimer);
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws?group=${groupId}`);

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'votes') {
            if (msg.members)   setMutedMembers(msg.members);
            if (msg.perArtist) setPerArtistRaw(msg.perArtist);
            if (msg.groupName) setGroupName(msg.groupName);
            // Keep memberDisplayName in sync with server's record of our name
            if (msg.members) {
              const me = msg.members.find((m) => m.key === member.key);
              if (me) setMemberDisplayName(me.displayName);
            }
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => { reconnectTimer = setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [groupId]);

  // ── Day tabs scroll ──────────────────────────────────────────────────────────
  function scrollToDay(dayId) {
    const el = document.querySelector(`[data-day="${dayId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveDay(dayId);
  }

  // ── Vote handler (stable identity via useCallback, optimistic) ───────────────
  const handleVoteChange = useCallback((artistId, newScore) => {
    setMyVotes((prev) => ({ ...prev, [artistId]: newScore }));
  }, []);

  // ── Long-press popup ─────────────────────────────────────────────────────────
  const handleLongPress = useCallback((artistId, artistName) => {
    setPopup({ id: artistId, artist: artistName });
  }, []);

  // ── Name prompt dismiss ──────────────────────────────────────────────────────
  function handleNameDismiss(newName) {
    if (newName) setMemberDisplayName(newName);
    setShowNamePrompt(false);
  }

  // ── Per-member vote counts (WANT + MUST SEE only) ────────────────────────────
  const memberVoteCounts = useMemo(() => {
    const counts = {};
    for (const voters of Object.values(perArtistRaw)) {
      for (const v of voters) {
        if (v.score > 0) counts[v.key] = (counts[v.key] || 0) + 1;
      }
    }
    return counts;
  }, [perArtistRaw]);

  // ── Popup votes: merge server data with local myVotes ────────────────────────
  const popupVotes = useMemo(() => {
    if (!popup) return [];
    const server = perArtistRaw[popup.id] || [];
    const myScore = myVotes[popup.id] || 0;
    const others  = server.filter((v) => v.key !== member.key);
    return [
      ...others,
      ...(myScore > 0 ? [{ key: member.key, displayName: memberDisplayName, score: myScore }] : []),
    ];
  }, [popup, perArtistRaw, myVotes, member.key, memberDisplayName]);

  return (
    <div className="app">
      {/* Toolbar: sticky header + day tabs */}
      <div className="toolbar">
        <Header
          groupId={groupId}
          member={member}
          groupName={groupName}
          setGroupName={setGroupName}
          memberDisplayName={memberDisplayName}
          setMemberDisplayName={setMemberDisplayName}
          mutedMembers={mutedMembers}
          setMutedMembers={setMutedMembers}
          onLeave={onLeave}
          onEditingChange={setHeaderEditing}
        />
        {!headerEditing && (
          <ShareCard
            groupId={groupId}
            memberKey={member.key}
            mutedMembers={mutedMembers}
            memberVoteCounts={memberVoteCounts}
            onMemberClick={(m) => setMemberPopup({ key: m.key, displayName: m.displayName })}
          />
        )}
      </div>

      {/* Legend + grid hidden while editing */}
      {!headerEditing && <Legend />}

      {/* All three day grids */}
      {!headerEditing && <ScheduleGrid
        myVotes={myVotes}
        perArtistRaw={perArtistRaw}
        memberKey={member.key}
        memberDisplayName={memberDisplayName}
        groupId={groupId}
        activeDay={activeDay}
        setActiveDay={setActiveDay}
        onVoteChange={handleVoteChange}
        onLongPress={handleLongPress}
      />}

      {/* Name prompt modal */}
      {showNamePrompt && (
        <NamePrompt
          groupId={groupId}
          member={member}
          memberDisplayName={memberDisplayName}
          groupName={isJoiner ? groupName : null}
          mutedMembers={mutedMembers}
          onDismiss={handleNameDismiss}
        />
      )}

      {/* Long-press artist popup */}
      {memberPopup && (
        <MemberLineupPopup
          memberKey={memberPopup.key}
          memberDisplayName={memberPopup.displayName}
          perArtistRaw={perArtistRaw}
          onClose={() => setMemberPopup(null)}
        />
      )}

      {popup && (
        <ArtistPopup
          artistId={popup.id}
          artistName={popup.artist}
          votes={popupVotes}
          memberKey={member.key}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
