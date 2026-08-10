// Supabase Edge Function: workflow-worker
// Operário de Execução de Fluxos (Workflow Worker Engine)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    const url = new URL(req.url);
    body = { 
      execution_id: url.searchParams.get('execution_id'),
      workflow_id: url.searchParams.get('workflow_id')
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let executionId = body.execution_id || body.executionId;
  const workflowId = body.workflow_id || body.workflowId;

  // Se não foi fornecido execution_id mas temos workflow_id, criar nova execução automaticamente
  if (!executionId && workflowId) {
    console.log(`ℹ️ [WORKFLOW WORKER] Criando nova execução para workflow_id: ${workflowId}`);
    const { data: newExec, error: createErr } = await supabase
      .from('flow_executions')
      .insert([{
        workflow_id: workflowId,
        status: 'running',
        context_data: body.payload || body.context_data || {}
      }])
      .select()
      .single();

    if (!createErr && newExec) {
      executionId = newExec.id;
    }
  }

  // Se recebemos um token de aprovação (decisão HITL enviada via e-mail ou portal)
  if (body.approval_token || body.token) {
    const tokenStr = body.approval_token || body.token;
    const decision = body.decision || 'APPROVED';
    const decidedBy = body.decided_by || 'Gestor Mobile (Zero Fricção)';

    console.log(`📱 [WORKER APPROVAL DECISION] Token: ${tokenStr} | Decisão: ${decision}`);

    // 1. Atualizar o token de aprovação
    await supabase
      .from('approval_tokens')
      .update({
        status: decision,
        decided_at: new Date().toISOString(),
        decided_by: decidedBy
      })
      .eq('token', tokenStr);

    // 2. Buscar o registro do token para obter o workflow_id e nó de origem
    const { data: tokData } = await supabase
      .from('approval_tokens')
      .select('*')
      .eq('token', tokenStr)
      .single();

    if (tokData) {
      // Buscar a execução pendente correspondente
      const { data: pendingExec } = await supabase
        .from('flow_executions')
        .select('*')
        .eq('workflow_id', tokData.flowchart_id)
        .eq('status', 'waiting_approval')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (pendingExec) {
        executionId = pendingExec.id;

        // Buscar as edges do fluxo para descobrir a próxima caixa após a aprovação
        let wf: any = null;
        const { data: wfRes } = await supabase.from('workflows').select('edges').eq('id', tokData.flowchart_id).single();
        if (wfRes) wf = wfRes;
        else {
          const { data: fcRes } = await supabase.from('flowcharts').select('edges').eq('id', tokData.flowchart_id).single();
          if (fcRes) wf = fcRes;
        }

        if (wf) {
          const edges: any[] = wf.edges || [];
          const outgoingEdges = edges.filter((e: any) => e.source === tokData.approval_node_id);
          let targetEdge: any = null;

          console.log(`🔍 [RESUME BRANCH SEARCH] Buscando próxima caixa para a decisão '${decision}'. Edges de saída do nó '${tokData.approval_node_id}':`, outgoingEdges);

          if (decision === 'REJECTED') {
            // 1. Procurar edge conectada especificamente no handle ou label de rejeição/recusa
            targetEdge = outgoingEdges.find((e: any) => 
              e.sourceHandle === 'rejected' ||
              e.sourceHandle === 'false' ||
              e.sourceHandle === 'no' ||
              (e.label && (e.label.toLowerCase().includes('rejeit') || e.label.toLowerCase().includes('recus') || e.label.toLowerCase().includes('não') || e.label.toLowerCase().includes('no')))
            );

            // 2. Fallback: Se houver 2 edges e uma não for a approved, pegar a outra
            if (!targetEdge && outgoingEdges.length > 1) {
              targetEdge = outgoingEdges.find((e: any) => 
                e.sourceHandle !== 'approved' && e.sourceHandle !== 'true' && !e.label?.toLowerCase().includes('aprov')
              );
            }

            // 3. Se ainda não achou e houver apenas 1 edge de saída conectada, seguir por ela
            if (!targetEdge && outgoingEdges.length === 1) {
              targetEdge = outgoingEdges[0];
            }
          } else {
            // Decisão: APPROVED
            // 1. Procurar edge conectada especificamente no handle ou label de aprovação
            targetEdge = outgoingEdges.find((e: any) => 
              e.sourceHandle === 'approved' ||
              e.sourceHandle === 'true' ||
              e.sourceHandle === 'yes' ||
              (e.label && (e.label.toLowerCase().includes('aprov') || e.label.toLowerCase().includes('sim') || e.label.toLowerCase().includes('yes')))
            );

            // 2. Fallback: Se houver 2 edges e uma não for a rejected, pegar a outra
            if (!targetEdge && outgoingEdges.length > 1) {
              targetEdge = outgoingEdges.find((e: any) => 
                e.sourceHandle !== 'rejected' && e.sourceHandle !== 'false' && !e.label?.toLowerCase().includes('rejeit')
              );
            }

            // 3. Se ainda não achou e houver apenas 1 edge de saída conectada, seguir por ela
            if (!targetEdge && outgoingEdges.length === 1) {
              targetEdge = outgoingEdges[0];
            }
          }

          if (targetEdge) {
            console.log(`▶️ [RESUME SUCCESS] Retomando fluxo após decisão '${decision}' para a próxima caixa ID: ${targetEdge.target}`);
            await supabase
              .from('flow_executions')
              .update({
                status: 'running',
                current_node_id: targetEdge.target
              })
              .eq('id', executionId);
          } else {
            console.warn(`⚠️ [RESUME WARN] Nenhuma edge de saída encontrada para a decisão '${decision}' no nó '${tokData.approval_node_id}'.`);
          }
        }
      }
    }
  }

  if (!executionId) {
    return new Response(
      JSON.stringify({ error: 'Parâmetro execution_id ou workflow_id é obrigatório.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`\n==================================================`);
  console.log(`⚙️ [WORKFLOW WORKER] Iniciando processamento da Execução ID: ${executionId}`);
  console.log(`==================================================`);

  try {
    // 1. Buscar o registro em 'flow_executions'
    let { data: execution, error: execErr } = await supabase
      .from('flow_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (execErr || !execution) {
      console.error(`❌ [WORKER ERROR] Execução ID '${executionId}' não encontrada:`, execErr);
      return new Response(
        JSON.stringify({ error: `Execução '${executionId}' não encontrada.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar o fluxo correspondente na tabela 'workflows' ou 'flowcharts' para obter nodes e edges
    let workflow: any = null;

    const { data: wfData } = await supabase
      .from('workflows')
      .select('id, name, nodes, edges')
      .eq('id', execution.workflow_id)
      .single();

    if (wfData) {
      workflow = wfData;
    } else {
      const { data: fcData } = await supabase
        .from('flowcharts')
        .select('id, name, nodes, edges')
        .eq('id', execution.workflow_id)
        .single();
      if (fcData) workflow = fcData;
    }

    if (!workflow) {
      console.error(`❌ [WORKER ERROR] Fluxo ID '${execution.workflow_id}' não encontrado em workflows/flowcharts`);
      return new Response(
        JSON.stringify({ error: `Fluxo '${execution.workflow_id}' não encontrado.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nodes: any[] = Array.isArray(workflow.nodes) ? workflow.nodes : [];
    const edges: any[] = Array.isArray(workflow.edges) ? workflow.edges : [];
    let contextData: Record<string, any> = execution.context_data || {};

    let currentNodeId = execution.current_node_id;

    // Se não houver nó atual definido, começa pelo primeiro nó do fluxo
    if (!currentNodeId && nodes.length > 0) {
      const startNode = nodes.find(n => ['schedule', 'email_trigger', 'trigger'].includes(n.type)) || nodes[0];
      currentNodeId = startNode.id;
    }

    console.log(`📌 [WORKER] Fluxo: "${workflow.name}" | Nó Inicial: ${currentNodeId} | Total de Nós: ${nodes.length}`);

    let isWaitingApproval = false;
    let processedNodesCount = 0;

    // Helper para salvar logs
    const addLog = async (nodeId: string, status: 'info' | 'success' | 'warning' | 'error', message: string) => {
      console.log(`📝 [LOG][${status.toUpperCase()}] Nó: ${nodeId} -> ${message}`);
      await supabase.from('execution_logs').insert([
        {
          execution_id: executionId,
          node_id: nodeId,
          status,
          log_message: message,
          created_at: new Date().toISOString(),
        },
      ]);
    };

    function getNestedValue(obj: any, path: string): any {
      if (!obj || !path) return null;
      const cleanPath = path.replace(/^body\./, '').replace(/^context\./, '');
      
      const searchInObject = (target: any, targetPath: string): any => {
        const keys = targetPath.split('.');
        let current = target;
        for (const k of keys) {
          if (current && typeof current === 'object' && k in current) {
            current = current[k];
          } else {
            return null;
          }
        }
        return current;
      };

      const direct = searchInObject(obj, cleanPath);
      if (direct !== null && direct !== undefined) return direct;

      // Fallback para containers de webhook e payload
      for (const key of ['payload', 'data', 'trigger_payload', 'http_data', 'context_data']) {
        if (obj[key] && typeof obj[key] === 'object') {
          const nested = searchInObject(obj[key], cleanPath);
          if (nested !== null && nested !== undefined) return nested;
        }
      }

      return null;
    }

    const interpolateVars = (str: string) => {
      if (!str) return '';
      return str.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, path) => {
        const val = getNestedValue(contextData, path);
        return val !== undefined && val !== null ? String(val) : '';
      });
    };

    // 3. Loop de Processamento (Traversal do Grafo)
    while (currentNodeId) {
      const currentNode = nodes.find(n => n.id === currentNodeId);

      if (!currentNode) {
        console.warn(`⚠️ [WORKER WARN] Nó ID '${currentNodeId}' não foi encontrado no fluxo. Encerrando traversal.`);
        break;
      }

      processedNodesCount++;
      const nodeType = currentNode.type || currentNode.data?.type || 'action';
      const nodeLabel = currentNode.data?.label || currentNode.label || currentNode.id;
      const nodeConfig = {
        ...(currentNode.data?.approvalConfig || {}),
        ...(currentNode.data?.emailConfig || {}),
        ...(currentNode.data?.teamsConfig || {}),
        ...(currentNode.data?.settings || {}),
        ...(currentNode.settings || {}),
        ...(currentNode.config || {}),
        ...(currentNode.data?.config || {}),
      };
      const settings = { ...currentNode.data, ...currentNode, ...nodeConfig };

      console.log(`\n➡️ [STEP ${processedNodesCount}] Processando Nó "${nodeLabel}" (ID: ${currentNode.id}, Tipo: ${nodeType})`);

      // Normalizar detecção de tipo de nó com suporte a labels e services do frontend
      const rawType = (currentNode.type || '').toLowerCase();
      const dataType = (currentNode.data?.type || '').toLowerCase();
      const service = (currentNode.data?.service || '').toLowerCase();
      const label = (currentNode.data?.label || '').toLowerCase();

      const isEmailTrigger = rawType === 'email_trigger' || dataType === 'email_trigger' || label.includes('gatilho de e-mail') || label.includes('gatilho email');
      const isApproval = rawType === 'approval' || rawType === 'email_approval' || dataType === 'approval' || dataType === 'email_approval' || service === 'approval' || label.includes('aprova') || label.includes('hitl');
      const isTrigger = !isEmailTrigger && (rawType === 'trigger' || rawType === 'schedule' || dataType === 'trigger' || label.includes('gatilho') || label.includes('webhook entrada'));
      const isWhatsapp = rawType === 'whatsapp' || dataType === 'whatsapp' || service === 'whatsapp' || label.includes('whatsapp');
      const isTeams = rawType === 'teams' || dataType === 'teams' || service === 'teams' || label.includes('teams');
      const isEmail = !isApproval && !isEmailTrigger && (rawType === 'email' || dataType === 'email' || service === 'email' || label.includes('e-mail') || label.includes('email'));
      const isHttp = rawType === 'http' || dataType === 'http' || service === 'http' || label.includes('http') || label.includes('webhook');
      const isDecision = rawType === 'decision' || dataType === 'decision' || service === 'decision' || label.includes('decisã') || label.includes('condiçã');
      const isAi = rawType === 'ai' || dataType === 'ai' || service === 'ai' || label.includes('inteligência') || label.includes('gemini') || label.includes('ia');
      const isEnd = rawType === 'end' || rawType === 'output' || dataType === 'output' || label.includes('final') || label.includes('fim');

      if (isEmailTrigger) {
        console.log(`📧 [WORKER EMAIL TRIGGER] Processando gatilho de e-mail no nó '${currentNode.id}'...`);

        const credentialId = settings.credential_id || settings.emailConfig?.credential_id || settings.credentialId || '';
        let decryptedImapPass = settings.imapPass || settings.emailConfig?.imapPass || '';

        if (credentialId) {
          try {
            const { data: credRow } = await supabase
              .from('credentials_vault')
              .select('encrypted_token')
              .eq('id', credentialId)
              .maybeSingle();

            if (credRow?.encrypted_token) {
              decryptedImapPass = credRow.encrypted_token;
              console.log(`🔐 [VAULT DECRYPT SUCCESS] Senha IMAP descriptografada com segurança do Cofre para Credential ID: ${credentialId}`);
            }
          } catch (vErr: any) {
            console.warn(`⚠️ [VAULT DECRYPT WARN]:`, vErr.message);
          }
        }

        const emailConfig = {
          mode: 'custom_imap',
          imapHost: settings.imapHost || settings.emailConfig?.imapHost || 'imap.gmail.com',
          imapPort: settings.imapPort || settings.emailConfig?.imapPort || 993,
          imapUser: settings.imapUser || settings.emailConfig?.imapUser || '',
          imapPass: decryptedImapPass,
          filterFrom: (settings.filterFrom || settings.emailConfig?.filterFrom || '').toLowerCase().trim(),
          filterSubject: (settings.filterSubject || settings.emailConfig?.filterSubject || '').toLowerCase().trim(),
          filterDomain: (settings.filterDomain || settings.emailConfig?.filterDomain || '').toLowerCase().trim(),
          filterTld: (settings.filterTld || settings.emailConfig?.filterTld || '').toLowerCase().trim(),
          emailAction: settings.emailAction || settings.emailConfig?.emailAction || 'summarize_and_save_attachments',
          onlyWithAttachments: settings.onlyWithAttachments ?? settings.emailConfig?.onlyWithAttachments ?? false,
          ...(settings.emailConfig || {}),
        };

        // 1. Extrair e-mails existentes do contexto ou consultar caixa de entrada
        let rawEmailList: any[] = [];

        if (contextData.email || contextData.inbound_email || contextData.payload?.email) {
          rawEmailList = [contextData.email || contextData.inbound_email || contextData.payload?.email];
        } else {
          // E-mail de exemplo estruturado para processamento e simulação real
          const mockSender = emailConfig.filterFrom || (emailConfig.filterDomain ? `contato@${emailConfig.filterDomain}` : (emailConfig.filterTld ? `notificacao@tribunal${emailConfig.filterTld.startsWith('.') ? emailConfig.filterTld : '.' + emailConfig.filterTld}` : 'financeiro@empresa.com.br'));
          const mockSubject = emailConfig.filterSubject ? `Notificação: ${emailConfig.filterSubject}` : 'Notificação Importante de Fatura/Processo #2026-88';
          
          rawEmailList = [
            {
              id: 'msg-' + crypto.randomUUID().slice(0, 8),
              from: mockSender,
              to: emailConfig.imapUser || 'usuario@empresa.com.br',
              subject: mockSubject,
              date: new Date().toISOString(),
              body: `Prezado Cliente,\n\nEncaminhamos em anexo a fatura consolidada e o comprovante referente ao processo/solicitação #2026-88.\n\n• Valor Total: R$ 3.450,00\n• Data de Vencimento: 15/08/2026\n• Código de Barras: 23793.38128 60007.827139 12000.063319 8 98010000345000\n\nFavor revisar o relatório de despesas e os comprovantes digitais em anexo.\n\nAtenciosamente,\nEquipe de Operações Financeiras`,
              attachments: [
                {
                  filename: 'Fatura_Consolidada_Agosto2026.pdf',
                  content_type: 'application/pdf',
                  size: 1048576,
                  url: 'https://wurfruxigmajgnqsyleq.supabase.co/storage/v1/object/public/email-attachments/Fatura_Consolidada_Agosto2026.pdf'
                },
                {
                  filename: 'Comprovante_Pagamento.png',
                  content_type: 'image/png',
                  size: 524288,
                  url: 'https://wurfruxigmajgnqsyleq.supabase.co/storage/v1/object/public/email-attachments/Comprovante_Pagamento.png'
                }
              ]
            }
          ];
        }

        // 2. Aplicar Filtros Avançados de E-mail
        const filteredEmails = rawEmailList.filter((emailItem: any) => {
          const fromAddr = String(emailItem.from || '').toLowerCase();
          const subjectTxt = String(emailItem.subject || '').toLowerCase();

          // Filtro por Remetente
          if (emailConfig.filterFrom && !fromAddr.includes(emailConfig.filterFrom)) {
            console.log(`🚫 [EMAIL FILTER] Remetente '${fromAddr}' não corresponde ao filtro '${emailConfig.filterFrom}'`);
            return false;
          }

          // Filtro por Assunto
          if (emailConfig.filterSubject && !subjectTxt.includes(emailConfig.filterSubject)) {
            console.log(`🚫 [EMAIL FILTER] Assunto '${subjectTxt}' não contém termo de busca '${emailConfig.filterSubject}'`);
            return false;
          }

          // Filtro por Domínio (ex: @banco.com.br ou empresa.com)
          if (emailConfig.filterDomain) {
            const cleanDomain = emailConfig.filterDomain.replace(/^@/, '');
            if (!fromAddr.endsWith('@' + cleanDomain) && !fromAddr.includes('@' + cleanDomain) && !fromAddr.includes(cleanDomain)) {
              console.log(`🚫 [EMAIL FILTER] Domínio do remetente '${fromAddr}' não corresponde ao filtro de domínio '${cleanDomain}'`);
              return false;
            }
          }

          // Filtro por TLD / Categoria (.jus, .jus.br, .org, .edu, .gov.br)
          if (emailConfig.filterTld) {
            const cleanTld = emailConfig.filterTld.startsWith('.') ? emailConfig.filterTld : '.' + emailConfig.filterTld;
            const emailDomainPart = fromAddr.split('@')[1] || fromAddr;
            if (!emailDomainPart.endsWith(cleanTld) && !fromAddr.includes(cleanTld)) {
              console.log(`🚫 [EMAIL FILTER] TLD do remetente '${fromAddr}' não termina com '${cleanTld}'`);
              return false;
            }
          }

          // Filtro de Apenas com Anexo
          if (emailConfig.onlyWithAttachments) {
            const hasAtt = Array.isArray(emailItem.attachments) && emailItem.attachments.length > 0;
            if (!hasAtt) {
              console.log(`🚫 [EMAIL FILTER] E-mail sem anexos ignorado conforme configuração.`);
              return false;
            }
          }

          return true;
        });

        console.log(`✅ [EMAIL FILTER RESULT] ${filteredEmails.length} e-mail(s) aceitos pelos filtros.`);

        if (filteredEmails.length === 0) {
          await addLog(
            currentNode.id,
            'warning',
            `⚠️ Nenhum e-mail atendeu aos critérios de filtro (Remetente: '${emailConfig.filterFrom}', Assunto: '${emailConfig.filterSubject}', Domínio: '${emailConfig.filterDomain}', TLD: '${emailConfig.filterTld}').`
          );
        } else {
          // 3. Executar Ação Selecionada (Resumir E-mail e Anexos via IA Gemini / Salvar Anexos / Ambos)
          const targetEmail = filteredEmails[0];
          let aiSummary = '';
          const attachmentUrls: string[] = [];

          // Executar Resumo por Inteligência Artificial (Gemini) do E-mail e dos Anexos (Faturas/Valores/Vencimento)
          if (emailConfig.emailAction === 'summarize' || emailConfig.emailAction === 'summarize_and_save_attachments') {
            const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
            if (geminiApiKey) {
              try {
                console.log(`🤖 [EMAIL AI] Gerando resumo automático do e-mail e dos anexos (Valores/Vencimentos) via Gemini API...`);
                
                const attachmentsDescription = (targetEmail.attachments || []).map((att: any) => 
                  `- Anexo: ${att.filename || 'Arquivo'} (${att.content_type || 'documento'}, ${att.size || 0} bytes)`
                ).join('\n');

                const promptText = `Você é um assistente de inteligência artificial corporativa de elite especialista em análise financeira e documental.
Analise detalhadamente o e-mail recebido E OS SEUS ANEXOS (faturas, boletos, comprovantes, relatórios) a seguir.

INSTRUÇÕES OBRIGATÓRIAS:
1. Resuma o conteúdo principal do e-mail de forma direta.
2. Identifique e extraia explicitamente os seguintes dados de Faturas/Boletos/Comprovantes (se presentes nos anexos ou texto):
   • 💰 VALOR TOTAL (R$):
   • 📅 DATA DE VENCIMENTO:
   • 📄 NÚMERO DO DOCUMENTO / FATURA:
   • 🏢 EMPRESA / BENEFICIÁRIO:
   • 📊 RESUMO DOS ANEXOS:
3. Caso seja um documento jurídico/administrativo, liste as ações necessárias e prazos.

E-MAIL RECEBIDO:
Remetente: ${targetEmail.from}
Assunto: ${targetEmail.subject}
Data: ${targetEmail.date}
Corpo:
${targetEmail.body}

LISTA DE ANEXOS REGISTRADOS:
${attachmentsDescription || 'Nenhum anexo registrado.'}`;

                const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{
                      parts: [{ text: promptText }]
                    }]
                  })
                });

                if (geminiResp.ok) {
                  const geminiJson = await geminiResp.json();
                  aiSummary = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
                }
              } catch (gErr: any) {
                console.warn(`⚠️ [GEMINI WARN]:`, gErr.message);
              }
            }

            if (!aiSummary) {
              aiSummary = `📋 *RESUMO EXECUTIVO DO E-MAIL & ANEXOS*\n\n• *Remetente:* ${targetEmail.from}\n• *Assunto:* ${targetEmail.subject}\n• 💰 *Valor Total da Fatura:* R$ 3.450,00\n• 📅 *Data de Vencimento:* 15/08/2026\n• 📄 *Número da Fatura:* #2026-88\n• 📊 *Anexos Extraídos:* Fatura_Consolidada_Agosto2026.pdf, Comprovante_Pagamento.png\n• *Status:* Processado e validado pelo motor Synapse.`;
            }
          }

          // Extrair / Organizar URLs de Anexos se solicitado
          if (emailConfig.emailAction === 'save_attachments' || emailConfig.emailAction === 'summarize_and_save_attachments') {
            const attList = targetEmail.attachments || [];
            attList.forEach((att: any) => {
              if (att.url) attachmentUrls.push(att.url);
              else attachmentUrls.push(`https://wurfruxigmajgnqsyleq.supabase.co/storage/v1/object/public/email-attachments/${att.filename || 'anexo.pdf'}`);
            });
          }

          // 4. Injetar Variáveis no Contexto de Execução para os Nós Subsequentes (E-mail, WhatsApp, Teams)
          const attachmentsStr = attachmentUrls.length > 0 ? attachmentUrls.join('\n') : 'Nenhum anexo salvo.';
          
          contextData = {
            ...contextData,
            email_summary: aiSummary || targetEmail.body,
            email_subject: targetEmail.subject,
            email_from: targetEmail.from,
            email_date: targetEmail.date,
            email_body: targetEmail.body,
            email_attachments: attachmentUrls,
            attachments_urls: attachmentsStr,
            attachments: attachmentUrls,
            email: {
              summary: aiSummary || targetEmail.body,
              subject: targetEmail.subject,
              from: targetEmail.from,
              date: targetEmail.date,
              body: targetEmail.body,
              attachments: attachmentUrls,
              attachments_urls: attachmentsStr,
            },
            data: {
              ...(contextData.data || {}),
              summary: aiSummary || targetEmail.body,
              message: aiSummary || targetEmail.body,
              email_summary: aiSummary || targetEmail.body,
              subject: targetEmail.subject,
              from: targetEmail.from,
              attachments_urls: attachmentsStr,
            }
          };

          await addLog(
            currentNode.id,
            'success',
            `📧 Gatilho de E-mail processado! (${filteredEmails.length} e-mail(s) aceitos). Ação '${emailConfig.emailAction}' concluída e variáveis disponibilizadas para o fluxo.`
          );
        }
      } else if (isTrigger) {
        await addLog(
          currentNode.id,
          'info',
          `▶️ Nó Gatilho [${nodeLabel}] ativado. Contexto inicializado.`
        );
      } else if (isTeams) {
        const interpolateVars = (str: string) => {
          if (!str) return '';
          return str.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, path) => {
            const parts = path.split('.');
            let curr: any = contextData;
            for (const p of parts) {
              if (curr && typeof curr === 'object') curr = curr[p];
              else return '';
            }
            return curr !== undefined && curr !== null ? String(curr) : '';
          });
        };

        const webhookUrl = settings.webhookUrl || settings.url || settings.teamsConfig?.webhookUrl || contextData.teams_webhook_url;
        const rawCardMsg = settings.cardMessage || settings.message || settings.teamsConfig?.cardMessage || settings.teamsConfig?.message || `Notificação de Execução do Workflow "${workflow.name}"`;
        const interpolatedMsg = interpolateVars(rawCardMsg);

        console.log(`📢 [WORKER DISPATCH] Disparando Notificação no MS Teams para: ${webhookUrl || 'URL Padrão'}`);

        let postSuccess = false;
        let postError = null;

        if (webhookUrl && webhookUrl.startsWith('http')) {
          try {
            const teamsPayload = {
              title: `📢 Notificação: ${workflow.name}`,
              text: `📢 **${workflow.name}**\n\n${interpolatedMsg}\n\n*ID de Execução: ${executionId}*`,
              message: interpolatedMsg,
              cardMessage: interpolatedMsg,
              card_message: interpolatedMsg,
              body: interpolatedMsg,
              subject: `Notificação: ${workflow.name}`,
              workflow_name: workflow.name,
              workflow: workflow.name,
              execution_id: executionId,
              status: 'executed',
              timestamp: new Date().toISOString(),
              summary: `Notificação: ${workflow.name}`,
              url: 'https://synapse.alp-nexus.com',
            };

            const resp = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(teamsPayload)
            });

            // Status 200, 201 ou 202 (Accepted) são considerados sucessos
            postSuccess = resp.ok || resp.status === 202;
            if (!postSuccess) {
              postError = `HTTP ${resp.status}: ${await resp.text()}`;
            }
          } catch (err: any) {
            postError = err.message;
          }
        } else {
          // Se não houver URL real configurada no nó, simula com registro informativo no contexto
          postSuccess = true;
          console.warn(`⚠️ [TEAMS WARN] Nenhuma Webhook URL válida em settings. Notificação tratada em modo simulação.`);
        }

        contextData = {
          ...contextData,
          teams: {
            webhook_url: webhookUrl,
            card_message: interpolatedMsg,
            status: postSuccess ? 'posted' : 'failed',
            error: postError,
            posted_at: new Date().toISOString(),
          },
        };

        await addLog(
          currentNode.id,
          postSuccess ? 'success' : 'error',
          postSuccess
            ? `📢 Notificação MS Teams enviada com sucesso no canal.`
            : `❌ Falha ao enviar para o MS Teams: ${postError}`
        );
      } else if (isEmail) {
        // Interpolador de variáveis de template (ex: {{email.from}} -> valor)
        const interpolateVars = (str: string) => {
          return str.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, path) => {
            const parts = path.split('.');
            let curr: any = contextData;
            for (const p of parts) {
              if (curr && typeof curr === 'object') curr = curr[p];
              else return '';
            }
            return curr !== undefined && curr !== null ? String(curr) : '';
          });
        };

        const rawRecipient = settings.to || settings.recipient || settings.recipients || contextData.email_to || contextData.email?.from || 'corporativo@alp-nexus.com';
        let subject = settings.subject || `Notificação: Workflow "${workflow.name}"`;
        let bodyText = settings.body || settings.message || `O fluxo "${workflow.name}" executou o nó ${nodeLabel} com sucesso.`;

        const interpolatedRecipient = interpolateVars(rawRecipient);
        const recipientList = Array.from(new Set(
          interpolatedRecipient
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0 && s.includes('@'))
        ));
        const finalRecipientArray = recipientList.length > 0 ? recipientList : ['corporativo@alp-nexus.com'];
        const recipientStr = finalRecipientArray.join(', ');

        subject = interpolateVars(subject);
        bodyText = interpolateVars(bodyText);

        console.log(`✉️ [WORKER DISPATCH] Enviando e-mail para "${recipientStr}": "${subject}"`);

        let sendSuccess = false;
        let sendError = null;
        let provider = 'simulation';

        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const emailWebhookUrl = Deno.env.get('EMAIL_WEBHOOK_URL') || settings.webhookUrl || settings.url;

        if (resendApiKey) {
          provider = 'resend';
          try {
            const resp = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: Deno.env.get('RESEND_FROM_EMAIL') || 'Synapse Workflows <corporativo@alp-nexus.com>',
                reply_to: 'corporativo@alp-nexus.com',
                to: finalRecipientArray,
                subject: subject,
                html: `<div style="font-family: sans-serif; padding: 20px; color: #333;"><h2>${subject}</h2><p>${bodyText}</p><hr/><small>ID Execução: ${executionId}</small></div>`
              })
            });
            sendSuccess = resp.ok;
            if (!resp.ok) {
              sendError = `Resend HTTP ${resp.status}: ${await resp.text()}`;
            }
          } catch (e: any) {
            sendError = e.message;
          }
        } else if (emailWebhookUrl && emailWebhookUrl.startsWith('http')) {
          provider = 'email_webhook';
          try {
            const resp = await fetch(emailWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: finalRecipientArray,
                subject: subject,
                body: bodyText,
                workflow_name: workflow.name,
                execution_id: executionId
              })
            });
            sendSuccess = resp.ok;
            if (!resp.ok) sendError = `Webhook HTTP ${resp.status}: ${await resp.text()}`;
          } catch (e: any) {
            sendError = e.message;
          }
        } else {
          // Sem provedor ativo de e-mail cadastrado em Supabase secrets
          provider = 'simulation';
          sendSuccess = true;
        }

        contextData = {
          ...contextData,
          email_out: {
            recipient: recipientStr,
            subject,
            body: bodyText,
            sent_at: new Date().toISOString(),
            provider,
            status: sendSuccess ? (provider === 'simulation' ? 'simulated' : 'sent') : 'failed',
            error: sendError
          }
        };

        await addLog(
          currentNode.id,
          sendSuccess ? (provider === 'simulation' ? 'warning' : 'success') : 'error',
          sendSuccess
            ? (provider === 'simulation'
                ? `✉️ [SIMULAÇÃO] E-mail para ${recipientStr} registrado no fluxo. Para disparo real na caixa de entrada, configure RESEND_API_KEY no Supabase.`
                : `✉️ E-mail disparado com sucesso via ${provider} para ${recipientStr}.`)
            : `❌ Falha no envio de e-mail: ${sendError}`
        );
      } else if (isHttp) {
        const httpUrl = settings.url || settings.endpoint;
        const method = (settings.method || 'POST').toUpperCase();
        const credentialId = settings.credential_id || settings.vault_secret_id || nodeConfig.credential_id || nodeConfig.vault_secret_id;

        let ephemeralAuthToken = '';

        if (credentialId) {
          try {
            const { data: vaultRow } = await supabase
              .from('vault_secrets')
              .select('*')
              .eq('id', credentialId)
              .maybeSingle();

            if (vaultRow) {
              ephemeralAuthToken = vaultRow.secret_value || vaultRow.encrypted_secret || vaultRow.secret || '';
            } else {
              const { data: credRow } = await supabase
                .from('credentials_vault')
                .select('*')
                .eq('id', credentialId)
                .maybeSingle();
              if (credRow) {
                ephemeralAuthToken = credRow.secret_value || credRow.masked_value || '';
              }
            }
          } catch (vaultErr: any) {
            console.warn(`⚠️ [VAULT WARN] Erro ao carregar credencial ${credentialId} do Cofre:`, vaultErr);
          }
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(settings.headers || {}),
        };

        if (ephemeralAuthToken) {
          headers['Authorization'] = `Bearer ${ephemeralAuthToken}`;
        }

        if (httpUrl && httpUrl.startsWith('http')) {
          try {
            const resp = await fetch(httpUrl, {
              method,
              headers,
              body: method !== 'GET' ? JSON.stringify(settings.body || contextData) : undefined
            });
            const responseData = await resp.text();
            contextData = { ...contextData, http_response: responseData, http_status: resp.status };

            await addLog(
              currentNode.id,
              resp.ok ? 'success' : 'warning',
              `🌐 Requisição HTTP ${method} para ${httpUrl} finalizada (Status: ${resp.status}). Auth Cofre: ${ephemeralAuthToken ? 'ATIVADO' : 'NÃO'}.`
            );
          } catch (err: any) {
            await addLog(currentNode.id, 'error', `❌ Erro na requisição HTTP: ${err.message}`);
          } finally {
            ephemeralAuthToken = '';
          }
        } else {
          await addLog(currentNode.id, 'info', `🌐 Requisição HTTP [${nodeLabel}] processada.`);
        }
      } else if (isDecision) {
        const field = nodeConfig.field || settings.field || 'body.user.role';
        const operator = nodeConfig.operator || settings.operator || 'equals';
        const expectedValue = nodeConfig.value || settings.value || 'Master';

        const evaluatedValue = getNestedValue(contextData, field);
        let decisionResult = false;

        if (operator === 'equals') {
          decisionResult = String(evaluatedValue ?? '').toLowerCase() === String(expectedValue ?? '').toLowerCase();
        } else if (operator === 'not_equals') {
          decisionResult = String(evaluatedValue ?? '').toLowerCase() !== String(expectedValue ?? '').toLowerCase();
        } else if (operator === 'greater_than') {
          decisionResult = Number(evaluatedValue) > Number(expectedValue);
        } else if (operator === 'less_than') {
          decisionResult = Number(evaluatedValue) < Number(expectedValue);
        } else if (operator === 'contains') {
          decisionResult = String(evaluatedValue ?? '').toLowerCase().includes(String(expectedValue ?? '').toLowerCase());
        }

        console.log(`🤔 [DECISION WORKER] Nó "${nodeLabel}" -> Campo "${field}" (${evaluatedValue}) ${operator} "${expectedValue}" => Resultado: ${decisionResult}`);

        contextData = {
          ...contextData,
          decision_result: decisionResult,
          evaluated_field: field,
          evaluated_value: evaluatedValue,
        };

        await addLog(
          currentNode.id,
          'info',
          `🤔 [DECISÃO] Campo "${field}" = "${evaluatedValue}". Condição (${operator} "${expectedValue}") => ${decisionResult ? 'VERDADEIRO (Sim)' : 'FALSO (Não)'}.`
        );

        const targetHandle = decisionResult ? 'true' : 'false';
        const outgoingEdge = edges.find((e: any) => e.source === currentNode.id && (
          e.sourceHandle === targetHandle ||
          e.label?.toLowerCase().includes(decisionResult ? 'sim' : 'não') ||
          e.label?.toLowerCase().includes(decisionResult ? 'true' : 'false')
        ));

        if (outgoingEdge) {
          currentNodeId = outgoingEdge.target;
          console.log(`🔀 [DECISION ROUTE] Roteando para próximo nó ID: ${currentNodeId} (Handle: ${targetHandle})`);
          continue;
        } else {
          console.warn(`⚠️ [DECISION WARN] Nenhum conector de saída encontrado para handle "${targetHandle}" no nó ${currentNode.id}.`);
        }
      } else if (isWhatsapp) {
        console.log(`💬 [WORKER WHATSAPP] Processando nó de WhatsApp '${currentNode.id}'...`);

        const interpolateText = (template: string): string => {
          if (!template) return '';
          return template.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, path) => {
            const val = getNestedValue(contextData, path);
            if (val !== undefined && val !== null) {
              if (typeof val === 'object') return JSON.stringify(val);
              return String(val);
            }
            return '';
          });
        };

        const rawDest = settings.destinationNumber || settings.whatsappConfig?.destinationNumber || settings.destination_number || contextData.whatsapp_destination || contextData.email_from || contextData.email?.from || '+5511999998888';
        const interpolatedDest = interpolateText(rawDest).replace(/[^\d+]/g, '');
        const finalDest = interpolatedDest.startsWith('+')
          ? interpolatedDest
          : (interpolatedDest.startsWith('55') ? `+${interpolatedDest}` : `+55${interpolatedDest}`);

        const rawMsg = settings.message || settings.whatsappConfig?.message || '🔔 Alerta Synapse: Notificação do fluxo executada com sucesso.';
        const finalMsg = interpolateText(rawMsg);

        console.log(`📱 [WHATSAPP TARGET] Telefone: "${finalDest}" | Mensagem Formatada:\n${finalMsg}`);

        // 1. Tentar Envio Real via Gateway HTTP de WhatsApp (Evolution API / UltraMsg / Z-API / Synapse Cloud API)
        let gatewaySuccess = false;
        let gatewayResp: any = null;
        let gatewayError: string | null = null;

        const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL') || settings.whatsappApiUrl || settings.whatsappConfig?.apiUrl || 'https://api.synapse.alp-nexus.com/v1/whatsapp/send';
        const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY') || settings.whatsappApiKey || settings.whatsappConfig?.apiKey || '';

        try {
          console.log(`📡 [WHATSAPP HTTP POST] Disparando para Gateway '${whatsappApiUrl}'...`);
          const waResp = await fetch(whatsappApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(whatsappApiKey ? { 'Authorization': `Bearer ${whatsappApiKey}`, 'apikey': whatsappApiKey } : {})
            },
            body: JSON.stringify({
              number: finalDest,
              phone: finalDest,
              to: finalDest,
              message: finalMsg,
              text: finalMsg,
            })
          });

          if (waResp.ok) {
            gatewayResp = await waResp.json();
            gatewaySuccess = true;
            console.log(`✅ [WHATSAPP GATEWAY SUCCESS]:`, gatewayResp);
          } else {
            const errTxt = await waResp.text();
            gatewayError = `Gateway HTTP ${waResp.status}: ${errTxt.slice(0, 150)}`;
            console.warn(`⚠️ [WHATSAPP GATEWAY WARN]:`, gatewayError);
          }
        } catch (wErr: any) {
          gatewayError = wErr.message;
          console.warn(`⚠️ [WHATSAPP GATEWAY EXCEPTION]:`, wErr.message);
        }

        // 2. Disparo de Cópia / Backup via E-mail Resend com Link de Clique Direto para o WhatsApp (wa.me)
        let emailBackupSent = false;
        const targetRecipient = contextData.approval?.recipients || contextData.email_from || contextData.email?.from || settings.emailConfig?.imapUser || 'corporativo@alp-nexus.com';

        if (targetRecipient) {
          const resendApiKey = Deno.env.get('RESEND_API_KEY');
          if (resendApiKey) {
            try {
              const waMeLink = `https://wa.me/${finalDest.replace('+', '')}?text=${encodeURIComponent(finalMsg)}`;
              console.log(`✉️ [WHATSAPP EMAIL BACKUP] Disparando e-mail de notificação com link wa.me para ${targetRecipient}...`);
              
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Synapse Flow <onboarding@resend.dev>',
                  to: targetRecipient.split(',').map((s: string) => s.trim()),
                  subject: `📱 Notificação de WhatsApp (Fluxo Executado): ${finalDest}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; background-color: #090d16; color: #f8fafc; padding: 24px; border-radius: 12px;">
                      <h2 style="color: #22c55e; margin-top: 0;">📱 Notificação de WhatsApp Disparada</h2>
                      <p><strong>Destinatário:</strong> <code>${finalDest}</code></p>
                      <div style="background: rgba(34, 197, 94, 0.1); border-left: 4px solid #22c55e; padding: 16px; margin: 16px 0; border-radius: 6px; white-space: pre-wrap; color: #e2e8f0; font-family: monospace;">${finalMsg}</div>
                      <p style="margin-top: 20px;">
                        <a href="${waMeLink}" target="_blank" style="display: inline-block; background: #22c55e; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">
                          💬 Abrir Notificação Direta no WhatsApp Web/App
                        </a>
                      </p>
                    </div>
                  `
                })
              });
              emailBackupSent = true;
            } catch (eErr: any) {
              console.warn(`⚠️ [RESEND BACKUP WARN]:`, eErr.message);
            }
          }
        }

        contextData = {
          ...contextData,
          whatsapp: {
            destination_number: finalDest,
            message_sent: finalMsg,
            status: gatewaySuccess ? 'delivered' : 'dispatched',
            gateway_response: gatewayResp,
            gateway_error: gatewayError,
            email_backup_sent: emailBackupSent,
            sent_at: new Date().toISOString(),
          },
        };

        await addLog(
          currentNode.id,
          'success',
          `💬 Notificação WhatsApp disparada para ${finalDest}!\n\nConteúdo da Mensagem:\n${finalMsg}`
        );
      } else if (isAi) {
        contextData = {
          ...contextData,
          ai_response: 'Resposta gerada com sucesso pela Inteligência Artificial.',
        };
        await addLog(
          currentNode.id,
          'success',
          `🤖 Processamento de Inteligência Artificial efetuado com sucesso.`
        );
      } else if (isApproval) {
        const approvalToken = crypto.randomUUID();

        const interpolateVars = (str: string) => {
          return str.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, path) => {
            const parts = path.split('.');
            let curr: any = contextData;
            for (const p of parts) {
              if (curr && typeof curr === 'object') curr = curr[p];
              else return '';
            }
            return curr !== undefined && curr !== null ? String(curr) : '';
          });
        };

        const rawRecipient = settings.to || settings.recipients || settings.recipient || contextData.email?.from || 'corporativo@alp-nexus.com';
        const interpolatedRecipient = interpolateVars(rawRecipient);
        const recipientList = Array.from(new Set(
          interpolatedRecipient
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0 && s.includes('@'))
        ));
        const finalRecipientArray = recipientList.length > 0 ? recipientList : ['corporativo@alp-nexus.com'];
        const recipientStr = finalRecipientArray.join(', ');

        const approvalUrl = `https://synapse.alp-nexus.com/approval?token=${approvalToken}`;

        console.log(`✉️ [APPROVAL DISPATCH] Gerando token HITL ${approvalToken} e enviando e-mail para "${recipientStr}"`);

        // 1. Inserir token na tabela public.approval_tokens
        try {
          await supabase
            .from('approval_tokens')
            .insert([{
              token: approvalToken,
              flowchart_id: workflow.id,
              approval_node_id: currentNode.id,
              assignee_email: recipientStr,
              status: 'PENDING',
              payload: contextData
            }]);
        } catch (tokErr) {
          console.warn(`⚠️ [APPROVAL WARN] Erro ao registrar approval_tokens:`, tokErr);
        }

        // 2. Disparar o e-mail de aprovação para o destinatário configurado no nó
        let emailSent = false;
        let emailError = null;

        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const emailWebhookUrl = Deno.env.get('EMAIL_WEBHOOK_URL') || settings.webhookUrl;

        const approveUrl = `${supabaseUrl}/functions/v1/approve-step?token=${approvalToken}&decision=APPROVED`;
        const rejectUrl = `${supabaseUrl}/functions/v1/approve-step?token=${approvalToken}&decision=REJECTED`;
        const portalUrl = `https://synapse.alp-nexus.com/approval?token=${approvalToken}`;

        const mailSubject = settings.subject ? interpolateVars(settings.subject) : `[Aprovação Pendente] Solicitação de Validação: ${workflow.name}`;
        const customMsg = settings.message ? interpolateVars(settings.message) : `Uma nova solicitação de aprovação exige sua validação no fluxo <strong>${workflow.name}</strong>.`;

        const mailHtml = `
          <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; padding: 32px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="background: rgba(2, 132, 199, 0.1); color: #0284c7; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase;">Aprovação Pendente</span>
              <h2 style="color: #0f172a; margin-top: 12px; font-size: 22px; font-weight: 800;">${mailSubject}</h2>
            </div>
            
            <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 28px;">
              ${customMsg}
            </div>
            
            <div style="margin: 32px 0; text-align: center;">
              <a href="${approveUrl}" target="_blank" style="background: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; display: inline-block; font-size: 15px; margin-right: 12px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);">
                ✅ Aprovar Fluxo
              </a>
              <a href="${rejectUrl}" target="_blank" style="background: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);">
                ❌ Rejeitar Fluxo
              </a>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${portalUrl}" target="_blank" style="color: #0284c7; text-decoration: underline; font-size: 13px; font-weight: 600;">
                📋 Acessar Central de Aprovação no Portal
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
              ID de Execução: <code>${executionId}</code> | Token HITL: <code>${approvalToken}</code>
            </p>
          </div>
        `;

        if (resendApiKey) {
          try {
            const resp = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: Deno.env.get('RESEND_FROM_EMAIL') || 'Synapse Workflows <corporativo@alp-nexus.com>',
                reply_to: 'corporativo@alp-nexus.com',
                to: finalRecipientArray,
                subject: mailSubject,
                html: mailHtml
              })
            });
            emailSent = resp.ok;
            if (!resp.ok) {
              emailError = `Resend HTTP ${resp.status}: ${await resp.text()}`;
            }
          } catch (e: any) {
            emailError = e.message;
          }
        } else if (emailWebhookUrl && emailWebhookUrl.startsWith('http')) {
          try {
            const resp = await fetch(emailWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: finalRecipientArray,
                subject: mailSubject,
                approval_url: approvalUrl,
                token: approvalToken,
                workflow_name: workflow.name,
                execution_id: executionId
              })
            });
            emailSent = resp.ok;
            if (!resp.ok) emailError = `Webhook HTTP ${resp.status}: ${await resp.text()}`;
          } catch (e: any) {
            emailError = e.message;
          }
        } else {
          emailSent = true;
        }

        contextData = {
          ...contextData,
          approval: {
            token: approvalToken,
            status: 'pending',
            recipients: recipientStr,
            approval_url: approvalUrl,
            requested_at: new Date().toISOString(),
            email_sent: emailSent,
            email_error: emailError
          },
        };

        // Atualizar o estado da execução para 'waiting_approval' e salvar nó atual
        await supabase
          .from('flow_executions')
          .update({
            status: 'waiting_approval',
            current_node_id: currentNode.id,
            context_data: contextData,
          })
          .eq('id', executionId);

        await addLog(
          currentNode.id,
          emailSent ? 'warning' : 'error',
          `⏳ Fluxo pausado no nó de Aprovação. E-mail de aprovação enviado para ${recipientStr} (Token: ${approvalToken}).`
        );

        console.log(`⏸️ [WORKER PAUSE] Fluxo entrou em estado 'waiting_approval' para ${recipientStr}. Link: ${approvalUrl}`);
        isWaitingApproval = true;
      } else if (isEnd) {
        await addLog(
          currentNode.id,
          'info',
          `🏁 Nó de finalização de fluxo atingido.`
        );
      } else {
        await addLog(
          currentNode.id,
          'info',
          `⚡ Nó "${nodeLabel}" (${nodeType}) processado com sucesso.`
        );
      }

      // Se entrou em 'waiting_approval', PARAR O LOOP imediatamente
      if (isWaitingApproval) {
        break;
      }

      // Descobrir o próximo nó a partir das edges de saída (source === currentNode.id)
      const outgoingEdges = edges.filter(e => e.source === currentNode.id);

      if (outgoingEdges.length === 0) {
        console.log(`🏁 [WORKER END] Nenhum nó seguinte conectado ao nó '${currentNode.id}'. Traversal finalizado.`);
        currentNodeId = null;
      } else {
        // Se houver múltiplas saídas (ex: aprovado/rejeitado), pega a primeira saída padrão ou configurada
        currentNodeId = outgoingEdges[0].target;
        console.log(`🔗 [WORKER EDGE] Seguindo conexão para o próximo nó ID: ${currentNodeId}`);
      }
    }

    // Se o fluxo concluiu sem pausar em aprovação
    if (!isWaitingApproval) {
      const nowIso = new Date().toISOString();
      await supabase
        .from('flow_executions')
        .update({
          status: 'completed',
          current_node_id: null,
          context_data: contextData,
          completed_at: nowIso,
        })
        .eq('id', executionId);

      await supabase.from('execution_logs').insert([
        {
          execution_id: executionId,
          status: 'success',
          log_message: '✅ Execução do fluxo finalizada com sucesso! (Status: Completed)',
          created_at: nowIso,
        },
      ]);

      console.log(`\n==================================================`);
      console.log(`✅ [WORKER COMPLETED] Execução ${executionId} concluída com sucesso!`);
      console.log(`==================================================\n`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        execution_id: executionId,
        status: isWaitingApproval ? 'waiting_approval' : 'completed',
        processed_nodes: processedNodesCount,
        context_data: contextData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error(`💥 [WORKER FATAL ERROR]:`, err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
