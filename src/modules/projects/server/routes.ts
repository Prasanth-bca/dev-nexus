import { ObjectId, type Collection, type Filter, type OptionalUnlessRequiredId, type UpdateFilter } from "mongodb";
import type { ModuleContext } from "@/lib/kernel/context";
import type { RouteDefinition } from "@/lib/kernel/types";
import { NOTES_COLLECTION, type NoteDoc } from "@/modules/notes/db/collections";
import { FILE_VAULT_COLLECTION, type FileVaultDoc } from "@/modules/file-vault/db/collections";
import { ACTIVITY_COLLECTION, toDTO as activityToDTO, type ActivityDoc } from "@/modules/activity/db/collections";
import {
  PROJECTS_COLLECTION,
  PROJECT_MEETINGS_COLLECTION,
  PROJECT_LINKS_COLLECTION,
  PROJECT_CONTACTS_COLLECTION,
  PROJECT_ENVIRONMENTS_COLLECTION,
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  ENVIRONMENT_STATUSES,
  slugify,
  projectToDTO,
  meetingToDTO,
  linkToDTO,
  contactToDTO,
  environmentToDTO,
  type ProjectDoc,
  type ProjectStatus,
  type ProjectPriority,
  type MeetingDoc,
  type QuickLinkDoc,
  type ContactDoc,
  type EnvironmentDoc,
  type EnvironmentStatus,
} from "../db/collections";

/** Secrets live in the kernel's own "secrets" collection (src/lib/kernel/secrets.ts) — referenced
 *  here by name only, so this module doesn't take a code dependency on kernel internals. */
const SECRETS_COLLECTION = "secrets";

function parseId(raw: string): ObjectId | null {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

function isStatus(v: unknown): v is ProjectStatus {
  return typeof v === "string" && (PROJECT_STATUSES as readonly string[]).includes(v);
}

function isPriority(v: unknown): v is ProjectPriority {
  return typeof v === "string" && (PROJECT_PRIORITIES as readonly string[]).includes(v);
}

function stringArray(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;
}

async function uniqueSlug(collection: Collection<ProjectDoc>, base: string, excludeId?: ObjectId): Promise<string> {
  let slug = base;
  let n = 2;
  for (;;) {
    const filter: Filter<ProjectDoc> = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };
    const existing = await collection.findOne(filter);
    if (!existing) return slug;
    slug = `${base}-${n++}`;
  }
}

// ---------------------------------------------------------------------------
// Generic CRUD for the four per-project sub-resources (Meetings, Quick Links,
// Contacts, Environments). They're structurally identical at the plumbing
// level (list-by-project / create / patch / delete) and differ only in their
// field shapes, which the sanitize functions below capture.
// ---------------------------------------------------------------------------

interface UpdatePatch<TDoc> {
  $set: Partial<TDoc>;
  $unset?: Record<string, "">;
}

function buildSubResourceRoutes<TDoc extends { projectId: string; createdAt: Date; updatedAt: Date }, TDTO>(opts: {
  resource: string;
  collection: () => Collection<TDoc>;
  sort: Record<string, 1 | -1>;
  sanitizeCreate: (body: Record<string, unknown>) => Omit<TDoc, "projectId" | "createdAt" | "updatedAt"> | { error: string };
  sanitizeUpdate: (body: Record<string, unknown>) => UpdatePatch<TDoc>;
  toDTO: (id: string, doc: TDoc) => TDTO;
}): RouteDefinition[] {
  const { resource, collection, sort, sanitizeCreate, sanitizeUpdate, toDTO } = opts;

  return [
    {
      method: "GET",
      path: `/:id/${resource}`,
      handler: async (_req, params) => {
        const docs = await collection()
          .find({ projectId: params.id } as Filter<TDoc>)
          .sort(sort)
          .toArray();
        return Response.json(docs.map((d) => toDTO(d._id.toString(), d as unknown as TDoc)));
      },
    },
    {
      method: "POST",
      path: `/:id/${resource}`,
      handler: async (req, params) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const sanitized = sanitizeCreate(body);
        if ("error" in sanitized) return Response.json({ error: sanitized.error }, { status: 400 });

        const now = new Date();
        const doc = { ...sanitized, projectId: params.id, createdAt: now, updatedAt: now } as TDoc;
        const { insertedId } = await collection().insertOne(doc as OptionalUnlessRequiredId<TDoc>);
        return Response.json(toDTO(insertedId.toString(), doc), { status: 201 });
      },
    },
    {
      method: "PUT",
      path: `/:id/${resource}/:subId`,
      handler: async (req, params) => {
        const _id = parseId(params.subId);
        if (!_id) return Response.json({ error: "invalid id" }, { status: 400 });

        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const patch = sanitizeUpdate(body);

        const result = await collection().findOneAndUpdate(
          { _id } as Filter<TDoc>,
          {
            $set: { ...patch.$set, updatedAt: new Date() },
            ...(patch.$unset ? { $unset: patch.$unset } : {}),
          } as UpdateFilter<TDoc>,
          { returnDocument: "after" }
        );
        if (!result) return Response.json({ error: "not found" }, { status: 404 });
        return Response.json(toDTO(result._id.toString(), result as unknown as TDoc));
      },
    },
    {
      method: "DELETE",
      path: `/:id/${resource}/:subId`,
      handler: async (_req, params) => {
        const _id = parseId(params.subId);
        if (!_id) return Response.json({ error: "invalid id" }, { status: 400 });
        await collection().deleteOne({ _id } as Filter<TDoc>);
        return Response.json({ ok: true });
      },
    },
  ];
}

/** Reads `body[key]` as a trimmed string. Absent → untouched; "" → $unset; non-empty → $set. */
function optionalString<TDoc>(body: Record<string, unknown>, key: keyof TDoc & string, patch: UpdatePatch<TDoc>) {
  if (!(key in body)) return;
  const raw = body[key];
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed) {
    patch.$set[key] = trimmed as TDoc[typeof key];
  } else {
    patch.$unset = { ...patch.$unset, [key]: "" };
  }
}

/** Same as optionalString but parses an ISO date string. */
function optionalDate<TDoc>(body: Record<string, unknown>, key: keyof TDoc & string, patch: UpdatePatch<TDoc>) {
  if (!(key in body)) return;
  const raw = body[key];
  if (typeof raw === "string" && raw.trim()) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) patch.$set[key] = d as TDoc[typeof key];
  } else {
    patch.$unset = { ...patch.$unset, [key]: "" };
  }
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

function sanitizeMeetingCreate(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return { error: "title is required" };
  const dateRaw = typeof body.date === "string" ? new Date(body.date) : null;
  if (!dateRaw || Number.isNaN(dateRaw.getTime())) return { error: "a valid date is required" };

  const nextMeetingRaw = typeof body.nextMeeting === "string" && body.nextMeeting.trim() ? new Date(body.nextMeeting) : undefined;
  const doc: Omit<MeetingDoc, "projectId" | "createdAt" | "updatedAt"> = {
    title,
    date: dateRaw,
    attendees: stringArray(body.attendees) ?? [],
    agenda: typeof body.agenda === "string" ? body.agenda : "",
    discussion: typeof body.discussion === "string" ? body.discussion : "",
    actionItems: stringArray(body.actionItems) ?? [],
    nextMeeting: nextMeetingRaw && !Number.isNaN(nextMeetingRaw.getTime()) ? nextMeetingRaw : undefined,
    recordingUrl: typeof body.recordingUrl === "string" ? body.recordingUrl.trim() || undefined : undefined,
  };
  return doc;
}

function sanitizeMeetingUpdate(body: Record<string, unknown>): UpdatePatch<MeetingDoc> {
  const patch: UpdatePatch<MeetingDoc> = { $set: {} };
  if (typeof body.title === "string" && body.title.trim()) patch.$set.title = body.title.trim();
  if (typeof body.date === "string") {
    const d = new Date(body.date);
    if (!Number.isNaN(d.getTime())) patch.$set.date = d;
  }
  if (body.attendees !== undefined) patch.$set.attendees = stringArray(body.attendees) ?? [];
  if (typeof body.agenda === "string") patch.$set.agenda = body.agenda;
  if (typeof body.discussion === "string") patch.$set.discussion = body.discussion;
  if (body.actionItems !== undefined) patch.$set.actionItems = stringArray(body.actionItems) ?? [];
  optionalDate(body, "nextMeeting", patch);
  optionalString(body, "recordingUrl", patch);
  return patch;
}

// ---------------------------------------------------------------------------
// Quick Links
// ---------------------------------------------------------------------------

function sanitizeLinkCreate(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!title || !url) return { error: "title and url are required" };
  const doc: Omit<QuickLinkDoc, "projectId" | "createdAt" | "updatedAt"> = {
    title,
    url,
    icon: typeof body.icon === "string" ? body.icon.trim() || undefined : undefined,
    category: typeof body.category === "string" ? body.category.trim() || undefined : undefined,
  };
  return doc;
}

function sanitizeLinkUpdate(body: Record<string, unknown>): UpdatePatch<QuickLinkDoc> {
  const patch: UpdatePatch<QuickLinkDoc> = { $set: {} };
  if (typeof body.title === "string" && body.title.trim()) patch.$set.title = body.title.trim();
  if (typeof body.url === "string" && body.url.trim()) patch.$set.url = body.url.trim();
  optionalString(body, "icon", patch);
  optionalString(body, "category", patch);
  return patch;
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

function sanitizeContactCreate(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "name is required" };
  const doc: Omit<ContactDoc, "projectId" | "createdAt" | "updatedAt"> = {
    name,
    role: typeof body.role === "string" ? body.role.trim() || undefined : undefined,
    email: typeof body.email === "string" ? body.email.trim() || undefined : undefined,
    phone: typeof body.phone === "string" ? body.phone.trim() || undefined : undefined,
    notes: typeof body.notes === "string" ? body.notes.trim() || undefined : undefined,
  };
  return doc;
}

function sanitizeContactUpdate(body: Record<string, unknown>): UpdatePatch<ContactDoc> {
  const patch: UpdatePatch<ContactDoc> = { $set: {} };
  if (typeof body.name === "string" && body.name.trim()) patch.$set.name = body.name.trim();
  optionalString(body, "role", patch);
  optionalString(body, "email", patch);
  optionalString(body, "phone", patch);
  optionalString(body, "notes", patch);
  return patch;
}

// ---------------------------------------------------------------------------
// Environments
// ---------------------------------------------------------------------------

function isEnvironmentStatus(v: unknown): v is EnvironmentStatus {
  return typeof v === "string" && (ENVIRONMENT_STATUSES as readonly string[]).includes(v);
}

function sanitizeEnvironmentCreate(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "name is required" };
  const doc: Omit<EnvironmentDoc, "projectId" | "createdAt" | "updatedAt"> = {
    name,
    status: isEnvironmentStatus(body.status) ? body.status : "Unknown",
    url: typeof body.url === "string" ? body.url.trim() || undefined : undefined,
    server: typeof body.server === "string" ? body.server.trim() || undefined : undefined,
    database: typeof body.database === "string" ? body.database.trim() || undefined : undefined,
    notes: typeof body.notes === "string" ? body.notes.trim() || undefined : undefined,
  };
  return doc;
}

function sanitizeEnvironmentUpdate(body: Record<string, unknown>): UpdatePatch<EnvironmentDoc> {
  const patch: UpdatePatch<EnvironmentDoc> = { $set: {} };
  if (typeof body.name === "string" && body.name.trim()) patch.$set.name = body.name.trim();
  if (isEnvironmentStatus(body.status)) patch.$set.status = body.status;
  optionalString(body, "url", patch);
  optionalString(body, "server", patch);
  optionalString(body, "database", patch);
  optionalString(body, "notes", patch);
  return patch;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function buildRoutes(ctx: ModuleContext): RouteDefinition[] {
  const projects = () => ctx.db.collection<ProjectDoc>(PROJECTS_COLLECTION);
  const meetings = () => ctx.db.collection<MeetingDoc>(PROJECT_MEETINGS_COLLECTION);
  const links = () => ctx.db.collection<QuickLinkDoc>(PROJECT_LINKS_COLLECTION);
  const contacts = () => ctx.db.collection<ContactDoc>(PROJECT_CONTACTS_COLLECTION);
  const environments = () => ctx.db.collection<EnvironmentDoc>(PROJECT_ENVIRONMENTS_COLLECTION);

  const projectRoutes: RouteDefinition[] = [
    {
      method: "GET",
      path: "/",
      handler: async (req) => {
        const params = new URL(req.url).searchParams;
        const q = params.get("q")?.trim().toLowerCase();
        const status = params.get("status");
        const priority = params.get("priority");
        const tag = params.get("tag");

        const filter: Filter<ProjectDoc> = {};
        if (isStatus(status)) filter.status = status;
        if (isPriority(priority)) filter.priority = priority;
        if (tag) filter.tags = tag;

        // Defensive ceiling, not real pagination — no "load more" UI exists client-side, so
        // this is set far above any realistic personal project count.
        let docs = await projects().find(filter).sort({ updatedAt: -1 }).limit(1000).toArray();
        if (q) {
          docs = docs.filter((p) => `${p.name} ${p.description} ${p.tags.join(" ")} ${p.techStack.join(" ")}`.toLowerCase().includes(q));
        }
        return Response.json(docs.map(projectToDTO));
      },
    },
    {
      method: "POST",
      path: "/",
      handler: async (req) => {
        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) return Response.json({ error: "name is required" }, { status: 400 });

        const now = new Date();
        const slug = await uniqueSlug(projects(), slugify(name));
        const startDate = typeof body.startDate === "string" && body.startDate.trim() ? new Date(body.startDate) : undefined;
        const targetDate = typeof body.targetDate === "string" && body.targetDate.trim() ? new Date(body.targetDate) : undefined;

        const doc: ProjectDoc = {
          name,
          slug,
          description: typeof body.description === "string" ? body.description : "",
          status: isStatus(body.status) ? body.status : "Planning",
          priority: isPriority(body.priority) ? body.priority : "Medium",
          icon: typeof body.icon === "string" ? body.icon.trim() || undefined : undefined,
          color: typeof body.color === "string" ? body.color.trim() || undefined : undefined,
          tags: stringArray(body.tags) ?? [],
          techStack: stringArray(body.techStack) ?? [],
          repos: stringArray(body.repos) ?? [],
          startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : undefined,
          targetDate: targetDate && !Number.isNaN(targetDate.getTime()) ? targetDate : undefined,
          createdAt: now,
          updatedAt: now,
        };

        const { insertedId } = await projects().insertOne(doc);
        ctx.events.emit("projects.created", { id: insertedId.toString(), name: doc.name });
        return Response.json(projectToDTO({ ...doc, _id: insertedId }), { status: 201 });
      },
    },
    {
      method: "GET",
      path: "/slug/:slug",
      handler: async (_req, params) => {
        const doc = await projects().findOne({ slug: params.slug });
        if (!doc) return Response.json({ error: "not found" }, { status: 404 });
        return Response.json(projectToDTO(doc));
      },
    },
    {
      method: "GET",
      path: "/:id",
      handler: async (_req, params) => {
        const _id = parseId(params.id);
        if (!_id) return Response.json({ error: "invalid id" }, { status: 400 });
        const doc = await projects().findOne({ _id });
        if (!doc) return Response.json({ error: "not found" }, { status: 404 });
        return Response.json(projectToDTO(doc));
      },
    },
    {
      method: "PUT",
      path: "/:id",
      handler: async (req, params) => {
        const _id = parseId(params.id);
        if (!_id) return Response.json({ error: "invalid id" }, { status: 400 });

        const body = await req.json().catch(() => ({}) as Record<string, unknown>);
        const patch: UpdatePatch<ProjectDoc> = { $set: { updatedAt: new Date() } };

        if (typeof body.name === "string" && body.name.trim()) {
          const name = body.name.trim();
          patch.$set.name = name;
          const current = await projects().findOne({ _id });
          if (current && current.name !== name) {
            patch.$set.slug = await uniqueSlug(projects(), slugify(name), _id);
          }
        }
        if (typeof body.description === "string") patch.$set.description = body.description;
        if (isStatus(body.status)) patch.$set.status = body.status;
        if (isPriority(body.priority)) patch.$set.priority = body.priority;
        if (body.tags !== undefined) patch.$set.tags = stringArray(body.tags) ?? [];
        if (body.techStack !== undefined) patch.$set.techStack = stringArray(body.techStack) ?? [];
        if (body.repos !== undefined) patch.$set.repos = stringArray(body.repos) ?? [];
        optionalString(body, "icon", patch);
        optionalString(body, "color", patch);
        optionalDate(body, "startDate", patch);
        optionalDate(body, "targetDate", patch);

        const result = await projects().findOneAndUpdate(
          { _id },
          { $set: patch.$set, ...(patch.$unset ? { $unset: patch.$unset } : {}) },
          { returnDocument: "after" }
        );
        if (!result) return Response.json({ error: "not found" }, { status: 404 });

        ctx.events.emit("projects.updated", { id: params.id, name: result.name });
        return Response.json(projectToDTO(result));
      },
    },
    {
      method: "DELETE",
      path: "/:id",
      handler: async (_req, params) => {
        const _id = parseId(params.id);
        if (!_id) return Response.json({ error: "invalid id" }, { status: 400 });

        const doc = await projects().findOneAndDelete({ _id });
        if (!doc) return Response.json({ error: "not found" }, { status: 404 });

        await Promise.all([
          meetings().deleteMany({ projectId: params.id }),
          links().deleteMany({ projectId: params.id }),
          contacts().deleteMany({ projectId: params.id }),
          environments().deleteMany({ projectId: params.id }),
          ctx.db.collection<NoteDoc>(NOTES_COLLECTION).updateMany({ projectId: params.id }, { $unset: { projectId: "" } }),
          ctx.db.collection<FileVaultDoc>(FILE_VAULT_COLLECTION).updateMany({ projectId: params.id }, { $unset: { projectId: "" } }),
          ctx.db.collection(SECRETS_COLLECTION).updateMany({ projectId: params.id }, { $unset: { projectId: "" } }),
        ]);

        ctx.events.emit("projects.deleted", { id: params.id, name: doc.name });
        return Response.json({ ok: true });
      },
    },
    {
      method: "GET",
      path: "/:id/overview",
      handler: async (_req, params) => {
        const projectId = params.id;
        const [noteIds, fileIds, secretCount, meetingCount, linkCount, contactCount, environmentCount, project] = await Promise.all([
          ctx.db.collection<NoteDoc>(NOTES_COLLECTION).find({ projectId }, { projection: { _id: 1 } }).toArray(),
          ctx.db.collection<FileVaultDoc>(FILE_VAULT_COLLECTION).find({ projectId }, { projection: { _id: 1 } }).toArray(),
          ctx.db.collection(SECRETS_COLLECTION).countDocuments({ projectId }),
          meetings().countDocuments({ projectId }),
          links().countDocuments({ projectId }),
          contacts().countDocuments({ projectId }),
          environments().countDocuments({ projectId }),
          projects().findOne({ _id: parseId(projectId) ?? new ObjectId() }),
        ]);
        if (!project) return Response.json({ error: "not found" }, { status: 404 });

        const ids = [...noteIds.map((n) => n._id.toString()), ...fileIds.map((f) => f._id.toString())];
        const recentActivity = ids.length
          ? await ctx.db
              .collection<ActivityDoc>(ACTIVITY_COLLECTION)
              .find({ "payload.id": { $in: ids } })
              .sort({ timestamp: -1 })
              .limit(5)
              .toArray()
          : [];

        return Response.json({
          counts: {
            repos: project.repos.length,
            notes: noteIds.length,
            files: fileIds.length,
            secrets: secretCount,
            meetings: meetingCount,
            links: linkCount,
            contacts: contactCount,
            environments: environmentCount,
          },
          recentActivity: recentActivity.map((d) => activityToDTO(d._id.toString(), d)),
        });
      },
    },
    {
      method: "GET",
      path: "/:id/activity",
      handler: async (req, params) => {
        const projectId = params.id;
        const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 50, 200);

        const [noteIds, fileIds] = await Promise.all([
          ctx.db.collection<NoteDoc>(NOTES_COLLECTION).find({ projectId }, { projection: { _id: 1 } }).toArray(),
          ctx.db.collection<FileVaultDoc>(FILE_VAULT_COLLECTION).find({ projectId }, { projection: { _id: 1 } }).toArray(),
        ]);
        const ids = [...noteIds.map((n) => n._id.toString()), ...fileIds.map((f) => f._id.toString())];
        if (!ids.length) return Response.json([]);

        const docs = await ctx.db
          .collection<ActivityDoc>(ACTIVITY_COLLECTION)
          .find({ "payload.id": { $in: ids } })
          .sort({ timestamp: -1 })
          .limit(limit)
          .toArray();
        return Response.json(docs.map((d) => activityToDTO(d._id.toString(), d)));
      },
    },
  ];

  return [
    ...projectRoutes,
    ...buildSubResourceRoutes<MeetingDoc, ReturnType<typeof meetingToDTO>>({
      resource: "meetings",
      collection: meetings,
      sort: { date: -1 },
      sanitizeCreate: sanitizeMeetingCreate,
      sanitizeUpdate: sanitizeMeetingUpdate,
      toDTO: meetingToDTO,
    }),
    ...buildSubResourceRoutes<QuickLinkDoc, ReturnType<typeof linkToDTO>>({
      resource: "links",
      collection: links,
      sort: { createdAt: -1 },
      sanitizeCreate: sanitizeLinkCreate,
      sanitizeUpdate: sanitizeLinkUpdate,
      toDTO: linkToDTO,
    }),
    ...buildSubResourceRoutes<ContactDoc, ReturnType<typeof contactToDTO>>({
      resource: "contacts",
      collection: contacts,
      sort: { name: 1 },
      sanitizeCreate: sanitizeContactCreate,
      sanitizeUpdate: sanitizeContactUpdate,
      toDTO: contactToDTO,
    }),
    ...buildSubResourceRoutes<EnvironmentDoc, ReturnType<typeof environmentToDTO>>({
      resource: "environments",
      collection: environments,
      sort: { name: 1 },
      sanitizeCreate: sanitizeEnvironmentCreate,
      sanitizeUpdate: sanitizeEnvironmentUpdate,
      toDTO: environmentToDTO,
    }),
  ];
}
