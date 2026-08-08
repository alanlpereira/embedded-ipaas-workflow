import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionsPage } from '../ExecutionsPage';
import { supabase } from '../../lib/supabase';
import { Profile } from '@ipaas/shared-types';

// Mock do módulo de internacionalização i18n
vi.mock('../../i18n/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'pt',
    t: {
      nav: { dashboard: 'Dashboard' },
    },
  }),
}));

// Profile falso para os testes
const mockProfile: Profile = {
  id: 'user-test-01',
  organization_id: 'org-test-01',
  email: 'test@synapse.com',
  full_name: 'Usuário Teste',
  role: 'Master',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Componente ExecutionsPage - Histórico de Execuções (Runner Logs)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // TESTE 1: Caminho Feliz (Happy Path)
  it('Teste 1 (Caminho Feliz): Renderiza a tabela com execuções do Supabase (running e completed)', async () => {
    const mockExecutionsData = [
      {
        id: 'exec-test-001',
        workflow_id: 'flow-crm-01',
        status: 'running',
        current_node_id: 'node-action-1',
        context_data: { user: 'cliente@empresa.com' },
        started_at: new Date().toISOString(),
        flowcharts: { name: 'Fluxo de CRM Marketing' },
      },
      {
        id: 'exec-test-002',
        workflow_id: 'flow-fin-02',
        status: 'completed',
        current_node_id: 'node-end-1',
        context_data: { approved: true },
        started_at: new Date(Date.now() - 3600000).toISOString(),
        completed_at: new Date(Date.now() - 3500000).toISOString(),
        flowcharts: { name: 'Aprovação de Pedidos Financeiro' },
      },
    ];

    // Mock do Supabase
    vi.spyOn(supabase, 'from').mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockExecutionsData,
          error: null,
        }),
      } as any;
    });

    // Mock do fetch REST API
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ executions: mockExecutionsData }),
    }));

    render(<ExecutionsPage currentProfile={mockProfile} />);

    // Verificar se as mensagens e nomes dos fluxos aparecem na tela
    await waitFor(() => {
      expect(screen.getByText('Fluxo de CRM Marketing')).toBeInTheDocument();
      expect(screen.getByText('Aprovação de Pedidos Financeiro')).toBeInTheDocument();
    });

    // Verificar os status das execuções na tabela
    expect(screen.getAllByText('Em Execução').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Concluído').length).toBeGreaterThan(0);
  });

  // TESTE 2: Tratamento de Erro (Error Handling)
  it('Teste 2 (Tratamento de Erro): Exibe mensagem amigável sem quebrar a aplicação em caso de erro 500/rede', async () => {
    // Mock do Supabase retornando Erro 500
    vi.spyOn(supabase, 'from').mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: '500 Internal Server Error: Conexão recusada' },
        }),
      } as any;
    });

    // Mock do fetch falhando
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network Failure')));

    render(<ExecutionsPage currentProfile={mockProfile} />);

    // Validar se a tela exibe a mensagem de erro amigável
    await waitFor(() => {
      expect(screen.getByText(/Não foi possível carregar o histórico/i)).toBeInTheDocument();
    });
  });

  // TESTE 3: Estado Vazio (Empty State)
  it('Teste 3 (Estado Vazio): Exibe estado "Nenhuma execução encontrada" quando o banco retorna array vazio', async () => {
    // Mock do Supabase retornando array vazio
    vi.spyOn(supabase, 'from').mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any;
    });

    // Mock do fetch retornando array vazio
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ executions: [] }),
    }));

    render(<ExecutionsPage currentProfile={mockProfile} />);

    // Validar mensagem de estado vazio
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma execução encontrada para os filtros selecionados/i)).toBeInTheDocument();
    });
  });
});
