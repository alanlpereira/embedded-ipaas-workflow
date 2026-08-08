import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { mediaCallbackRouter } from './routes/mediaCallback.js';
import { aiRouter } from './routes/ai.js';
import { auditRouter } from './routes/audit.js';
import { approvalRouter } from './routes/approvals.js';
import { vaultRouter } from './routes/vault.js';
import { demoRouter } from './routes/demo.js';
import { folderRouter } from './routes/folders.js';
import executionsRouter from './routes/executions.js';
import { setupWebSocketServer } from './websocket.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Registrar Roteadores
app.use('/api/v1/media', mediaCallbackRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/executions', executionsRouter);
app.use('/api/approvals', approvalRouter);
app.use('/api/v1/vault', vaultRouter);
app.use('/api/v1/folders', folderRouter);
app.use('/api/v1', demoRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), server: 'Embedded iPaaS Backend Engine' });
});

const server = createServer(app);

// Inicializar Servidor WebSocket para Colaboração em Tempo Real (Yjs Protocol)
setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 [SERVER ENGINE] Servidor HTTP & WebSockets rodando em http://localhost:${PORT}`);
});
