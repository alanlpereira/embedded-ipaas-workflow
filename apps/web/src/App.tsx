import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ReactFlowProvider, applyNodeChanges, applyEdgeChanges, addEdge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { PlayCircle, X } from 'lucide-react';
import { Navbar, ViewTab } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { NodePropertiesDrawer } from './components/NodePropertiesDrawer';
import { LoginPage } from './components/LoginPage';
import { DashboardPage } from './components/DashboardPage';
import { TeamPage } from './components/TeamPage';
import { TemplateGalleryPage, WorkflowTemplate } from './components/TemplateGalleryPage';
import { AuditPage, AuditLogItem } from './components/AuditPage';
import { AgencyPage } from './components/AgencyPage';
import { MasterAdminPage } from './components/MasterAdminPage';
import { TenantAdminPage } from './components/TenantAdminPage';
import { EmbedCanvasView } from './components/EmbedCanvasView';
import { EmbedModal } from './components/EmbedModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { ApprovalPage } from './components/ApprovalPage';
import { ImportModal } from './components/ImportModal';
import { AIOptimizationDrawer, AIOptimizationReport } from './components/AIOptimizationDrawer';
import { MobileNodeListView } from './components/MobileNodeListView';
import { ZeroFrictionDecidePage } from './components/ZeroFrictionDecidePage';
import { MagicDemoPage } from './components/MagicDemoPage';
import { IntegrationsVaultPage } from './components/IntegrationsVaultPage';
import { UserSettingsPage } from './components/UserSettingsPage';
import { ExecutionsPage } from './components/ExecutionsPage';
import { NodeConfigModal } from './components/NodeConfigModal';
import { Profile, WorkflowNode, WorkflowEdge, NodeType, Flowchart } from '@ipaas/shared-types';
import { supabase } from './lib/supabase';
import { getApiUrl } from './lib/api';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { ThemeProvider, useTheme, ExtendedOrganization } from './context/ThemeContext';
import { useYjsCollaboration } from './collaboration/useYjsCollaboration';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';

const sampleInitialFlowcharts: Flowchart[] = [
  {
    id: 'flow-sample-1',
    organization_id: 'org-alp-nexus',
    name: 'Integração Webhook & CRM B2B',
    description: 'Processa entrada de novos leads e valida role com notificação por e-mail.',
    nodes: [
      {
        id: 'node-trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          label: 'Gatilho Webhook B2B',
          type: 'trigger',
          description: 'Disparado ao receber evento POST /api/v1/webhook',
          config: { event: 'user.created', endpoint: '/api/v1/webhook', method: 'POST' },
        },
      },
      {
        id: 'node-code-1',
        type: 'code',
        position: { x: 250, y: 190 },
        data: {
          label: 'Código Customizado JS',
          type: 'code',
          description: 'Transforma e formata payload via Sandbox Node.js',
          config: {
            script: `return {\n  processed: true,\n  companyName: input.company_name || 'Acme Logistics Inc',\n  status: 'QUALIFIED',\n  timestamp: new Date().toISOString()\n};`,
          },
        },
      },
      {
        id: 'node-media-1',
        type: 'media',
        position: { x: 250, y: 350 },
        data: {
          label: 'Renderização de Vídeo Veo 3',
          type: 'media',
          description: 'Gera vídeo institucional via Google Veo 3 AI (Async Task)',
          config: {
            mediaApiEndpoint: 'https://api.veo3.google.ai/v1/render',
            renderPreset: 'veo3_cinematic_4k',
          },
        },
      },
      {
        id: 'node-decision-1',
        type: 'decision',
        position: { x: 275, y: 510 },
        data: {
          label: 'Validação de Role?',
          type: 'decision',
          description: 'Checa se a role do perfil é Master',
          config: { field: 'body.user.role', operator: 'equals', value: 'Master' },
        },
      },
      {
        id: 'node-approval-1',
        type: 'approval',
        position: { x: 50, y: 680 },
        data: {
          label: 'Aprovação do Gestor',
          type: 'approval',
          description: 'Solicita confirmação de alan.pereira@alp-nexus.com',
          config: { assignee: 'alan.pereira@alp-nexus.com', timeoutHours: 24 },
        },
      },
      {
        id: 'node-output-1',
        type: 'output',
        position: { x: 450, y: 680 },
        data: {
          label: 'Resposta Final JSON',
          type: 'output',
          description: 'Retorna payload HTTP 200 OK para o client',
          config: { format: 'JSON', statusCode: 200 },
        },
      },
    ] as any,
    edges: [
      { id: 'e1-2', source: 'node-trigger-1', target: 'node-code-1', animated: true, label: 'Payload HTTP', style: { stroke: 'var(--edge-stroke-color, #00f2fe)', strokeWidth: 10.5 } },
      { id: 'e2-media', source: 'node-code-1', target: 'node-media-1', animated: true, label: 'Async Render', style: { stroke: 'var(--edge-stroke-color, #00f2fe)', strokeWidth: 10.5 } },
      { id: 'e-media-decision', source: 'node-media-1', target: 'node-decision-1', animated: true, label: 'Video URL Callback', style: { stroke: 'var(--edge-stroke-color, #00f2fe)', strokeWidth: 10.5 } },
      { id: 'e3-true', source: 'node-decision-1', sourceHandle: 'true', target: 'node-output-1', animated: true, label: 'Sim (Master)', style: { stroke: '#34d399', strokeWidth: 10.5 } },
      { id: 'e3-false', source: 'node-decision-1', sourceHandle: 'false', target: 'node-approval-1', animated: true, label: 'Não (Aprovação)', style: { stroke: '#f43f5e', strokeWidth: 10.5 } },
      { id: 'e-loop-approval-action', source: 'node-approval-1', target: 'node-code-1', animated: true, label: 'Re-tentar (Loop Cíclico)', style: { stroke: '#f97316', strokeWidth: 10.5, strokeDasharray: '6,6' } },
    ] as any,
    is_published: true,
    created_at: new Date('2026-08-01').toISOString(),
    updated_at: new Date('2026-08-04').toISOString(),
  },
  {
    id: 'flow-sample-2',
    organization_id: 'org-alp-nexus',
    name: 'Fluxo de Boas-Vindas & Onboarding',
    description: 'Envia kit de boas-vindas para novas contas de clientes corporativos.',
    nodes: [] as any,
    edges: [] as any,
    is_published: false,
    created_at: new Date('2026-08-03').toISOString(),
    updated_at: new Date('2026-08-04').toISOString(),
  },
];

function WorkflowAppContent() {
  const { t } = useLanguage();
  const { switchOrganization } = useTheme();
  const { isMobilePortrait } = useResponsiveLayout();

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(() => ({
    id: 'user-master-id',
    organization_id: 'org-alp-nexus',
    email: 'alan.pereira@alp-nexus.com',
    full_name: 'Alan Pereira (Master)',
    role: 'Master',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const [flowcharts, setFlowcharts] = useState<Flowchart[]>(() => {
    try {
      const saved = localStorage.getItem('synapse_saved_flowcharts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return sampleInitialFlowcharts;
  });

  const [activeFlowchart, setActiveFlowchart] = useState<Flowchart | null>(() => {
    const list = flowcharts && flowcharts.length > 0 ? flowcharts : sampleInitialFlowcharts;
    return list[0];
  });

  const [currentTab, setCurrentTab] = useState<ViewTab>('editor');

  // Salvar automaticamente qualquer alteração de fluxogramas no LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('synapse_saved_flowcharts', JSON.stringify(flowcharts));
    } catch (e) {}
  }, [flowcharts]);

  const [nodes, setNodes] = useState<WorkflowNode[]>(() => (activeFlowchart?.nodes as any) || (sampleInitialFlowcharts[0].nodes as any));
  const [edges, setEdges] = useState<WorkflowEdge[]>(() => (activeFlowchart?.edges as any) || (sampleInitialFlowcharts[0].edges as any));
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  // Estado para forçar exibição do Canvas em modo Mobile Portrait
  const [forceMobileCanvasView, setForceMobileCanvasView] = useState(false);

  // Estados de Portabilidade & Otimização de IA
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAiOptimizationOpen, setIsAiOptimizationOpen] = useState(false);
  const [isAnalyzingEfficiency, setIsAnalyzingEfficiency] = useState(false);
  const [aiOptimizationReport, setAiOptimizationReport] = useState<AIOptimizationReport | null>(null);

  // Estado do Modo Debug no Canvas
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugLogId, setDebugLogId] = useState<string | null>(null);
  const [debugFailedNodeId, setDebugFailedNodeId] = useState<string | undefined>(undefined);
  const [debugErrorMessage, setDebugErrorMessage] = useState<string | undefined>(undefined);
  const [isRetrying, setIsRetrying] = useState(false);

  // Hook de Colaboração em Tempo Real (Yjs / WebSocket Sync Protocol)
  const handleRemoteStateChange = useCallback((remoteNodes: WorkflowNode[], remoteEdges: WorkflowEdge[]) => {
    setNodes(remoteNodes);
    setEdges(remoteEdges);
  }, []);

  const {
    remoteCursors,
    activeCollaborators,
    sendCursorPosition,
    broadcastStateChange,
  } = useYjsCollaboration({
    flowchartId: activeFlowchart?.id || '',
    userEmail: currentProfile?.email || 'anon@collaborator.com',
    userName: currentProfile?.full_name || currentProfile?.email?.split('@')[0] || 'Colaborador',
    nodes,
    edges,
    onRemoteStateChange: handleRemoteStateChange,
  });

  // Verificação de rotas públicas isoladas (/demo, /decide/:token, /embed/:flowId e /approve/:token)
  const isDemoPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/demo');
  const isDecidePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/decide/');
  const isEmbedPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/embed/');
  const isApprovePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/approve/');

  const decideToken = isDecidePath ? window.location.pathname.replace('/decide/', '') : null;
  const embedFlowId = isEmbedPath ? window.location.pathname.replace('/embed/', '') : null;
  const approvalToken = isApprovePath ? window.location.pathname.replace('/approve/', '') : null;

  const canEdit = currentProfile?.role === 'Master' || currentProfile?.role === 'Admin';

  // Verificar sessão inicial no Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setCurrentProfile(data as Profile);
          });
      }
    });
  }, []);

  // Recuperação e sincronização automática de fluxogramas salvos no Supabase
  useEffect(() => {
    async function restoreSavedWorkflows() {
      try {
        // Tentar tabela 'workflows'
        const { data: workflowsData } = await supabase.from('workflows').select('*');
        // Tentar tabela 'flowcharts'
        const { data: flowchartsData } = await supabase.from('flowcharts').select('*');

        const combined = [...(workflowsData || []), ...(flowchartsData || [])];
        if (combined.length > 0) {
          const restored: Flowchart[] = combined.map((w: any) => ({
            id: w.id,
            organization_id: w.organization_id || 'org-alp-nexus',
            folder_id: w.folder_id,
            name: w.name || 'Fluxo sem Nome',
            description: w.description || '',
            nodes: typeof w.nodes === 'string' ? JSON.parse(w.nodes) : (w.nodes || []),
            edges: typeof w.edges === 'string' ? JSON.parse(w.edges) : (w.edges || []),
            is_published: w.is_published || false,
            created_at: w.created_at || new Date().toISOString(),
            updated_at: w.updated_at || new Date().toISOString(),
          }));

          setFlowcharts((prev) => {
            const map = new Map<string, Flowchart>();
            prev.forEach((f) => map.set(f.id, f));
            restored.forEach((f) => map.set(f.id, f));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn('⚠️ [RESTORATION WARN] Falha na busca no Supabase:', err);
      }
    }

    restoreSavedWorkflows();
  }, []);

  const handleOpenFlowchart = (flow: Flowchart) => {
    setActiveFlowchart(flow);
    setNodes((flow.nodes as any) || []);
    setEdges((flow.edges as any) || []);
    setSelectedNode(null);
    setIsDebugMode(false);
    setForceMobileCanvasView(false);
    setCurrentTab('editor');
  };

  const handleInspectDebugLog = (log: AuditLogItem) => {
    const targetFlow = flowcharts.find((f) => f.id === log.flowchart_id) || flowcharts[0];
    setActiveFlowchart(targetFlow);
    setNodes((targetFlow.nodes as any) || []);
    setEdges((targetFlow.edges as any) || []);

    setIsDebugMode(true);
    setDebugLogId(log.id);
    setDebugFailedNodeId(log.failed_node_id || 'node-action-1');
    setDebugErrorMessage(log.error_message || 'HTTP 500 API Gateway Timeout');
    setSelectedNode(null);
    setCurrentTab('editor');
  };

  const handleRetryFromFailedNode = async () => {
    if (!debugLogId) return;
    setIsRetrying(true);

    try {
      const response = await fetch(`/api/v1/audit/logs/${debugLogId}/retry`, {
        method: 'POST',
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao reprocessar nó');

      alert(t.messages.retrySuccess);
      setIsDebugMode(false);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  // Exportar Fluxograma em Formato JSON Estruturado
  const handleExportJson = () => {
    const exportData = {
      name: activeFlowchart?.name || 'Fluxograma Exportado',
      description: activeFlowchart?.description || '',
      exported_at: new Date().toISOString(),
      nodes,
      edges,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeFlowchart?.name || 'fluxograma').toLowerCase().replace(/\s+/g, '_')}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar e Renderizar Fluxograma a partir de um JSON Válido
  const handleImportSuccess = (importedNodes: WorkflowNode[], importedEdges: WorkflowEdge[], name?: string) => {
    setNodes(importedNodes);
    setEdges(importedEdges);
    broadcastStateChange(importedNodes, importedEdges);

    if (activeFlowchart) {
      const updated = {
        ...activeFlowchart,
        name: name || activeFlowchart.name,
        nodes: importedNodes as any,
        edges: importedEdges as any,
      };
      setActiveFlowchart(updated);
    }

    alert('Fluxograma importado e renderizado com sucesso no canvas!');
  };

  // Analisar Eficiência do Arquitetura via Gemini LLM
  const handleAnalyzeEfficiency = async () => {
    setIsAnalyzingEfficiency(true);

    try {
      const response = await fetch(getApiUrl('/api/v1/ai/optimize-flow'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowchart: {
            name: activeFlowchart?.name || 'Fluxo Atual',
            nodes,
            edges,
          },
        }),
      });

      const report: AIOptimizationReport = await response.json();
      if (!response.ok) throw new Error((report as any).error || 'Falha ao analisar o fluxograma.');

      setAiOptimizationReport(report);
      setIsAiOptimizationOpen(true);
    } catch (err: any) {
      alert(`Erro na Análise de Eficiência por IA: ${err.message}`);
    } finally {
      setIsAnalyzingEfficiency(false);
    }
  };

  // Aplicar Otimizações Recomendadas pela IA no Canvas
  const handleApplyImprovements = (optimizedNodes: WorkflowNode[], optimizedEdges: WorkflowEdge[]) => {
    setNodes(optimizedNodes);
    setEdges(optimizedEdges);
    broadcastStateChange(optimizedNodes, optimizedEdges);
    alert('Melhorias de arquitetura aplicadas com sucesso no canvas!');
  };
  // Alternar Organização Ativa (Impersonate)
  const handleImpersonateSuccess = (org: ExtendedOrganization) => {
    if (currentProfile) {
      setCurrentProfile({ ...currentProfile, organization_id: org.id });
    }
    setCurrentTab('dashboard');
  };

  const handleCreateFlowchart = (folderId?: string) => {
    if (!canEdit) {
      alert(t.messages.accessDenied);
      return;
    }

    const newFlow: Flowchart = {
      id: `flow-${Date.now()}`,
      organization_id: currentProfile?.organization_id || 'org-alp-nexus',
      folder_id: folderId || undefined,
      name: `Novo Fluxograma #${flowcharts.length + 1}`,
      description: 'Descrição do novo processo automatizado.',
      nodes: [
        {
          id: `node-trigger-${Date.now()}`,
          type: 'trigger',
          position: { x: 250, y: 100 },
          data: {
            label: 'Gatilho Inicial',
            type: 'trigger',
            description: 'Início do fluxo',
          },
        },
      ] as any,
      edges: [] as any,
      is_published: false,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setFlowcharts((prev) => [newFlow, ...prev]);
    handleOpenFlowchart(newFlow);
  };

  const handleUpdateFlowchartById = async (id: string, name: string, description?: string) => {
    // 1. Atualizar estado local no React imediatamente
    setActiveFlowchart((prev) => (prev && prev.id === id ? { ...prev, name, description } : prev));
    setFlowcharts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name, description, updated_at: new Date().toISOString() } : f))
    );

    // 2. Persistir UPDATE na tabela 'workflows' do Supabase
    try {
      await supabase
        .from('workflows')
        .update({ name, description, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.warn('⚠️ [SUPABASE UPDATE WARN] Falha ao atualizar tabela workflows:', err);
    }

    // 3. Persistir na rota backend local
    try {
      await fetch(`/api/v1/flowcharts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
    } catch (err) {}
  };

  const handleUpdateFlowchartMetadata = async (name: string, description?: string) => {
    if (!activeFlowchart) return;
    await handleUpdateFlowchartById(activeFlowchart.id, name, description);
  };

  const handleMoveFlowchart = (flowchartId: string, targetFolderId: string) => {
    setFlowcharts((prev) =>
      prev.map((f) => (f.id === flowchartId ? { ...f, folder_id: targetFolderId, updated_at: new Date().toISOString() } : f))
    );
  };

  const handleToggleFlowchartActive = async (id: string, isActive: boolean) => {
    setFlowcharts((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, is_published: isActive, is_active: isActive, updated_at: new Date().toISOString() }
          : f
      )
    );

    if (activeFlowchart && activeFlowchart.id === id) {
      setActiveFlowchart((prev) => (prev ? { ...prev, is_published: isActive, is_active: isActive } : prev));
    }

    try {
      await supabase
        .from('workflows')
        .update({ is_published: isActive, is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.warn('⚠️ [SUPABASE UPDATE WARN] Falha ao atualizar status de ativação do fluxo:', err);
    }

    try {
      await fetch(`/api/v1/flowcharts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: isActive, is_active: isActive }),
      });
    } catch (err) {}
  };

  const handleUpdateProfile = (updatedFields: Partial<Profile>) => {
    if (currentProfile) {
      setCurrentProfile((prev) => (prev ? { ...prev, ...updatedFields } : prev));
    }
  };

  const handleUseTemplate = async (template: WorkflowTemplate) => {
    if (!canEdit) {
      alert(t.messages.accessDenied);
      return;
    }

    try {
      const response = await fetch(`/api/templates/${template.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      const clonedFlow: Flowchart = data.flowchart ? { ...data.flowchart, is_published: false, is_active: false } : {
        id: `flow-clone-${Date.now()}`,
        organization_id: currentProfile?.organization_id || 'org-alp-nexus',
        name: `${template.name} (Cópia)`,
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
        is_published: false,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setFlowcharts((prev) => [clonedFlow, ...prev]);
      handleOpenFlowchart(clonedFlow);
      alert(t.messages.templateCloned);
    } catch (err: any) {
      const clonedFlow: Flowchart = {
        id: `flow-clone-${Date.now()}`,
        organization_id: currentProfile?.organization_id || 'org-alp-nexus',
        name: `${template.name} (Cópia)`,
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
        is_published: false,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setFlowcharts((prev) => [clonedFlow, ...prev]);
      handleOpenFlowchart(clonedFlow);
      alert(t.messages.templateCloned);
    }
  };

  const handleDeleteFlowchart = (id: string) => {
    if (!canEdit) {
      alert(t.messages.accessDenied);
      return;
    }

    setFlowcharts((prev) => prev.filter((f) => f.id !== id));
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!canEdit) return;
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds as any) as any;
        const finalNodes = updated.map((node: any) => {
          const isPosChange = changes.some((c) => c.type === 'position' && (c as any).id === node.id);
          if (isPosChange) {
            return {
              ...node,
              position: {
                x: Math.round(node.position.x / 20) * 20,
                y: Math.round(node.position.y / 20) * 20,
              },
            };
          }
          return node;
        });
        broadcastStateChange(finalNodes, edges);
        return finalNodes;
      });
    },
    [canEdit, edges, broadcastStateChange]
  );

  const handleAlignAllNodes = useCallback(() => {
    setNodes((nds) => {
      const aligned = nds.map((n) => ({
        ...n,
        position: {
          x: Math.round(n.position.x / 20) * 20,
          y: Math.round(n.position.y / 20) * 20,
        },
      }));
      broadcastStateChange(aligned, edges);
      return aligned;
    });
  }, [edges, broadcastStateChange]);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!canEdit) return;
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds as any) as any;
        broadcastStateChange(nodes, updated);
        return updated;
      });
    },
    [canEdit, nodes, broadcastStateChange]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      if (!canEdit) return;
      setEdges((eds) => {
        const updated = eds.filter((e) => e.id !== edgeId);
        broadcastStateChange(nodes, updated);
        return updated;
      });
    },
    [canEdit, nodes, broadcastStateChange]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canEdit) return;
      setEdges((eds) => {
        const updated = addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: 'var(--edge-stroke-color, #00f2fe)', strokeWidth: 10.5 },
          } as any,
          eds as any
        ) as any;
        broadcastStateChange(nodes, updated);
        return updated;
      });
    },
    [canEdit, nodes, broadcastStateChange]
  );

  const handleNodeClick = (_event: React.MouseEvent, node: WorkflowNode) => {
    setSelectedNode(node);
  };

  const handlePaneClick = () => {
    setSelectedNode(null);
  };

  const handleAddNodeAtPosition = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      if (!canEdit) {
        alert(t.messages.accessDenied);
        return;
      }

      const titles: Record<NodeType, string> = {
        trigger: 'Novo Gatilho / Input',
        schedule: 'Gatilho de Agendamento',
        email_trigger: 'Gatilho de E-mail',
        email_approval: 'Aprovação por E-mail',
        whatsapp: 'Ação WhatsApp',
        teams: 'Ação MS Teams',
        http: 'Requisição HTTP / Webhook',
        action: 'Nova Ação / Processo',
        decision: 'Nova Decisão',
        approval: 'Nova Aprovação',
        jump: 'Conector de Salto',
        end: 'Fim de Fluxo (Término)',
        output: 'Nova Saída / Output',
        code: 'Código Customizado JS',
        media: 'Processamento de Mídia / Assíncrono',
      };

      // 4. GARANTE ID ÚNICO E POSITION VÁLIDO NO ONDROP
      const uniqueId = `node-${type}-${crypto.randomUUID()}`;
      const validPosition = {
        x: typeof position?.x === 'number' && !isNaN(position.x) ? position.x : 250,
        y: typeof position?.y === 'number' && !isNaN(position.y) ? position.y : 150,
      };

      const defaultScheduleConfig = {
        recurrenceType: 'daily' as const,
        time: '09:00',
        daysOfWeek: [1, 2, 3, 4, 5],
        dayOfMonth: 1,
        cronExpression: '0 9 * * *',
      };

      const defaultInboundEmail = `flow-${uniqueId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 16)}@inbound.synapse.com`;

      const defaultEmailConfig = {
        mode: 'synapse_inbound' as const,
        inboundEmail: defaultInboundEmail,
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapUser: '',
        imapPass: '',
        filterSubject: '',
        filterFrom: '',
        onlyWithAttachments: false,
      };

      const defaultEmailOutputs = [
        { key: 'email.from', label: 'Remetente (email.from)', type: 'string' },
        { key: 'email.subject', label: 'Assunto (email.subject)', type: 'string' },
        { key: 'email.body', label: 'Corpo do E-mail (email.body)', type: 'string' },
        { key: 'email.attachments', label: 'Lista de Anexos (email.attachments)', type: 'array' },
      ];

      const defaultApprovalConfig = {
        recipients: 'diretoria@empresa.com, {{email.from}}',
        subject: 'Aprovação Solicitada: Reembolso de Despesas #1024',
        message: 'Olá,\n\nUm novo processo requer sua aprovação. Por favor, revise as informações e clique em um dos botões para prosseguir com o fluxo.',
      };

      const defaultApprovalOutputs = [
        { key: 'approval.status', label: 'Status (approval.status)', type: 'string' },
        { key: 'approval.responder_email', label: 'E-mail Aprovador (approval.responder_email)', type: 'string' },
        { key: 'approval.timestamp', label: 'Data/Hora (approval.timestamp)', type: 'string' },
      ];

      const defaultJumpConfig = {
        jumpId: '1',
      };

      const defaultWhatsAppConfig = {
        destinationNumber: '+5511999998888',
        message: 'Olá {{email.from}}, seu pedido foi processado com sucesso!',
      };

      const defaultTeamsConfig = {
        webhookUrl: 'https://outlook.office.com/webhook/v2/...',
        cardMessage: '🔔 Alerta de Fluxo Synapse\n\nUm evento foi disparado pelo usuário {{email.from}}.',
      };

      const newNode: WorkflowNode = {
        id: uniqueId,
        type,
        position: validPosition,
        data: {
          label: titles[type] || 'Novo Nó',
          type,
          description:
            type === 'end'
              ? 'Encerramento definitivo do fluxo'
              : type === 'jump'
              ? 'Salto / Recomeço #1'
              : type === 'whatsapp'
              ? 'Para: +5511999998888'
              : type === 'teams'
              ? 'Canal MS Teams'
              : type === 'email_approval'
              ? 'Para: diretoria@empresa.com'
              : type === 'email_trigger'
              ? `Inbound: ${defaultInboundEmail}`
              : type === 'schedule'
              ? 'Diário às 09:00'
              : type === 'code'
              ? 'Executa script JS na Sandbox Node.js'
              : type === 'media'
              ? 'Render de vídeo assíncrono (Veo 3 / Mobile Editing)'
              : `Configuração do nó ${type}`,
          cronExpression: type === 'schedule' ? '0 9 * * *' : undefined,
          scheduleConfig: type === 'schedule' ? defaultScheduleConfig : undefined,
          emailConfig: type === 'email_trigger' ? defaultEmailConfig : undefined,
          approvalConfig: type === 'email_approval' ? defaultApprovalConfig : undefined,
          jumpConfig: type === 'jump' ? defaultJumpConfig : undefined,
          whatsappConfig: type === 'whatsapp' ? defaultWhatsAppConfig : undefined,
          teamsConfig: type === 'teams' ? defaultTeamsConfig : undefined,
          settings:
            type === 'whatsapp'
              ? defaultWhatsAppConfig
              : type === 'teams'
              ? defaultTeamsConfig
              : undefined,
          outputs:
            type === 'email_approval'
              ? defaultApprovalOutputs
              : type === 'email_trigger'
              ? defaultEmailOutputs
              : undefined,
          config:
            type === 'code'
              ? { script: `return {\n  processed: true,\n  timestamp: new Date().toISOString()\n};` }
              : type === 'media'
              ? { mediaApiEndpoint: 'https://api.veo3.google.ai/v1/render', renderPreset: 'veo3_cinematic_4k' }
              : {},
        },
      };

      setNodes((prev) => {
        const updated = [...prev, newNode];
        broadcastStateChange(updated, edges);
        return updated;
      });
      setSelectedNode(newNode);
    },
    [canEdit, edges, broadcastStateChange, t.messages.accessDenied]
  );

  const [lastInteractionPos, setLastInteractionPos] = useState<{ x: number; y: number }>({ x: 280, y: 160 });

  const handleAddNodeFromSidebar = useCallback(
    (type: NodeType) => {
      const posX = Math.round(lastInteractionPos.x / 20) * 20;
      const posY = Math.round(lastInteractionPos.y / 20) * 20;
      handleAddNodeAtPosition(type, { x: Math.max(20, posX), y: Math.max(20, posY) });
      setLastInteractionPos({ x: posX + 240, y: posY });
    },
    [lastInteractionPos, handleAddNodeAtPosition]
  );

  const handleToggleSwapOutputs = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const updated = nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              swapOutputs: !node.data.swapOutputs,
            },
          };
        }
        return node;
      });
      broadcastStateChange(updated, edges);
      return updated;
    });
  }, [edges, broadcastStateChange]);

  const canvasNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onToggleSwapOutputs: handleToggleSwapOutputs,
      },
    }));
  }, [nodes, handleToggleSwapOutputs]);

  const handleUpdateNode = (updatedNode: WorkflowNode) => {
    if (!canEdit) return;
    const activeNodeId = updatedNode.id;
    setNodes((nds) => {
      const updated = nds.map((node) =>
        node.id === activeNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...updatedNode.data,
              },
            }
          : node
      );
      broadcastStateChange(updated, edges);
      return updated;
    });
    setSelectedNode(null);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!canEdit) return;
    setNodes((prev) => {
      const updatedNodes = prev.filter((n) => n.id !== nodeId);
      setEdges((prevEds) => {
        const updatedEdges = prevEds.filter((e) => e.source !== nodeId && e.target !== nodeId);
        broadcastStateChange(updatedNodes, updatedEdges);
        return updatedEdges;
      });
      return updatedNodes;
    });
    setSelectedNode(null);
  };

  const handleSaveFlowchart = async () => {
    if (!canEdit || !activeFlowchart) return;
    setIsSaving(true);

    try {
      // 1. Sanitizar e estruturar explicitamente o array de edges com source e target
      const cleanedEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
        label: e.label || '',
        animated: e.animated ?? true,
        style: e.style || {},
      }));

      const updatedFlow: Flowchart = {
        ...activeFlowchart,
        nodes: nodes as any,
        edges: cleanedEdges as any,
        updated_at: new Date().toISOString(),
      };

      setFlowcharts((prev) => prev.map((f) => (f.id === activeFlowchart.id ? updatedFlow : f)));
      setActiveFlowchart(updatedFlow);

      const payload = {
        id: activeFlowchart.id,
        organization_id: activeFlowchart.organization_id || 'org-alp-nexus',
        name: activeFlowchart.name,
        description: activeFlowchart.description || '',
        nodes: nodes as any,
        edges: cleanedEdges as any,
        is_published: activeFlowchart.is_published ?? false,
        is_active: activeFlowchart.is_active ?? false,
        updated_at: updatedFlow.updated_at,
      };

      // 2. Persistir nas tabelas 'workflows' e 'flowcharts' do Supabase
      const { error: wfErr } = await supabase.from('workflows').upsert(payload);
      if (wfErr) {
        console.warn('⚠️ [SUPABASE WORKFLOWS UPSERT WARN]:', wfErr.message);
      }

      const { error: fcErr } = await supabase.from('flowcharts').upsert(payload);
      if (fcErr) {
        console.warn('⚠️ [SUPABASE FLOWCHARTS UPSERT WARN]:', fcErr.message);
      }

      // 3. Persistir nos endpoints REST do servidor Express
      await fetch(getApiUrl(`/api/flowcharts/${activeFlowchart.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: nodes as any, edges: cleanedEdges as any }),
      }).catch(() => {});

      await fetch(getApiUrl(`/api/v1/flowcharts/${activeFlowchart.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: nodes as any, edges: cleanedEdges as any }),
      }).catch(() => {});

      alert(t.messages.flowSaved);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const [isRunningNow, setIsRunningNow] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleRunNow = async () => {
    if (!activeFlowchart) return;
    setIsRunningNow(true);

    try {
      // A) Garantir que o fluxo atual está salvo na tabela 'workflows' (nodes e edges com source e target)
      const cleanedEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
        label: e.label || '',
        animated: e.animated ?? true,
        style: e.style || {},
      }));

      const updatedFlow: Flowchart = {
        ...activeFlowchart,
        nodes: nodes as any,
        edges: cleanedEdges as any,
        updated_at: new Date().toISOString(),
      };

      setFlowcharts((prev) => prev.map((f) => (f.id === activeFlowchart.id ? updatedFlow : f)));
      setActiveFlowchart(updatedFlow);

      const payload = {
        id: activeFlowchart.id,
        organization_id: activeFlowchart.organization_id || 'org-alp-nexus',
        name: activeFlowchart.name,
        description: activeFlowchart.description || '',
        nodes: nodes as any,
        edges: cleanedEdges as any,
        is_published: activeFlowchart.is_published ?? false,
        is_active: activeFlowchart.is_active ?? false,
        updated_at: updatedFlow.updated_at,
      };

      // Gravação garantida no Supabase workflows e flowcharts
      const { error: wfErr } = await supabase.from('workflows').upsert(payload);
      if (wfErr) console.warn('⚠️ workflows upsert:', wfErr.message);

      const { error: fcErr } = await supabase.from('flowcharts').upsert(payload);
      if (fcErr) console.warn('⚠️ flowcharts upsert:', fcErr.message);

      await fetch(getApiUrl(`/api/flowcharts/${activeFlowchart.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: nodes as any, edges: cleanedEdges as any }),
      }).catch(() => {});

      // B) Descobrir qual é o ID do primeiro nó (ex: ScheduleNode, EmailTriggerNode ou nodes[0])
      const startNode = nodes.find((n) => ['schedule', 'email_trigger', 'trigger'].includes(n.type)) || nodes[0];
      const firstNodeId = startNode ? startNode.id : 'node-start';
      const executionId = `exec-run-${Date.now()}`;

      const executionPayload = {
        id: executionId,
        workflow_id: activeFlowchart.id,
        status: 'running',
        current_node_id: firstNodeId,
        context_data: {
          manual_trigger: true,
          triggered_by: currentProfile?.email || 'Usuário IPaaS',
          triggered_at: new Date().toISOString(),
        },
        started_at: new Date().toISOString(),
      };

      // C) Fazer INSERT na tabela 'flow_executions' (com fallback para REST API backend em caso de RLS/sem credenciais)
      console.log('🚀 [RUN NOW DIAGNOSTIC] Disparando execução ID:', executionId, 'Payload:', executionPayload);
      const { error: insertErr } = await supabase.from('flow_executions').insert([executionPayload]);

      if (insertErr) {
        console.warn('⚠️ [RUN NOW WARN] Insert Supabase falhou (RLS ou sem chave), utilizando fallback REST API:', insertErr.message || insertErr);
        await fetch(getApiUrl('/api/v1/executions'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: executionId,
            workflow_id: activeFlowchart.id,
            workflow_name: activeFlowchart.name,
            status: 'running',
            current_node_id: firstNodeId,
            context_data: executionPayload.context_data,
          }),
        }).catch((err) => {
          console.warn('⚠️ [RUN NOW WARN] Fallback REST POST /executions falhou:', err);
        });
      } else {
        console.log('✅ [RUN NOW SUCCESS] Execução registrada com sucesso na tabela flow_executions do Supabase!');
      }

      // D) Disparar o Worker Engine de Traversal do Grafo
      const runRes = await fetch(getApiUrl(`/api/v1/executions/${executionId}/run`), { method: 'POST' }).catch((err) => {
        console.warn('⚠️ [RUN NOW WARN] Rota /run da API retornou erro:', err);
        return null;
      });

      if (runRes && runRes.ok) {
        const runData = await runRes.json();
        console.log('⚡ [RUN NOW ENGINE RESULT] Grafo de Nós processado:', runData);
      }

      // Se houver VITE_SUPABASE_URL configurada, acionar a Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl && !supabaseUrl.includes('your-supabase-project')) {
        const edgeWorkerUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/workflow-worker`;
        fetch(edgeWorkerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
          },
          body: JSON.stringify({ execution_id: executionId }),
        }).catch((err) => {
          console.warn('⚠️ [RUN NOW WARN] Disparo da Edge Function falhou:', err);
        });
      }

      // 4. Exibir Toast/Snackbar de sucesso ao iniciar o fluxo
      setToastMessage(`🚀 Fluxo "${activeFlowchart.name}" disparado com sucesso! Acompanhe o progresso em tempo real na aba Execuções.`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      alert(`⚠️ Erro ao executar fluxo: ${err.message}`);
    } finally {
      setIsRunningNow(false);
    }
  };

  const handleRestoreVersion = async (restoredNodes: any[], restoredEdges: any[]) => {
    setNodes(restoredNodes);
    setEdges(restoredEdges);
    broadcastStateChange(restoredNodes, restoredEdges);
    setSelectedNode(null);
  };

  const handleFlowGeneratedByAI = (newNodes: WorkflowNode[], newEdges: WorkflowEdge[]) => {
    const safeNodes = Array.isArray(newNodes) ? newNodes : [];
    const safeEdges = Array.isArray(newEdges) ? newEdges : [];

    if (safeNodes.length === 0) {
      alert('A IA não conseguiu gerar um fluxo válido. Tente detalhar mais o seu pedido.');
      return;
    }

    setNodes(safeNodes);
    setEdges(safeEdges);
    broadcastStateChange(safeNodes, safeEdges);
    alert(t.messages.flowGenerated);
  };

  // Se a rota for /demo?token=XYZ, renderiza a Página Pública de Autenticação Mágica Silenciosa
  if (isDemoPath) {
    return <MagicDemoPage onLoginSuccess={(profile) => {
      setCurrentProfile(profile);
      window.history.replaceState({}, document.title, '/');
    }} />;
  }

  // Se a rota for /decide/:token, renderiza a Página Pública Mobile-First Zero Fricção de Decisão
  if (isDecidePath && decideToken) {
    return <ZeroFrictionDecidePage token={decideToken} />;
  }

  // Se a rota for /approve/:token, renderiza a Página Pública de Aprovação
  if (isApprovePath && approvalToken) {
    return <ApprovalPage token={approvalToken} />;
  }

  // Se a rota for /embed/:flowId, renderiza APENAS o canvas em modo de leitura
  if (isEmbedPath) {
    const targetFlow = flowcharts.find((f) => f.id === embedFlowId) || flowcharts[0];
    return <EmbedCanvasView nodes={(targetFlow.nodes as any) || []} edges={(targetFlow.edges as any) || []} />;
  }

  // Se não estiver logado, exibe a página de Login
  if (!currentProfile) {
    return <LoginPage onLoginSuccess={(profile) => setCurrentProfile(profile)} />;
  }

  // Determinar se deve renderizar a Visão Linear Mobile em vez do Canvas do React Flow
  const shouldRenderMobileLinearView = isMobilePortrait && !forceMobileCanvasView;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Navbar
        currentProfile={currentProfile}
        flowchartName={activeFlowchart?.name || 'Editor de Fluxo'}
        flowchartDescription={activeFlowchart?.description || ''}
        onUpdateFlowchartMetadata={handleUpdateFlowchartMetadata}
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab)}
        onSave={handleSaveFlowchart}
        isSaving={isSaving}
        onRunNow={handleRunNow}
        isRunningNow={isRunningNow}
        onLogout={() => setCurrentProfile(null)}
        onOpenEmbedModal={() => setIsEmbedModalOpen(true)}
        onOpenVersionModal={() => setIsVersionModalOpen(true)}
        onExportJson={handleExportJson}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onAnalyzeEfficiency={handleAnalyzeEfficiency}
        isAnalyzingEfficiency={isAnalyzingEfficiency}
        collaborators={activeCollaborators}
      />

      {/* Toast / Snackbar Notification ao Disparar Execução */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '64px',
          right: '24px',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 700,
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <PlayCircle size={18} fill="#ffffff" color="#059669" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '10px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Renderização condicional de abas */}
      {currentTab === 'dashboard' && (
        <DashboardPage
          currentProfile={currentProfile}
          flowcharts={flowcharts}
          onOpenFlowchart={handleOpenFlowchart}
          onCreateFlowchart={handleCreateFlowchart}
          onDeleteFlowchart={handleDeleteFlowchart}
          onMoveFlowchart={handleMoveFlowchart}
          onUpdateFlowchart={handleUpdateFlowchartById}
          onToggleFlowchartActive={handleToggleFlowchartActive}
        />
      )}

      {currentTab === 'templates' && (
        <TemplateGalleryPage
          currentProfile={currentProfile}
          onUseTemplate={handleUseTemplate}
        />
      )}

      {currentTab === 'executions' && (
        <ExecutionsPage currentProfile={currentProfile!} />
      )}

      {currentTab === 'audit' && (
        <AuditPage
          currentProfile={currentProfile}
          onInspectDebugLog={handleInspectDebugLog}
        />
      )}

      {currentTab === 'agency' && (
        <AgencyPage
          currentProfile={currentProfile}
          onImpersonateSuccess={handleImpersonateSuccess}
        />
      )}

      {currentTab === 'masterAdmin' && (
        <MasterAdminPage
          currentProfile={currentProfile}
        />
      )}

      {currentTab === 'tenantAdmin' && (
        <TenantAdminPage
          currentProfile={currentProfile}
        />
      )}

      {currentTab === 'team' && (
        <TeamPage currentProfile={currentProfile} />
      )}

      {currentTab === 'integrations' && (
        <IntegrationsVaultPage currentProfile={currentProfile} />
      )}

      {currentTab === 'settings' && (
        <UserSettingsPage
          currentProfile={currentProfile}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {currentTab === 'editor' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Se estiver em modo smartphone retrato, renderizar a Visão Linear Adaptativa de Nós */}
          {shouldRenderMobileLinearView ? (
            <MobileNodeListView
              nodes={nodes}
              onNodeClick={handleNodeClick}
              onToggleCanvasMode={() => setForceMobileCanvasView(true)}
            />
          ) : (
            <>
              {canEdit && <Sidebar onAddNode={handleAddNodeFromSidebar} />}
              <WorkflowCanvas
                nodes={canvasNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onDeleteEdge={handleDeleteEdge}
                onAddNodeAtPosition={handleAddNodeAtPosition}
                onPaneClick={handlePaneClick}
                onCanvasInteractionPosition={setLastInteractionPos}
                onFlowGenerated={handleFlowGeneratedByAI}
                onAlignAllNodes={handleAlignAllNodes}
                onRunNow={handleRunNow}
                isRunningNow={isRunningNow}
                showCopilotBar={true}
                isDebugMode={isDebugMode}
                failedNodeId={debugFailedNodeId}
                errorMessage={debugErrorMessage}
                onRetryFromFailedNode={handleRetryFromFailedNode}
                isRetrying={isRetrying}
                remoteCursors={remoteCursors}
                onMouseMoveCanvas={sendCursorPosition}
              />
            </>
          )}

          <NodePropertiesDrawer
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
          />

          <AIOptimizationDrawer
            isOpen={isAiOptimizationOpen}
            onClose={() => setIsAiOptimizationOpen(false)}
            report={aiOptimizationReport}
            onApplyImprovements={handleApplyImprovements}
          />
        </div>
      )}

      {/* Modal Gerador de Snippet iFrame */}
      <EmbedModal
        flowchartId={activeFlowchart?.id || 'flow-sample-1'}
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
      />

      {/* Modal de Importação de JSON */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Modal de Histórico de Versões & Rollback */}
      <VersionHistoryModal
        flowchartId={activeFlowchart?.id || 'flow-sample-1'}
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        onRestoreVersion={handleRestoreVersion}
        canEdit={canEdit}
      />

      {/* Modal de Configuração do Nó & Teste HTTP / Webhook */}
      {selectedNode && (
        <NodeConfigModal
          node={selectedNode}
          onSave={(novosDadosDaConfiguracao) => {
            const activeNodeId = selectedNode.id;
            setNodes((nds) =>
              nds.map((node) =>
                node.id === activeNodeId
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        ...novosDadosDaConfiguracao.data,
                      },
                    }
                  : node
              )
            );
            setSelectedNode(null);
          }}
          onDelete={(nodeId) => {
            handleDeleteNode(nodeId);
          }}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ReactFlowProvider>
          <WorkflowAppContent />
        </ReactFlowProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
