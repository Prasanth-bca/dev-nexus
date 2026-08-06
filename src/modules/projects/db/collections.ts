export const PROJECTS_COLLECTION = "projects";
export const PROJECT_MEETINGS_COLLECTION = "project_meetings";
export const PROJECT_LINKS_COLLECTION = "project_links";
export const PROJECT_CONTACTS_COLLECTION = "project_contacts";
export const PROJECT_ENVIRONMENTS_COLLECTION = "project_environments";

export const PROJECT_STATUSES = ["Planning", "Active", "Paused", "Completed", "Archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export interface ProjectDoc {
  name: string;
  slug: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  icon?: string;
  color?: string;
  tags: string[];
  techStack: string[];
  /** GitHub repos linked to this project, as "owner/repo" full names — repos are never
   *  duplicated into our DB, they're fetched live from GitHub via the stored PAT. */
  repos: string[];
  startDate?: Date;
  targetDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDTO extends Omit<ProjectDoc, "startDate" | "targetDate" | "createdAt" | "updatedAt"> {
  _id: string;
  startDate?: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

export function projectToDTO(doc: ProjectDoc & { _id: { toString(): string } }): ProjectDTO {
  return {
    ...doc,
    _id: doc._id.toString(),
    startDate: doc.startDate?.toISOString(),
    targetDate: doc.targetDate?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

export const ENVIRONMENT_STATUSES = ["Online", "Offline", "Maintenance", "Unknown"] as const;
export type EnvironmentStatus = (typeof ENVIRONMENT_STATUSES)[number];

export interface MeetingDoc {
  projectId: string;
  title: string;
  date: Date;
  attendees: string[];
  agenda: string;
  discussion: string;
  actionItems: string[];
  nextMeeting?: Date;
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingDTO extends Omit<MeetingDoc, "date" | "nextMeeting" | "createdAt" | "updatedAt"> {
  _id: string;
  date: string;
  nextMeeting?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuickLinkDoc {
  projectId: string;
  title: string;
  url: string;
  icon?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuickLinkDTO extends Omit<QuickLinkDoc, "createdAt" | "updatedAt"> {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactDoc {
  projectId: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactDTO extends Omit<ContactDoc, "createdAt" | "updatedAt"> {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentDoc {
  projectId: string;
  name: string;
  url?: string;
  server?: string;
  database?: string;
  status: EnvironmentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentDTO extends Omit<EnvironmentDoc, "createdAt" | "updatedAt"> {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export function meetingToDTO(id: string, doc: MeetingDoc): MeetingDTO {
  return {
    ...doc,
    _id: id,
    date: doc.date.toISOString(),
    nextMeeting: doc.nextMeeting?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function linkToDTO(id: string, doc: QuickLinkDoc): QuickLinkDTO {
  return { ...doc, _id: id, createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString() };
}

export function contactToDTO(id: string, doc: ContactDoc): ContactDTO {
  return { ...doc, _id: id, createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString() };
}

export function environmentToDTO(id: string, doc: EnvironmentDoc): EnvironmentDTO {
  return { ...doc, _id: id, createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString() };
}
