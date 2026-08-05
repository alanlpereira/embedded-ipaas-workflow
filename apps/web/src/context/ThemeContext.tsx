import React, { createContext, useContext, useState, useEffect } from 'react';
import { PlanTier } from '@ipaas/shared-types';

export interface ExtendedOrganization {
  id: string;
  name: string;
  plan_tier: PlanTier;
  ai_tokens_limit: number;
  ai_tokens_used: number;
  custom_token_override?: number;
  logo_url?: string;
  primary_color?: string;
  created_at: string;
  updated_at: string;
}

interface ThemeContextType {
  currentOrg: ExtendedOrganization;
  availableOrgs: ExtendedOrganization[];
  primaryColor: string;
  logoUrl?: string;
  switchOrganization: (orgId: string) => void;
  updateOrgBranding: (branding: { primary_color?: string; logo_url?: string }) => void;
}

const defaultOrg: ExtendedOrganization = {
  id: 'org-alp-nexus',
  name: 'ALP Nexus Enterprise (Matriz)',
  plan_tier: 'Synapse',
  ai_tokens_limit: 1000000,
  ai_tokens_used: 142000,
  custom_token_override: 500000,
  primary_color: '#00f2fe',
  created_at: '2026-08-01',
  updated_at: '2026-08-04',
};

const mockOrganizations: ExtendedOrganization[] = [
  defaultOrg,
  {
    id: 'org-acme-corp',
    name: 'Acme Logistics Ltda',
    plan_tier: 'Axiom',
    ai_tokens_limit: 200000,
    ai_tokens_used: 48200,
    primary_color: '#3b82f6',
    created_at: '2026-08-02',
    updated_at: '2026-08-04',
  },
  {
    id: 'org-kinex-lab',
    name: 'Kinex Tech Solutions',
    plan_tier: 'Kinex',
    ai_tokens_limit: 50000,
    ai_tokens_used: 24000,
    primary_color: '#f97316',
    created_at: '2026-08-03',
    updated_at: '2026-08-04',
  },
  {
    id: 'org-forge-dev',
    name: 'Forge Starter Studio',
    plan_tier: 'Forge',
    ai_tokens_limit: 10000,
    ai_tokens_used: 4800,
    primary_color: '#94a3b8',
    created_at: '2026-08-04',
    updated_at: '2026-08-04',
  },
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentOrg, setCurrentOrg] = useState<ExtendedOrganization>(defaultOrg);
  const [availableOrgs, setAvailableOrgs] = useState<ExtendedOrganization[]>(mockOrganizations);

  const switchOrganization = (orgId: string) => {
    const found = availableOrgs.find((o) => o.id === orgId);
    if (found) {
      setCurrentOrg(found);
    }
  };

  const updateOrgBranding = (branding: { primary_color?: string; logo_url?: string }) => {
    setCurrentOrg((prev) => ({
      ...prev,
      primary_color: branding.primary_color || prev.primary_color,
      logo_url: branding.logo_url || prev.logo_url,
    }));
  };

  const primaryColor = currentOrg.primary_color || '#00f2fe';
  const logoUrl = currentOrg.logo_url;

  return (
    <ThemeContext.Provider
      value={{
        currentOrg,
        availableOrgs,
        primaryColor,
        logoUrl,
        switchOrganization,
        updateOrgBranding,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
