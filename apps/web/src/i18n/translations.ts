export type Language = 'pt' | 'en';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  nav: {
    dashboard: string;
    templates: string;
    editor: string;
    team: string;
    audit: string;
    agency: string;
    masterAdmin: string;
    tenantAdmin: string;
    logout: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    createWorkflowBtn: string;
    createFlow: string;
    searchPlaceholder: string;
    noFlows: string;
    createFirst: string;
    published: string;
    draft: string;
    nodeCount: string;
    edit: string;
    viewOnly: string;
    confirmDelete: string;
    stats: {
      activeFlows: string;
      totalExecutions: string;
      aiTokensUsed: string;
      collaborators: string;
    };
    table: {
      name: string;
      nodes: string;
      status: string;
      updatedAt: string;
      actions: string;
      published: string;
      draft: string;
      openEditor: string;
      delete: string;
    };
  };
  copilot: {
    badge: string;
    placeholder: string;
    generateBtn: string;
    generating: string;
  };
  saveWorkflow: string;
  saving: string;
  debugMode: {
    activeBadge: string;
    failedNodeTitle: string;
    retryFromHere: string;
  };
  auditPage: {
    title: string;
    subtitle: string;
    retrying: string;
    flowchart: string;
    timestamp: string;
    debugBtn: string;
    errorMessage: string;
  };
  masterAdmin: {
    title: string;
    subtitle: string;
    financialWidget: {
      title: string;
    };
  };
  agencyPage: {
    title: string;
    subtitle: string;
    secClientsTitle: string;
    createClientBtn: string;
    createSubOrg: string;
    activeClientBadge: string;
    impersonating: string;
    impersonateBtn: string;
    modalTitle: string;
    orgName: string;
    primaryColor: string;
    logoUrl: string;
    customDomain: string;
    saveSubOrg: string;
    stats: {
      totalClients: string;
      totalTokens: string;
      totalExecutions: string;
      activeUsers: string;
    };
    table: {
      client: string;
      plan: string;
      tokensLimit: string;
      tokensUsed: string;
      users: string;
      actions: string;
      impersonate: string;
    };
    modal: {
      title: string;
      subtitle: string;
      nameLabel: string;
      adminEmailLabel: string;
      planLabel: string;
      cancelBtn: string;
      saveBtn: string;
    };
  };
  approvalPage: {
    title: string;
    subtitle: string;
    pendingApprovalBadge: string;
    nodeIdLabel: string;
    requestedAtLabel: string;
    payloadTitle: string;
    approveBtn: string;
    rejectBtn: string;
    approvedSuccess: string;
    rejectedSuccess: string;
    submitting: string;
    expiredTokenTitle: string;
    expiredTokenMsg: string;
    flowchart: string;
    assignee: string;
    successTitle: string;
    successSub: string;
    notesPlaceholder: string;
  };
  tenantAdmin: {
    title: string;
    subtitle: string;
    teamTab: string;
    activityTab: string;
    usageTab: string;
    upgradeBannerTitle: string;
    upgradeBannerMsg: string;
    secPlanTitle: string;
    tokensUsage: string;
    executionsUsage: string;
    secFeedTitle: string;
    secTeamTitle: string;
    addMemberBtn: string;
  };
  team: {
    title: string;
    subtitle: string;
    addMemberBtn: string;
    addMember: string;
    name: string;
    email: string;
    role: string;
    actions: string;
    table: {
      name: string;
      email: string;
      role: string;
      actions: string;
      joined: string;
    };
    modal: {
      title: string;
      subtitle: string;
      nameLabel: string;
      fullName: string;
      emailLabel: string;
      email: string;
      roleLabel: string;
      roleSelect: string;
      cancelBtn: string;
      cancel: string;
      saveBtn: string;
      submit: string;
    };
  };
  login: {
    title: string;
    subtitle: string;
    emailLabel: string;
    passwordLabel: string;
    submitBtn: string;
    authenticating: string;
    demoNote: string;
    quickMasterLogin: string;
    demoViewerLogin: string;
  };
  embedView: {
    readOnlyBadge: string;
    poweredBy: string;
  };
  embedModal: {
    title: string;
    subtitle: string;
    snippetTitle: string;
    copyBtn: string;
    copiedBtn: string;
    closeBtn: string;
    close: string;
    copied: string;
    copyCode: string;
    instructions: string;
    directUrl: string;
    htmlSnippet: string;
  };
  versionModal: {
    title: string;
    subtitle: string;
    restoreBtn: string;
    restoring: string;
    closeBtn: string;
    close: string;
    currentBadge: string;
    nodesCount: string;
  };
  messages: {
    accessDenied: string;
    flowCreated: string;
    templateCloned: string;
    flowSaved: string;
    flowGenerated: string;
    retrySuccess: string;
    memberAdded: string;
    versionRestored: string;
    impersonateSuccess: string;
  };
}

export const translations: Record<Language, Translations> = {
  pt: {
    appTitle: 'Synapse',
    appSubtitle: 'Embedded iPaaS & Automation',
    nav: {
      dashboard: 'Dashboard',
      templates: 'Templates',
      editor: 'Editor',
      team: 'Equipe',
      audit: 'Auditoria',
      agency: 'Agência',
      masterAdmin: 'Painel Master',
      tenantAdmin: 'Organização',
      logout: 'Sair',
    },
    dashboard: {
      title: 'Meus Fluxos de Automação',
      subtitle: 'Gerencie e monitore suas integrações corporativas',
      createWorkflowBtn: 'Criar Novo Fluxo',
      createFlow: 'Criar Novo Fluxo',
      searchPlaceholder: 'Buscar fluxograma...',
      noFlows: 'Nenhum fluxograma encontrado',
      createFirst: 'Crie seu primeiro processo no botão acima',
      published: 'Publicado',
      draft: 'Rascunho',
      nodeCount: 'nós',
      edit: 'Editar',
      viewOnly: 'Visualizar',
      confirmDelete: 'Tem certeza que deseja excluir este fluxograma?',
      stats: {
        activeFlows: 'Fluxos Ativos',
        totalExecutions: 'Execuções Totais',
        aiTokensUsed: 'Tokens de IA Consumidos',
        collaborators: 'Membros Conectados',
      },
      table: {
        name: 'Nome do Fluxograma',
        nodes: 'Qtd. Nós',
        status: 'Status',
        updatedAt: 'Última Atualização',
        actions: 'Ações',
        published: 'Publicado',
        draft: 'Rascunho',
        openEditor: 'Abrir no Editor',
        delete: 'Excluir',
      },
    },
    copilot: {
      badge: 'Copilot IA',
      placeholder: 'Descreva a automação corporativa em linguagem natural...',
      generateBtn: 'Gerar Fluxo',
      generating: 'Gerando...',
    },
    saveWorkflow: 'Salvar Fluxo',
    saving: 'Salvando...',
    debugMode: {
      activeBadge: 'Modo Debug Ativo',
      failedNodeTitle: 'Falha Interceptada no Nó',
      retryFromHere: 'Reprocessar a partir deste ponto',
    },
    auditPage: {
      title: 'Auditoria & Logs de Execução',
      subtitle: 'Monitoramento em tempo real e reprocessamento com 1-clique',
      retrying: 'Reprocessando...',
      flowchart: 'Fluxograma',
      timestamp: 'Data e Hora',
      debugBtn: 'Modo Debug',
      errorMessage: 'Mensagem de Erro',
    },
    masterAdmin: {
      title: 'Painel Master de Administração',
      subtitle: 'Gestão global de clientes, limites de IA e analytics financeiro',
      financialWidget: {
        title: 'Custos Operacionais Estimados',
      },
    },
    agencyPage: {
      title: 'Painel Multi-tenant da Agência',
      subtitle: 'Gerencie todas as organizações de clientes a partir de um único local',
      secClientsTitle: 'Organizações de Clientes',
      createClientBtn: 'Cadastrar Novo Cliente',
      createSubOrg: 'Cadastrar Nova Sub-organização',
      activeClientBadge: 'Cliente Selecionado',
      impersonating: 'Visualizando Painel do Cliente',
      impersonateBtn: 'Alternar para este Cliente',
      modalTitle: 'Cadastrar Cliente',
      orgName: 'Nome da Organização',
      primaryColor: 'Cor de Destaque',
      logoUrl: 'URL da Logomarca',
      customDomain: 'Domínio Customizado',
      saveSubOrg: 'Salvar Organização',
      stats: {
        totalClients: 'Clientes Ativos',
        totalTokens: 'Tokens Consumidos',
        totalExecutions: 'Execuções no Mês',
        activeUsers: 'Usuários Totais',
      },
      table: {
        client: 'Organização',
        plan: 'Plano',
        tokensLimit: 'Limite de Tokens',
        tokensUsed: 'Consumidos',
        users: 'Usuários',
        actions: 'Ações',
        impersonate: 'Acessar Painel (Impersonate)',
      },
      modal: {
        title: 'Nova Organização de Cliente',
        subtitle: 'Cadastre a empresa cliente e seu primeiro usuário Admin',
        nameLabel: 'Nome da Empresa',
        adminEmailLabel: 'E-mail do Admin',
        planLabel: 'Plano Contratado',
        cancelBtn: 'Cancelar',
        saveBtn: 'Cadastrar Cliente',
      },
    },
    approvalPage: {
      title: 'Aprovação de Fluxo de Trabalho',
      subtitle: 'Revise os dados da requisição e tome sua decisão',
      pendingApprovalBadge: 'Aguardando Aprovação Humana',
      nodeIdLabel: 'Identificador do Nó',
      requestedAtLabel: 'Data da Solicitação',
      payloadTitle: 'Payload do Processo',
      approveBtn: 'Aprovar Processo',
      rejectBtn: 'Rejeitar Processo',
      approvedSuccess: 'Processo APROVADO com sucesso! O motor prosseguiu para o próximo nó.',
      rejectedSuccess: 'Processo REJEITADO. O fluxo foi interrompido conforme configurado.',
      submitting: 'Processando decisão...',
      expiredTokenTitle: 'Token de Aprovação Inválido ou Já Utilizado',
      expiredTokenMsg: 'Esta solicitação de aprovação já foi concluída ou o token de uso único expirou.',
      flowchart: 'Fluxograma',
      assignee: 'Responsável',
      successTitle: 'Decisão Registrada com Sucesso!',
      successSub: 'A fila de execução continuou o processamento do fluxograma.',
      notesPlaceholder: 'Adicione observações ou justificativas opcionais...',
    },
    tenantAdmin: {
      title: 'Gestão da Organização',
      subtitle: 'Gerencie sua equipe, consulte o feed de auditoria e controle seu uso do plano',
      teamTab: 'Gestão de Equipe',
      activityTab: 'Feed de Atividades',
      usageTab: 'Uso do Plano',
      upgradeBannerTitle: 'Consumo do Plano',
      upgradeBannerMsg: 'Seu limite de tokens do plano atual está dentro dos conformes.',
      secPlanTitle: 'Plano Contratado & Quotas',
      tokensUsage: 'Tokens de IA',
      executionsUsage: 'Execuções de Fluxo',
      secFeedTitle: 'Feed de Atividades e Auditoria',
      secTeamTitle: 'Membros da Organização',
      addMemberBtn: 'Convidar Membro',
    },
    team: {
      title: 'Membros da Equipe',
      subtitle: 'Gerencie os usuários e permissões da sua organização',
      addMemberBtn: 'Adicionar Membro',
      addMember: 'Adicionar Membro',
      name: 'Nome',
      email: 'E-mail',
      role: 'Função (Role)',
      actions: 'Ações',
      table: {
        name: 'Nome',
        email: 'E-mail',
        role: 'Função',
        actions: 'Ações',
        joined: 'Data de Entrada',
      },
      modal: {
        title: 'Novo Membro da Equipe',
        subtitle: 'Insira os dados do usuário para conceder acesso à plataforma',
        nameLabel: 'Nome Completo',
        fullName: 'Nome Completo',
        emailLabel: 'E-mail Corporativo',
        email: 'E-mail Corporativo',
        roleLabel: 'Nível de Acesso (Role)',
        roleSelect: 'Nível de Acesso (Role)',
        cancelBtn: 'Cancelar',
        cancel: 'Cancelar',
        saveBtn: 'Salvar Membro',
        submit: 'Salvar Membro',
      },
    },
    login: {
      title: 'Acessar o Synapse',
      subtitle: 'Entre com suas credenciais corporativas ou escolha um perfil de demonstração',
      emailLabel: 'E-mail Corporativo',
      passwordLabel: 'Senha',
      submitBtn: 'Entrar na Plataforma',
      authenticating: 'Autenticando...',
      demoNote: 'Perfis de demonstração rápida:',
      quickMasterLogin: 'Entrar como Usuário Master',
      demoViewerLogin: 'Entrar como Leitor (Viewer)',
    },
    embedView: {
      readOnlyBadge: 'Modo de Visualização Incorporado (iFrame)',
      poweredBy: 'Desenvolvido por Synapse',
    },
    embedModal: {
      title: 'Incorporar Fluxograma (iFrame)',
      subtitle: 'Copie o código abaixo para embutir o fluxograma em qualquer sistema Web',
      snippetTitle: 'Código de Incorporação',
      copyBtn: 'Copiar Snippet',
      copiedBtn: 'Copiat!',
      closeBtn: 'Fechar',
      close: 'Fechar',
      copied: 'Copiado!',
      copyCode: 'Copiar Código',
      instructions: 'Insira este código HTML no seu site ou aplicativo para exibir o canvas interativo em modo de leitura.',
      directUrl: 'URL Direta de Incorporação',
      htmlSnippet: 'Snippet de iFrame HTML',
    },
    versionModal: {
      title: 'Histórico de Versões & Rollback',
      subtitle: 'Restaure versões anteriores salvas do fluxograma',
      restoreBtn: 'Restaurar Versão',
      restoring: 'Restaurando...',
      closeBtn: 'Fechar',
      close: 'Fechar',
      currentBadge: 'Versão Atual',
      nodesCount: 'nós gravados',
    },
    messages: {
      accessDenied: 'Acesso negado. Perfil com permissão insuficiente.',
      flowCreated: 'Novo fluxograma criado com sucesso!',
      templateCloned: 'Template clonado com sucesso para a sua organização!',
      flowSaved: 'Fluxograma salvo com sucesso!',
      flowGenerated: 'Fluxograma gerado pela Inteligência Artificial!',
      retrySuccess: 'Fluxo retomado com sucesso a partir do nó que falhou!',
      memberAdded: 'Novo membro adicionado com sucesso!',
      versionRestored: 'Versão do fluxograma restaurada com sucesso!',
      impersonateSuccess: 'Organização alterada com sucesso!',
    },
  },
  en: {
    appTitle: 'Synapse',
    appSubtitle: 'Embedded iPaaS & Automation',
    nav: {
      dashboard: 'Dashboard',
      templates: 'Templates',
      editor: 'Editor',
      team: 'Team',
      audit: 'Audit Logs',
      agency: 'Agency',
      masterAdmin: 'Master Panel',
      tenantAdmin: 'Organization',
      logout: 'Logout',
    },
    dashboard: {
      title: 'My Automation Workflows',
      subtitle: 'Manage and monitor your corporate integrations',
      createWorkflowBtn: 'Create New Flow',
      createFlow: 'Create New Flow',
      searchPlaceholder: 'Search flowchart...',
      noFlows: 'No flowcharts found',
      createFirst: 'Create your first workflow using the button above',
      published: 'Published',
      draft: 'Draft',
      nodeCount: 'nodes',
      edit: 'Edit',
      viewOnly: 'View',
      confirmDelete: 'Are you sure you want to delete this flowchart?',
      stats: {
        activeFlows: 'Active Flows',
        totalExecutions: 'Total Executions',
        aiTokensUsed: 'AI Tokens Consumed',
        collaborators: 'Connected Members',
      },
      table: {
        name: 'Flowchart Name',
        nodes: 'Nodes Count',
        status: 'Status',
        updatedAt: 'Last Updated',
        actions: 'Actions',
        published: 'Published',
        draft: 'Draft',
        openEditor: 'Open in Editor',
        delete: 'Delete',
      },
    },
    copilot: {
      badge: 'AI Copilot',
      placeholder: 'Describe your corporate automation workflow in natural language...',
      generateBtn: 'Generate Flow',
      generating: 'Generating...',
    },
    saveWorkflow: 'Save Flow',
    saving: 'Saving...',
    debugMode: {
      activeBadge: 'Debug Mode Active',
      failedNodeTitle: 'Node Failure Intercepted',
      retryFromHere: 'Retry from this point',
    },
    auditPage: {
      title: 'Audit & Execution Logs',
      subtitle: 'Real-time monitoring and 1-click retry engine',
      retrying: 'Retrying...',
      flowchart: 'Flowchart',
      timestamp: 'Timestamp',
      debugBtn: 'Debug Mode',
      errorMessage: 'Error Message',
    },
    masterAdmin: {
      title: 'Master Admin Control Panel',
      subtitle: 'Global client management, AI limits, and financial analytics',
      financialWidget: {
        title: 'Estimated Operational Costs',
      },
    },
    agencyPage: {
      title: 'Agency Multi-tenant Control Panel',
      subtitle: 'Manage all client organizations from a single place',
      secClientsTitle: 'Client Organizations',
      createClientBtn: 'Register New Client',
      createSubOrg: 'Register New Sub-organization',
      activeClientBadge: 'Selected Client',
      impersonating: 'Viewing Client Panel',
      impersonateBtn: 'Switch to this Client',
      modalTitle: 'Register Client',
      orgName: 'Organization Name',
      primaryColor: 'Highlight Color',
      logoUrl: 'Logo URL',
      customDomain: 'Custom Domain',
      saveSubOrg: 'Save Organization',
      stats: {
        totalClients: 'Active Clients',
        totalTokens: 'Consumed Tokens',
        totalExecutions: 'Monthly Executions',
        activeUsers: 'Total Users',
      },
      table: {
        client: 'Organization',
        plan: 'Plan',
        tokensLimit: 'Tokens Limit',
        tokensUsed: 'Used',
        users: 'Users',
        actions: 'Actions',
        impersonate: 'Access Panel (Impersonate)',
      },
      modal: {
        title: 'New Client Organization',
        subtitle: 'Register client enterprise and its first Admin user',
        nameLabel: 'Company Name',
        adminEmailLabel: 'Admin Email',
        planLabel: 'Contracted Plan',
        cancelBtn: 'Cancel',
        saveBtn: 'Register Client',
      },
    },
    approvalPage: {
      title: 'Workflow Decision Request',
      subtitle: 'Review payload request details and make your decision',
      pendingApprovalBadge: 'Awaiting Human Approval',
      nodeIdLabel: 'Node ID',
      requestedAtLabel: 'Request Date',
      payloadTitle: 'Process Payload',
      approveBtn: 'Approve Process',
      rejectBtn: 'Reject Process',
      approvedSuccess: 'Process APPROVED successfully! Engine resumed next node.',
      rejectedSuccess: 'Process REJECTED. Flow stopped as configured.',
      submitting: 'Processing decision...',
      expiredTokenTitle: 'Invalid or Expired Approval Token',
      expiredTokenMsg: 'This approval request has already been completed or the single-use token expired.',
      flowchart: 'Flowchart',
      assignee: 'Assignee',
      successTitle: 'Decision Recorded Successfully!',
      successSub: 'Execution queue resumed processing flowchart.',
      notesPlaceholder: 'Add optional notes or justifications...',
    },
    tenantAdmin: {
      title: 'Organization Management',
      subtitle: 'Manage your team, check the activity feed, and monitor plan usage',
      teamTab: 'Team Management',
      activityTab: 'Activity Feed',
      usageTab: 'Plan Usage',
      upgradeBannerTitle: 'Plan Usage',
      upgradeBannerMsg: 'Your current token limit usage is compliant.',
      secPlanTitle: 'Contracted Plan & Quotas',
      tokensUsage: 'AI Tokens',
      executionsUsage: 'Workflow Executions',
      secFeedTitle: 'Activity & Audit Feed',
      secTeamTitle: 'Organization Members',
      addMemberBtn: 'Invite Member',
    },
    team: {
      title: 'Team Members',
      subtitle: 'Manage users and permissions for your organization',
      addMemberBtn: 'Add Member',
      addMember: 'Add Member',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      actions: 'Actions',
      table: {
        name: 'Name',
        email: 'Email',
        role: 'Role',
        actions: 'Actions',
        joined: 'Joined Date',
      },
      modal: {
        title: 'New Team Member',
        subtitle: 'Enter user details to grant access to the platform',
        nameLabel: 'Full Name',
        fullName: 'Full Name',
        emailLabel: 'Corporate Email',
        email: 'Corporate Email',
        roleLabel: 'Access Role',
        roleSelect: 'Access Role',
        cancelBtn: 'Cancel',
        cancel: 'Cancel',
        saveBtn: 'Save Member',
        submit: 'Save Member',
      },
    },
    login: {
      title: 'Access Synapse',
      subtitle: 'Log in with your corporate credentials or select a demo profile',
      emailLabel: 'Corporate Email',
      passwordLabel: 'Password',
      submitBtn: 'Log In to Platform',
      authenticating: 'Authenticating...',
      demoNote: 'Quick demo profiles:',
      quickMasterLogin: 'Log in as Master User',
      demoViewerLogin: 'Log in as Viewer',
    },
    embedView: {
      readOnlyBadge: 'Embedded View Mode (iFrame)',
      poweredBy: 'Powered by Synapse',
    },
    embedModal: {
      title: 'Embed Flowchart (iFrame)',
      subtitle: 'Copy the code below to embed the flowchart in any web application',
      snippetTitle: 'Embedding Snippet Code',
      copyBtn: 'Copy Snippet',
      copiedBtn: 'Copied!',
      closeBtn: 'Close',
      close: 'Close',
      copied: 'Copied!',
      copyCode: 'Copy Code',
      instructions: 'Insert this HTML code into your website or app to display the interactive read-only canvas.',
      directUrl: 'Direct Embed URL',
      htmlSnippet: 'HTML iFrame Snippet',
    },
    versionModal: {
      title: 'Version History & Rollback',
      subtitle: 'Restore previous saved versions of the flowchart',
      restoreBtn: 'Restore Version',
      restoring: 'Restoring...',
      closeBtn: 'Close',
      close: 'Close',
      currentBadge: 'Current Version',
      nodesCount: 'saved nodes',
    },
    messages: {
      accessDenied: 'Access denied. Insufficient permissions.',
      flowCreated: 'New flowchart created successfully!',
      templateCloned: 'Template cloned successfully to your organization!',
      flowSaved: 'Flowchart saved successfully!',
      flowGenerated: 'Flowchart generated by AI Copilot!',
      retrySuccess: 'Flow resumed successfully from failed node!',
      memberAdded: 'New team member added successfully!',
      versionRestored: 'Flowchart version restored successfully!',
      impersonateSuccess: 'Organization switched successfully!',
    },
  },
};
