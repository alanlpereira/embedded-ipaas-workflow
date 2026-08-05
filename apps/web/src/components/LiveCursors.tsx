import React from 'react';
import { RemoteCursor } from '../collaboration/useYjsCollaboration';

interface LiveCursorsProps {
  cursors: RemoteCursor[];
}

export const LiveCursors: React.FC<LiveCursorsProps> = ({ cursors }) => {
  if (!cursors || cursors.length === 0) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 40 }}>
      {cursors.map((c) => (
        <div
          key={c.socketId}
          style={{
            position: 'absolute',
            left: `${c.x}px`,
            top: `${c.y}px`,
            transition: 'left 0.08s ease-out, top 0.08s ease-out',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '4px',
            pointerEvents: 'none',
          }}
        >
          {/* Seta do Ponteiro (Cursor SVG estilo Figma) */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={c.color || '#00f2fe'}
            stroke="#ffffff"
            strokeWidth="1.5"
            style={{
              filter: `drop-shadow(0 2px 6px ${c.color}66)`,
              transform: 'rotate(-25deg)',
            }}
          >
            <path d="M5.5 3.21a1 1 0 0 1 1.41-.18l12 9a1 1 0 0 1-.41 1.76l-5.6 1.4-1.4 5.6a1 1 0 0 1-1.76.41l-9-12a1 1 0 0 1 .76-1.99z" />
          </svg>

          {/* Badge do Nome/E-mail do Colaborador (Figma Pill) */}
          <div
            style={{
              background: c.color || '#00f2fe',
              color: '#0a0c10',
              fontWeight: 800,
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '12px',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              transform: 'translateY(12px)',
            }}
          >
            {c.userName || c.userEmail}
          </div>
        </div>
      ))}
    </div>
  );
};
