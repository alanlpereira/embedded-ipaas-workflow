import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export interface RemoteCursorState {
  socketId: string;
  userEmail: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

interface RoomClient {
  socket: WebSocket;
  socketId: string;
  flowchartId: string;
  userEmail: string;
  userName: string;
  color: string;
  cursor?: { x: number; y: number };
}

const rooms = new Map<string, Map<string, RoomClient>>();

const USER_COLORS = ['#ec4899', '#00f2fe', '#f59e0b', '#10b981', '#a855f7', '#3b82f6'];

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/collaboration' });

  console.log('⚡ [WEBSOCKET] Servidor de Colaboração em Tempo Real pronto no endpoint /collaboration');

  wss.on('connection', (socket: WebSocket, req: any) => {
    const urlParams = new URLSearchParams(req.url?.split('?')[1] || '');
    const flowchartId = urlParams.get('flowId') || 'default-room';
    const userEmail = urlParams.get('userEmail') || 'anon@collaborator.com';
    const userName = urlParams.get('userName') || userEmail.split('@')[0];

    const socketId = `sock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const colorIndex = Math.floor(Math.random() * USER_COLORS.length);
    const color = USER_COLORS[colorIndex];

    const client: RoomClient = {
      socket,
      socketId,
      flowchartId,
      userEmail,
      userName,
      color,
    };

    if (!rooms.has(flowchartId)) {
      rooms.set(flowchartId, new Map());
    }

    const roomClients = rooms.get(flowchartId)!;
    roomClients.set(socketId, client);

    console.log(`🌐 [REALTIME ROOM] Usuário "${userName}" (${userEmail}) conectou-se na sala do fluxo "${flowchartId}". Total: ${roomClients.size}`);

    // Notificar o novo cliente com os cursores e colaboradores já presentes na sala
    broadcastRoomPresence(flowchartId);

    socket.on('message', (messageBuffer: any) => {
      try {
        const message = JSON.parse(messageBuffer.toString());

        if (message.type === 'CURSOR_MOVE') {
          client.cursor = { x: message.x, y: message.y };
          broadcastRoomCursors(flowchartId);
        } else if (message.type === 'STATE_CHANGE') {
          // Retransmitir mudanças nos nós e edges para todos os outros clientes na mesma sala
          broadcastToOthersInRoom(flowchartId, socketId, {
            type: 'STATE_CHANGE',
            nodes: message.nodes,
            edges: message.edges,
            senderId: socketId,
          });
        }
      } catch (err: any) {
        console.error('❌ Erro no processamento da mensagem WebSocket:', err.message);
      }
    });

    socket.on('close', () => {
      roomClients.delete(socketId);
      if (roomClients.size === 0) {
        rooms.delete(flowchartId);
      } else {
        broadcastRoomPresence(flowchartId);
      }
      console.log(`🔌 [REALTIME ROOM] Usuário "${userName}" desconectou da sala "${flowchartId}". Restantes: ${roomClients.size}`);
    });
  });
}

function broadcastRoomPresence(flowchartId: string) {
  const room = rooms.get(flowchartId);
  if (!room) return;

  const collaborators = Array.from(room.values()).map((c) => ({
    socketId: c.socketId,
    userEmail: c.userEmail,
    userName: c.userName,
    color: c.color,
  }));

  const payload = JSON.stringify({
    type: 'ROOM_PRESENCE',
    collaboratorsCount: collaborators.length,
    collaborators,
  });

  for (const client of room.values()) {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(payload);
    }
  }
}

function broadcastRoomCursors(flowchartId: string) {
  const room = rooms.get(flowchartId);
  if (!room) return;

  const cursors: RemoteCursorState[] = [];
  for (const client of room.values()) {
    if (client.cursor) {
      cursors.push({
        socketId: client.socketId,
        userEmail: client.userEmail,
        userName: client.userName,
        color: client.color,
        x: client.cursor.x,
        y: client.cursor.y,
      });
    }
  }

  const payload = JSON.stringify({
    type: 'CURSORS_UPDATE',
    cursors,
  });

  for (const client of room.values()) {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(payload);
    }
  }
}

function broadcastToOthersInRoom(flowchartId: string, senderSocketId: string, data: any) {
  const room = rooms.get(flowchartId);
  if (!room) return;

  const payload = JSON.stringify(data);
  for (const [socketId, client] of room.entries()) {
    if (socketId !== senderSocketId && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(payload);
    }
  }
}
