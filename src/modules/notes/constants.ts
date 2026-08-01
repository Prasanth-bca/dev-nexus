export const CATEGORIES = ["Development", "Ideas", "Learning", "Meeting", "Personal"] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Template {
  id: string;
  name: string;
  content: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "blank",
    name: "Blank Note",
    content: "",
  },
  {
    id: "meeting",
    name: "Meeting Note",
    content: `## Meeting Notes

**Date:**
**Attendees:**

### Agenda
-

### Notes


### Action Items
- [ ] `,
  },
  {
    id: "api",
    name: "API Documentation",
    content: `## API:

**Endpoint:** \`METHOD /path\`

### Request
\`\`\`json
{}
\`\`\`

### Response
\`\`\`json
{}
\`\`\`

### Notes
`,
  },
  {
    id: "idea",
    name: "Idea",
    content: `## Idea:

### Problem


### Proposed Solution


### Next Steps
- `,
  },
];
