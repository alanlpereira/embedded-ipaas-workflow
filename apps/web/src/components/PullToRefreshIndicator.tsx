import React from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  pullThreshold?: number;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  pullDistance,
  isRefreshing,
  pullThreshold = 65,
}) => {
  if (pullDistance <= 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / pullThreshold, 1);
  const isReadyToRelease = pullDistance >= pullThreshold;

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${Math.max(pullDistance, isRefreshing ? pullThreshold : 0)}px`,
        overflow: 'hidden',
        transition: isRefreshing ? 'height 0.2s ease' : 'none',
        background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        fontWeight: 700,
        color: isReadyToRelease || isRefreshing ? '#38bdf8' : '#94a3b8',
        transform: `scale(${0.8 + progress * 0.2})`,
        opacity: Math.min(progress * 1.2, 1),
        transition: 'all 0.15s ease',
      }}>
        {isRefreshing ? (
          <>
            <RefreshCw size={16} className="animate-spin" style={{ color: '#38bdf8' }} />
            <span>Atualizando dados do portal...</span>
          </>
        ) : isReadyToRelease ? (
          <>
            <RefreshCw size={16} style={{ color: '#38bdf8', transform: 'rotate(180deg)' }} />
            <span>Solte para atualizar agora</span>
          </>
        ) : (
          <>
            <ArrowDown
              size={16}
              style={{
                color: '#94a3b8',
                transform: `rotate(${progress * 180}deg)`,
                transition: 'transform 0.1s ease',
              }}
            />
            <span>Puxe para atualizar...</span>
          </>
        )}
      </div>
    </div>
  );
};
