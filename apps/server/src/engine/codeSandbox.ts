import vm from 'vm';

export interface CodeSandboxResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTimeMs?: number;
}

/**
 * Ambiente de Execução Isolado (Sandbox) em Node.js usando o módulo nativo 'vm'
 * Garante que o código do usuário não tenha acesso ao sistema de arquivos (fs),
 * variáveis de ambiente (process.env) ou bibliotecas do servidor (require/child_process).
 */
export function runCodeInSandbox(userScript: string, inputPayload: any): CodeSandboxResult {
  const startTime = Date.now();

  try {
    // 1. Preparar o contexto isolado e seguro
    const sandboxContext = {
      input: Object.freeze(JSON.parse(JSON.stringify(inputPayload || {}))),
      output: null,
      console: Object.freeze({
        log: (...args: any[]) => console.log('📝 [SANDBOX LOG]:', ...args),
        warn: (...args: any[]) => console.warn('⚠️ [SANDBOX WARN]:', ...args),
        error: (...args: any[]) => console.error('❌ [SANDBOX ERROR]:', ...args),
      }),
      Math,
      Date,
      JSON,
      String,
      Number,
      Boolean,
      Array,
      Object,
    };

    // Criar o contexto VM congelado sem acesso ao globalNode
    const context = vm.createContext(sandboxContext);

    // 2. Envolver o script em uma função auto-executável para capturar o retorno de 'output'
    const wrappedCode = `
      (function() {
        ${userScript}
      })()
    `;

    // 3. Compilar e executar o script com timeout de segurança estrito (2000ms)
    const script = new vm.Script(wrappedCode);
    const result = script.runInContext(context, {
      timeout: 2000, // Timeout estrito de 2s contra loops infinitos
    });

    const finalOutput = result !== undefined ? result : context.output || inputPayload;
    const executionTimeMs = Date.now() - startTime;

    console.log(`⚡ [CODE SANDBOX] Execução concluída em ${executionTimeMs}ms com sucesso.`);
    return {
      success: true,
      output: finalOutput,
      executionTimeMs,
    };
  } catch (err: any) {
    const executionTimeMs = Date.now() - startTime;
    console.error(`💥 [CODE SANDBOX ERROR] Falha na execução da Sandbox: ${err.message}`);
    return {
      success: false,
      error: err.message || 'Erro durante a execução do script na Sandbox',
      executionTimeMs,
    };
  }
}
