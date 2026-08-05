import React from 'react';
import { Hammer, Zap, Cpu, Sparkles, Shield } from 'lucide-react';
import { PlanTier } from '@ipaas/shared-types';

interface EditionBadgeProps {
  edition: PlanTier | string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const EditionBadge: React.FC<EditionBadgeProps> = ({
  edition = 'Synapse',
  size = 'small',
  showLabel = true,
}) => {
  const normEdition = (edition || 'Synapse') as PlanTier;

  const editionConfig: Record<string, {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
  }> = {
    Forge: {
      label: 'Forge Edition',
      color: '#94a3b8', // Cinza Metálico / Slate
      bg: 'rgba(148, 163, 184, 0.15)',
      border: 'rgba(148, 163, 184, 0.3)',
      icon: <Hammer size={size === 'small' ? 11 : size === 'medium' ? 13 : 15} color="#94a3b8" />,
    },
    Kinex: {
      label: 'Kinex Edition',
      color: '#f97316', // Laranja Vibrante / Orange
      bg: 'rgba(249, 115, 22, 0.15)',
      border: 'rgba(249, 115, 22, 0.3)',
      icon: <Zap size={size === 'small' ? 11 : size === 'medium' ? 13 : 15} color="#f97316" />,
    },
    Axiom: {
      label: 'Axiom Edition',
      color: '#3b82f6', // Azul Clássico / Blue
      bg: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.3)',
      icon: <Cpu size={size === 'small' ? 11 : size === 'medium' ? 13 : 15} color="#3b82f6" />,
    },
    Synapse: {
      label: 'Synapse Edition',
      color: '#00f2fe', // Ciano Brilhante / Cyan
      bg: 'rgba(0, 242, 254, 0.15)',
      border: 'rgba(0, 242, 254, 0.3)',
      icon: <Sparkles size={size === 'small' ? 11 : size === 'medium' ? 13 : 15} color="#00f2fe" />,
    },
  };

  const config = editionConfig[normEdition] || editionConfig.Synapse;

  const fontSizes = {
    small: '10px',
    medium: '11px',
    large: '13px',
  };

  const paddings = {
    small: '2px 8px',
    medium: '4px 10px',
    large: '6px 14px',
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: paddings[size],
        borderRadius: '12px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontWeight: 800,
        fontSize: fontSizes[size],
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        boxShadow: `0 0 10px ${config.color}20`,
      }}
      title={`Nível de poder do motor: ${config.label}`}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};
