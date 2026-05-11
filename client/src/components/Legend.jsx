import React, { useRef } from 'react';
import { computeWashData } from '../svgDefs.js';

function WashSvg({ setId, rotation, filterRef, p1, p2, returnOpacity }) {
  return (
    <svg className="wash" viewBox="0 0 100 100" preserveAspectRatio="none"
      aria-hidden="true" style={{ transform: `rotate(${rotation.toFixed(2)}deg)` }}>
      <path d={p1} fill="currentColor" opacity="0.85" filter={filterRef} />
      <path d={p2} fill="currentColor" opacity={returnOpacity} filter={filterRef} />
    </svg>
  );
}

function LegendPill({ variant, children, washId }) {
  // Stable wash data — same seed every time for consistent legend look
  const dataRef = useRef(null);
  if (!dataRef.current) dataRef.current = computeWashData(washId);
  const d = dataRef.current;

  return (
    <span className={`pill ${variant} pill-highlighted`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative', overflow: 'visible' }}>
      <WashSvg {...d} />
      {children}
    </span>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 13, height: 13, flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function MarkCheck() {
  return (
    <svg className="mark mark-check" viewBox="0 0 28 28" overflow="visible"
      aria-hidden="true" style={{ width: 14, height: 14, opacity: 1, position: 'static', transform: 'none', flexShrink: 0 }}>
      <use href="#mark-check" />
    </svg>
  );
}

export default function Legend() {
  return (
    <div className="legend">
      <span style={{ marginRight: 4 }}>Tap to cycle:</span>
      <span className="pill">Skip</span>

      <LegendPill variant="want" washId="legend-want">
        <MarkCheck />
        Want
      </LegendPill>

      <LegendPill variant="must" washId="legend-must">
        🔥 Must See
      </LegendPill>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
        <InfoIcon />
        Long press &#x2192; see who&#x2019;s in
      </span>
    </div>
  );
}
