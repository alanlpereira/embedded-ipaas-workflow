import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ReactFlowProvider, applyNodeChanges, applyEdgeChanges, addEdge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
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
import { NodeConfigModal } from './components/NodeConfigModal';
import { Profile, WorkflowNode, WorkflowEdge, NodeType, Flowchart } from '@ipaas/shared-types';
import { supabase } from './lib/supabase';
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
      { id: 'e1-2', source: 'node-trigger-1', target: 'node-code-1', animated: true, label: 'Payload HTTP' },
      { id: 'e2-media', source: 'node-code-1', target: 'node-media-1', animated: true, label: 'Async Render' },
      { id: 'e-media-decision', source: 'node-media-1', target: 'node-decision-1', animated: true, label: 'Video URL Callback' },
      { id: 'e3-true', source: 'node-decision-1', sourceHandle: 'true', target: 'node-output-1', animated: true, label: 'Sim (Master)' },
      { id: 'e3-false', source: 'node-decision-1', sourceHandle: 'false', target: 'node-approval-1', animated: true, label: 'Não (Aprovação)' },
      { id: 'e-loop-approval-action', source: 'node-approval-1', target: 'node-code-1', animated: true, label: 'Re-tentar (Loop Cíclico)', style: { stroke: '#f97316', strokeDasharray: '5,5' } },
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

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');

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

  // Salvar automaticamente qualquer alteração de fluxogramas no LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('synapse_saved_flowcharts', JSON.stringify(flowcharts));
    } catch (e) {}
  }, [flowcharts]);
  const [activeFlowchart, setActiveFlowchart] = useState<Flowchart | null>(null);

  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
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
      const response = await fetch('/api/v1/ai/optimize-flow', {
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
      const clonedFlow: Flowchart = data.flowchart || {
        id: `flow-clone-${Date.now()}`,
        organization_id: currentProfile?.organization_id || 'org-alp-nexus',
        name: `${template.name} (Cópia)`,
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
        is_published: false,
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
        broadcastStateChange(updated, edges);
        return updated;
      });
    },
    [canEdit, edges, broadcastStateChange]
  );

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
        const updated = addEdge(connection, eds as any) as any;
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
        http: 'Requisição HTTP / Webhook',
        action: 'Nova Ação / Processo',
        decision: 'Nova Decisão',
        approval: 'Nova Aprovação',
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

      const newNode: WorkflowNode = {
        id: uniqueId,
        type,
        position: validPosition,
        data: {
          label: titles[type] || 'Novo Nó',
          type,
          description:
            type === 'code'
              ? 'Executa script JS na Sandbox Node.js'
              : type === 'media'
              ? 'Render de vídeo assíncrono (Veo 3 / Mobile Editing)'
              : `Configuração do nó ${type}`,
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
      const updatedFlow: Flowchart = {
        ...activeFlowchart,
        nodes: nodes as any,
        edges: edges as any,
        updated_at: new Date().toISOString(),
      };

      setFlowcharts((prev) => prev.map((f) => (f.id === activeFlowchart.id ? updatedFlow : f)));
      setActiveFlowchart(updatedFlow);

      await fetch(`/api/flowcharts/${activeFlowchart.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: nodes as any,
          edges: edges as any,
        }),
      }).catch(() => {
        supabase
          .from('flowcharts')
          .upsert({
            id: activeFlowchart.id,
            organization_id: activeFlowchart.organization_id,
            name: activeFlowchart.name,
            nodes: nodes as any,
            edges: edges as any,
          });
      });

      alert(t.messages.flowSaved);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSaving(false);
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
        onLogout={() => setCurrentProfile(null)}
        onOpenEmbedModal={() => setIsEmbedModalOpen(true)}
        onOpenVersionModal={() => setIsVersionModalOpen(true)}
        onExportJson={handleExportJson}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onAnalyzeEfficiency={handleAnalyzeEfficiency}
        isAnalyzingEfficiency={isAnalyzingEfficiency}
        collaborators={activeCollaborators}
      />

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
        />
      )}

      {currentTab === 'templates' && (
        <TemplateGalleryPage
          currentProfile={currentProfile}
          onUseTemplate={handleUseTemplate}
        />
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
