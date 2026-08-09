import { processWorkflowJob, ExecutionJobData, ExecutionResult } from './executor.js';

class WorkflowExecutionQueue {
  private inMemoryQueue: ExecutionJobData[] = [];
  private isProcessing = false;
  private completedExecutions = new Map<string, ExecutionResult>();

  constructor() {
    console.log('📦 [QUEUE MANAGER] Fila assíncrona de execuções inicializada (Modo Resiliente).');
  }

  /**
   * Adiciona uma nova execução de workflow à fila
   */
  public async addJob(flowchartId: string, payload: any): Promise<ExecutionJobData> {
    const executionId = crypto.randomUUID();
    const jobData: ExecutionJobData = {
      executionId,
      flowchartId,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.inMemoryQueue.push(jobData);
    console.log(`📥 [QUEUE] Job enfileirado com sucesso: Execution ID #${executionId} para o Flowchart ID "${flowchartId}"`);

    // Inicia o processamento assíncrono em segundo plano se a fila estiver ociosa
    setImmediate(() => this.processNextJob());

    return jobData;
  }

  /**
   * Processador de jobs em background
   */
  private async processNextJob() {
    if (this.isProcessing || this.inMemoryQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.inMemoryQueue.shift();

    if (job) {
      const execId = job.executionId || crypto.randomUUID();
      try {
        const result = await processWorkflowJob(job);
        this.completedExecutions.set(execId, result);
      } catch (err: any) {
        console.error(`💥 [QUEUE ERROR] Falha no processamento do Job ${execId}:`, err.message);
      }
    }

    this.isProcessing = false;

    // Se houver mais jobs pendentes, continua
    if (this.inMemoryQueue.length > 0) {
      setImmediate(() => this.processNextJob());
    }
  }

  /**
   * Obter resultado de uma execução concluída
   */
  public getExecutionResult(executionId: string): ExecutionResult | undefined {
    return this.completedExecutions.get(executionId);
  }
}

export const workflowQueue = new WorkflowExecutionQueue();
