export type NotificationType =
  | "match"
  | "concern"
  | "cv"
  | "interview"
  | "application"
  | "announcement";

export interface Notification {
  id: string;
  type: NotificationType;
  priority: "normal" | "high";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  opportunityId?: string;
}
