import React, { useRef, useCallback, useState } from 'react';
import { computeWashData } from '../svgDefs.js';
import { api } from '../api.js';
import { toast } from '../toast.js';
import { SCHEDULE } from '../../../shared/schedule.js';

const GRID_START_MIN = 12 * 60;
const GRID_END_MIN   = 22 * 60;
const SLOT_MINS      = 15;
const TOTAL_SLOTS    = (GRID_END_MIN - GRID_START_MIN) / SLOT_MINS;
const STAGE_COL      = { prudential: 2, tmobile: 3, hellofresh: 4, northbay: 5 };

function minToSlot(min) { return Math.round((min - GRID_START_MIN) / SLOT_MINS); }
function fmtTimeShort(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}` : `${h12}:${String(m).padStart(2, '0')}`;
}
function scoreClass(score) {
  if (score >= 3) return 'vote-3';
  if (score >= 1) return 'vote-1';
  return 'vote-0';
}
function nextScore(cur) {
  if (cur === 3) return 0;
  if (cur === 1) return 3;
  return 1;
}

function WashSvg({ data }) {
  const { filterRef, rotation, returnOpacity, p1, p2 } = data;
  return (
    <svg className="wash" viewBox="0 0 100 100" preserveAspectRatio="none"
      aria-hidden="true" style={{ transform: `rotate(${rotation.toFixed(2)}deg)` }}>
      <path d={p1} fill="currentColor" opacity="0.85" filter={filterRef} />
      <path d={p2} fill="currentColor" opacity={returnOpacity} filter={filterRef} />
    </svg>
  );
}

function GroupVotesEl({ votes, myVote, memberKey, memberDisplayName }) {
  const serverOthers = votes.filter((v) => v.key !== memberKey);
  const allVoters = [
    ...serverOthers,
    ...(myVote > 0 ? [{ key: memberKey, displayName: memberDisplayName, score: myVote }] : []),
  ].filter((v) => v.score === 1 || v.score === 3);

  if (!allVoters.length) return null;

  const showNames = allVoters.length <= 2;
  const fName = (v) => v.displayName.split(' ')[0];
  const icon = (v) => v.score === 3 ? '🔥' : '✓';
  const cls  = (v) => v.score === 3 ? 'gv-fire' : 'gv-check';

  return (
    <div className="group-votes">
      {allVoters.map((v, i) => (
        <React.Fragment key={v.key ?? i}>
          <span className={cls(v)}>{icon(v)}</span>
          {showNames && <span className="gv-name">{fName(v)}</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

const ShowBlock = React.memo(function ShowBlock({
  s, myVote, groupVotes, memberKey, memberDisplayName,
  groupId, onVoteChange, onLongPress,
}) {
  const col = STAGE_COL[s.stageId];
  if (!col) return null;
  const startSlot = minToSlot(Math.max(s.startMin, GRID_START_MIN));
  const endSlot   = minToSlot(Math.min(s.endMin, GRID_END_MIN));
  if (startSlot >= TOTAL_SLOTS || endSlot <= 0) return null;

  // Stable wash data — created once per ShowBlock instance (useRef)
  const washDataRef = useRef(null);
  if (!washDataRef.current) washDataRef.current = computeWashData(s.id);

  const [saving, setSaving] = useState(false);

  const handleClick = useCallback(async () => {
    if (saving) return;
    // Clearing the ref here causes it to be recomputed on the very next render
    // (which is triggered by myVote changing). WS-only re-renders never clear
    // it, so peers' votes never disturb your brushstroke.
    washDataRef.current = null;
    const next = nextScore(myVote);
    onVoteChange(s.id, next); // optimistic
    setSaving(true);
    try {
      await api.setVote(groupId, memberKey, s.id, next);
    } catch (e) {
      onVoteChange(s.id, myVote); // revert
      toast(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }, [myVote, saving, s.id, groupId, memberKey, onVoteChange]);

  // Long-press
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);

  const startLongPress = useCallback((e) => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress(s.id, s.artist);
    }, 500);
  }, [s.id, s.artist, onLongPress]);

  const cancelLongPress = useCallback(() => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }, []);

  const handlePointerUp = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  return (
    <button
      className={`show-block ${scoreClass(myVote)}`}
      data-stage={s.stageId}
      data-id={s.id}
      style={{
        gridColumn: String(col),
        gridRow: `${startSlot + 2} / ${endSlot + 2}`,
      }}
      onClick={longPressFired.current ? undefined : handleClick}
      onPointerDown={startLongPress}
      onPointerMove={cancelLongPress}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelLongPress}
    >
      <span className="artist-name">{s.artist}</span>
      <span className="show-time">{fmtTimeShort(s.start)}&ndash;{fmtTimeShort(s.end)}</span>
      <WashSvg data={washDataRef.current} />
      <GroupVotesEl
        votes={groupVotes}
        myVote={myVote}
        memberKey={memberKey}
        memberDisplayName={memberDisplayName}
      />
    </button>
  );
}, (prev, next) => (
  // Only re-render if this show's vote or group picks changed
  prev.myVote      === next.myVote &&
  prev.groupVotes  === next.groupVotes &&
  prev.memberDisplayName === next.memberDisplayName
));

export { ShowBlock, TOTAL_SLOTS, STAGE_COL, minToSlot, GRID_START_MIN };
