import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import { DAYS } from '../../../shared/schedule.js';
import { api } from '../api.js';
import Header from '../components/Header.jsx';
import ShareCard from '../components/ShareCard.jsx';
import Legend from '../components/Legend.jsx';
import ScheduleGrid from '../components/ScheduleGrid.jsx';
import NamePrompt from '../components/NamePrompt.jsx';
import ArtistPopup from '../components/ArtistPopup.jsx';

export default function GroupView({ groupId, member, groupMeta, freshJoin, onLeave }) {
  const [myVotes,          setMyVotes]          = useState({});
  const [perArtistRaw,     setPerArtistRaw]     = useState({});
  const [mutedMembers,     setMutedMembers]     = useState(groupMeta?.members || []);
  const [groupName,        setGroupName]        = useState(groupMeta?.name || 'Napa Squad');
  const [memberDisplayName, setMemberDisplayName] = useState(member.displayName);
  const [activeDay,        setActiveDay]        = useState(DAYS[0].id);
  const [showNamePrompt,   setShowNamePrompt]   = useState(freshJoin);
  const [popup,            setPopup]            = useState(null); // { id, artist }

  const toolbarRef = useRef(null);

  // ── Toolbar height CSS var (for sticky legend) ──────────────────────────────
  useEffect(() => {
    if (!toolbarRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const h = Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
      document.documentElement.style.setProperty('--toolbar-h', `${h}px`);
    });
    obs.observe(toolbarRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Floating toolbar shadow on scroll ───────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      toolbarRef.current?.classList.toggle('floating', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
      <div className="toolbar" ref={toolbarRef}>
        <Header
          groupId={groupId}
          member={member}
          groupName={groupName}
          setGroupName={setGroupName}
          memberDisplayName={memberDisplayName}
          setMemberDisplayName={setMemberDisplayName}
          mutedMembers={mutedMembers}
          onLeave={onLeave}
        />
        <ShareCard
          groupId={groupId}
          memberKey={member.key}
          mutedMembers={mutedMembers}
        />
      </div>

      {/* Sticky legend */}
      <Legend />

      {/* All three day grids */}
      <ScheduleGrid
        myVotes={myVotes}
        perArtistRaw={perArtistRaw}
        memberKey={member.key}
        memberDisplayName={memberDisplayName}
        groupId={groupId}
        activeDay={activeDay}
        setActiveDay={setActiveDay}
        onVoteChange={handleVoteChange}
        onLongPress={handleLongPress}
      />

      {/* Name prompt modal */}
      {showNamePrompt && (
        <NamePrompt
          groupId={groupId}
          member={member}
          memberDisplayName={memberDisplayName}
          onDismiss={handleNameDismiss}
        />
      )}

      {/* Long-press artist popup */}
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
