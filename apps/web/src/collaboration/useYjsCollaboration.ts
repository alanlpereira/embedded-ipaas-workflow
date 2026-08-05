import { useEffect, useState, useRef, useCallback } from 'react';
import { WorkflowNode, WorkflowEdge } from '@ipaas/shared-types';

export interface RemoteCursor {
  socketId: string;
  userEmail: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

export interface CollaboratorInfo {
  socketId: string;
  userEmail: string;
  userName: string;
  color: string;
}

interface UseYjsCollaborationProps {
  flowchartId: string;
  userEmail: string;
  userName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onRemoteStateChange: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
}

export function useYjsCollaboration({
  flowchartId,
  userEmail,
  userName,
  nodes,
  edges,
  onRemoteStateChange,
}: UseYjsCollaborationProps) {
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [activeCollaborators, setActiveCollaborators] = useState<CollaboratorInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const mySocketIdRef = useRef<string | null>(null);
  const isSelfChangeRef = useRef(false);

  useEffect(() => {
    if (!flowchartId) return;

    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const wsProtocol = isHttps ? 'wss:' : 'ws:';
    const customBackend = import.meta.env.VITE_BACKEND_URL
      ? import.meta.env.VITE_BACKEND_URL.replace(/^https?:\/\//, '')
      : (typeof window !== 'undefined' ? window.location.host : 'synapse.alp-nexus.com');

    const wsUrl = `${wsProtocol}//${customBackend}/collaboration?flowId=${encodeURIComponent(
      flowchartId
    )}&userEmail=${encodeURIComponent(userEmail)}&userName=${encodeURIComponent(userName)}`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      console.log(`🌐 [REALTIME] Conectado à sala de colaboração "${flowchartId}" como "${userName}"`);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'ROOM_PRESENCE') {
          setActiveCollaborators(data.collaborators || []);
        } else if (data.type === 'CURSORS_UPDATE') {
          const filteredCursors = (data.cursors || []).filter(
            (c: RemoteCursor) => c.userEmail !== userEmail
          );
          setRemoteCursors(filteredCursors);
        } else if (data.type === 'STATE_CHANGE') {
          if (data.senderId !== mySocketIdRef.current) {
            isSelfChangeRef.current = true;
            onRemoteStateChange(data.nodes, data.edges);
            setTimeout(() => {
              isSelfChangeRef.current = false;
            }, 50);
          }
        }
      } catch (err: any) {
        console.error('❌ Erro no recebimento de mensagem WS:', err.message);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log(`🔌 [REALTIME] Desconectado da sala "${flowchartId}"`);
    };

    return () => {
      socket.close();
    };
  }, [flowchartId, userEmail, userName]);

  // Transmitir posição do mouse local (Live Cursor)
  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'CURSOR_MOVE',
          x,
          y,
        })
      );
    }
  }, []);

  // Transmitir alterações de estado dos nós/edges para os outros clientes da sala
  const broadcastStateChange = useCallback((newNodes: WorkflowNode[], newEdges: WorkflowEdge[]) => {
    if (isSelfChangeRef.current) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'STATE_CHANGE',
          nodes: newNodes,
          edges: newEdges,
        })
      );
    }
  }, []);

  return {
    isConnected,
    remoteCursors,
    activeCollaborators,
    sendCursorPosition,
    broadcastStateChange,
  };
}
