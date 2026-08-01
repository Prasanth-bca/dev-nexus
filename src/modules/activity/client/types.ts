export interface ActivityEvent {
  id: string;
  type: string;
  moduleId: string;
  summary: string;
  href?: string;
  timestamp: string;
}
