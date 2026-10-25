export type SourceConnectionStatus =
  | "connected"
  | "available"
  | "limited"
  | "planned";

export interface JobSourceInfo {
  id: string;
  name: string;
  status: SourceConnectionStatus;
  description: string;
  opportunitiesDiscovered: number;
  lastSync?: string;
  requiresAuth: boolean;
}
