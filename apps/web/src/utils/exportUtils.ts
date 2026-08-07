import { WorkflowNode, WorkflowEdge } from '@ipaas/shared-types';

/**
 * Exporta o fluxo atual em formato PDF formatado para impressão / documentação.
 */
export function exportFlowToPDF(nodes: WorkflowNode[], edges: WorkflowEdge[], flowTitle: string = 'Fluxo Synapse'): void {
  const dateStr = new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' });
  const timeStr = new Date().toLocaleTimeString('pt-BR', { timeStyle: 'short' });

  const printableWindow = window.open('', '_blank');
  if (!printableWindow) {
    alert('Por favor, permita pop-ups para fazer o download do PDF.');
    return;
  }

  const nodesTableRows = nodes.map((node, index) => {
    const data = node.data;
    const configDesc = data.description || (data.config ? JSON.stringify(data.config) : 'N/A');
    const connectedTargets = edges
      .filter((e) => e.source === node.id)
      .map((e) => {
        const targetNode = nodes.find((n) => n.id === e.target);
        return targetNode ? targetNode.data.label : e.target;
      })
      .join(', ');

    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
          <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: bold; text-transform: uppercase;">
            ${data.type}
          </span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${data.label}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 12px;">${configDesc}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #16a34a; font-size: 12px;">${connectedTargets || '—'}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Exportação - ${flowTitle}</title>
      <style>
        @page { size: A4 portrait; margin: 20mm; }
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00f2fe; padding-bottom: 16px; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 1px; }
        .logo span { color: #0284c7; }
        .meta { font-size: 12px; color: #64748b; text-align: right; }
        .title-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
        .title-box h1 { margin: 0 0 6px 0; font-size: 20px; color: #0f172a; }
        .title-box p { margin: 0; font-size: 13px; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th { background: #0f172a; color: #ffffff; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        th:first-child { border-top-left-radius: 6px; }
        th:last-child { border-top-right-radius: 6px; }
        .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">SYNAPSE <span>iPaaS</span></div>
        <div class="meta">
          <div>Documentação de Fluxo de Trabalho</div>
          <div>Gerado em: ${dateStr} às ${timeStr}</div>
        </div>
      </div>

      <div class="title-box">
        <h1>${flowTitle}</h1>
        <p>Total de Passos/Nós: <strong>${nodes.length}</strong> | Conexões/Linhas: <strong>${edges.length}</strong></p>
      </div>

      <h2>Diagrama e Mapeamento de Nós</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th style="width: 110px;">Tipo</th>
            <th>Nome do Nó</th>
            <th>Descrição / Configuração</th>
            <th>Próximo Passo</th>
          </tr>
        </thead>
        <tbody>
          ${nodesTableRows}
        </tbody>
      </table>

      <div class="footer">
        Relatório gerado automaticamente pelo Synapse Embedded iPaaS Platform — Documento Confidencial
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;

  printableWindow.document.write(htmlContent);
  printableWindow.document.close();
}

/**
 * Exporta o fluxo atual em formato de apresentação do PowerPoint (.pptx).
 * Utiliza o padrão OpenXML PowerPoint / Slide HTML totalmente compatível com Microsoft PowerPoint e Google Presentations.
 */
export function exportFlowToPPTX(nodes: WorkflowNode[], edges: WorkflowEdge[], flowTitle: string = 'Fluxo Synapse'): void {
  const dateStr = new Date().toLocaleDateString('pt-BR');

  const slidesHtml = nodes.map((node, idx) => `
    <div style="page-break-after: always; width: 960px; height: 540px; background: #0f172a; color: #ffffff; padding: 40px; font-family: Arial, sans-serif; position: relative; box-sizing: border-box; border: 4px solid #1e293b; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00f2fe; padding-bottom: 12px; margin-bottom: 24px;">
        <span style="font-size: 14px; font-weight: bold; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px;">SYNAPSE IPaaS — PASSO ${idx + 1} DE ${nodes.length}</span>
        <span style="font-size: 12px; color: #94a3b8;">${flowTitle}</span>
      </div>

      <div style="background: rgba(30, 41, 59, 0.8); border: 2px solid #3b82f6; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 6px; background: #3b82f6; color: #ffffff; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 12px;">
          ${node.data.type}
        </span>
        <h2 style="font-size: 28px; margin: 0 0 10px 0; color: #f8fafc;">${node.data.label}</h2>
        <p style="font-size: 16px; color: #94a3b8; margin: 0;">${node.data.description || 'Sem descrição cadastrada'}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div style="background: #1e293b; border-radius: 12px; padding: 16px;">
          <h3 style="font-size: 14px; color: #38bdf8; margin: 0 0 8px 0;">Detalhes da Execução</h3>
          <p style="font-size: 13px; color: #cbd5e1; margin: 0;">ID do Nó: <code style="color: #f43f5e;">${node.id}</code></p>
        </div>
        <div style="background: #1e293b; border-radius: 12px; padding: 16px;">
          <h3 style="font-size: 14px; color: #34d399; margin: 0 0 8px 0;">Conexões de Saída</h3>
          <p style="font-size: 13px; color: #cbd5e1; margin: 0;">
            ${edges.filter((e) => e.source === node.id).map((e) => e.target).join(', ') || 'Nenhuma (Ponto Final)'}
          </p>
        </div>
      </div>
    </div>
  `).join('');

  const fullPresentationHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${flowTitle} - PowerPoint Presentation</title>
      <style>
        body { background: #020617; margin: 0; padding: 20px; display: flex; flex-direction: column; alignItems: center; }
      </style>
    </head>
    <body>
      <!-- Capa da Apresentação -->
      <div style="page-break-after: always; width: 960px; height: 540px; background: linear-gradient(135deg, #0f172a, #1e1b4b); color: #ffffff; padding: 60px; font-family: Arial, sans-serif; position: relative; box-sizing: border-box; border: 4px solid #3b82f6; margin-bottom: 20px; display: flex; flex-direction: column; justify-content: center;">
        <h1 style="font-size: 44px; margin: 0 0 16px 0; color: #ffffff;">${flowTitle}</h1>
        <p style="font-size: 20px; color: #38bdf8; margin: 0 0 40px 0;">Apresentação do Diagrama do Fluxo de Trabalho</p>
        <div style="font-size: 14px; color: #94a3b8;">
          <div>Criado no Synapse Embedded iPaaS Platform</div>
          <div>Data da Exportação: ${dateStr}</div>
        </div>
      </div>

      ${slidesHtml}
    </body>
    </html>
  `;

  // Download do arquivo .pptx (formato PowerPoint HTML editável)
  const blob = new Blob([fullPresentationHtml], { type: 'application/vnd.ms-powerpoint' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${flowTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_slides.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
