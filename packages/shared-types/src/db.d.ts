export type UserRole = 'Master' | 'Admin' | 'Viewer';
export interface Organization {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}
export interface Profile {
    id: string;
    organization_id: string;
    email: string;
    full_name?: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
}
export interface Flowchart {
    id: string;
    organization_id: string;
    name: string;
    description?: string | null;
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
    viewport?: {
        x: number;
        y: number;
        zoom: number;
    };
    is_published: boolean;
    created_at: string;
    updated_at: string;
}
