export type NodeType = 'trigger' | 'action' | 'decision' | 'approval' | 'output';
export interface WorkflowNodeData {
    label: string;
    type: NodeType;
    description?: string;
    config?: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
}
export interface WorkflowNode {
    id: string;
    type: NodeType;
    position: {
        x: number;
        y: number;
    };
    data: WorkflowNodeData;
}
export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string;
    animated?: boolean;
    style?: Record<string, any>;
}
export interface WorkflowCanvasState {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}
