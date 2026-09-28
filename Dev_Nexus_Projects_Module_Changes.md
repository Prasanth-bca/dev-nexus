# Dev Nexus --- Projects Module Changes

## 1. Objective

Simplify the Projects module so it is:

-   Minimal
-   Fast to understand
-   Easy to maintain
-   Low manual data entry
-   Visually clean
-   Focused on developer workflow
-   Based on linked data instead of duplicated data

### Core principle

> **Manually enter the minimum. Automatically collect the maximum.**

The Projects module should work as a **developer workspace and project
context layer**, not as a full project-management system.

------------------------------------------------------------------------

# 2. Current Problems

The current Projects module contains too much information and too many
visual elements.

### Problems

-   Too many project tabs
-   Too many large statistic cards
-   Too much manual data entry
-   Overview contains information that is not always useful
-   All information has almost equal visual importance
-   Empty cards create unnecessary visual noise
-   Manual management of contacts, meetings, environments, dates, etc.
    increases maintenance
-   Project Overview feels more like a dashboard than a developer
    workspace

------------------------------------------------------------------------

# 3. Simplified Project Data Model

Only the following should be required or commonly managed manually.

## Project Fields

  Field          Required   Notes
  -------------- ---------- -----------------------------------------------
  Project Name   Yes        Main project name
  Description    Yes        Short 1--2 line description
  Status         Yes        Planning, Active, Paused, Completed, Archived
  Priority       Yes        Low, Medium, High
  Tags           Optional   AI, ERPNext, Automation, etc.
  Tech Stack     Optional   Prefer automatic detection where possible
  Repository     Optional   Connect GitHub/Git repositories

### Remove from initial project creation

Do not require users to enter:

-   Custom icon
-   Custom color
-   Start date
-   Target date
-   Contacts
-   Meetings
-   Environment details
-   Activity records
-   Links
-   Secrets

These should be optional secondary information or automatically
generated where possible.

------------------------------------------------------------------------

# 4. Automatic Data Collection

The system should automatically collect information whenever an
integration is available.

## GitHub / Repository Integration

When a repository is connected, automatically retrieve:

-   Repository name
-   Repository URL
-   Default branch
-   Last commit
-   Last commit time
-   Repository languages
-   Contributors
-   README
-   Repository activity

Example:

``` text
SVCF Backend

Python · FastAPI · Docker · ERPNext

Last commit
2 hours ago

Branch
main
```

The user should not manually enter information that can already be
retrieved from GitHub.

------------------------------------------------------------------------

# 5. Reduce Project Tabs

Replace the current 11-tab navigation:

``` text
Overview
Repositories
Notes
Files
Secrets
Meetings
Links
Contacts
Environments
Activity
Settings
```

with 5 primary sections:

``` text
Overview
Code
Docs
Activity
Settings
```

------------------------------------------------------------------------

# 6. New Tab Structure

## 6.1 Overview

Purpose:

> Give the developer a quick understanding of the project.

Show only important information:

-   Project name
-   Status
-   Priority
-   Short description
-   Tech stack
-   Primary repository
-   Recent activity

Do not show a large grid of resource counts.

------------------------------------------------------------------------

## 6.2 Code

Group technical resources here.

### Repositories

-   Connected GitHub repositories
-   Repository status
-   Last commit
-   Branch
-   Repository URL
-   Languages

### Environments

Show only useful deployment information:

``` text
Development    ● Online
Staging        ● Online
Production     ● Online
```

Environment details should be optional and preferably
integration-driven.

------------------------------------------------------------------------

## 6.3 Docs

Group project documentation here.

### Includes

-   Notes
-   Files
-   Links

Important principle:

> These remain owned by their original modules and are only linked to
> the project.

Example:

``` text
File Vault
    ↓
Project Link
    ↓
SVCF Project
```

Do not duplicate files or notes inside the project.

------------------------------------------------------------------------

## 6.4 Activity

Create an automatically generated project timeline.

Examples:

``` text
2 hours ago
● GitHub commit pushed

Yesterday
● Project note updated

2 days ago
● Repository connected

3 days ago
● File linked

5 days ago
● Project status changed
```

Activity should be generated from existing system events wherever
possible.

Avoid requiring users to manually create activity entries.

------------------------------------------------------------------------

## 6.5 Settings

Project configuration only.

### Project Details

-   Name
-   Description
-   Status
-   Priority
-   Tags
-   Tech stack

### Secrets

Keep secrets here but never expose secret values in Overview.

### Integrations

-   GitHub
-   Other future integrations

------------------------------------------------------------------------

# 7. Project List UI

The Project List should provide enough information to understand
projects without opening them.

## Layout

``` text
Projects                                      + New Project

[ Search projects... ]   [Status ▾]   [Tags ▾]


┌──────────────────────────────────────────────────────┐
│ SVCF Project                              ● Active   │
│ MultiBranch Chit Company                             │
│                                                      │
│ Python · ERPNext · Automation                        │
│                                                      │
│ GitHub: svcf                         Updated 2h ago   │
└──────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────┐
│ SmartOps                                  ● Active   │
│ AI-powered ERP automation                            │
│                                                      │
│ FastAPI · PostgreSQL · React                         │
│                                                      │
│ GitHub: smartops                  Updated yesterday  │
└──────────────────────────────────────────────────────┘
```

### Project Card should show

-   Project name
-   Status
-   Priority indicator
-   Short description
-   Tags / tech stack
-   Primary repository
-   Last updated information

### Do not show by default

-   Number of notes
-   Number of files
-   Number of meetings
-   Number of contacts
-   Number of environments
-   Number of secrets

Counts should only appear where they provide meaningful context.

------------------------------------------------------------------------

# 8. Project Overview UI/UX

## Recommended structure

``` text
← Projects

SVCF Project                         ● Active   Medium
MultiBranch Chit Company

[Overview] [Code] [Docs] [Activity] [Settings]


┌──────────────────────────────────────────────────────────┐
│ Project                                                  │
│                                                          │
│ SVCF Project                                             │
│ MultiBranch Chit Company                                 │
│                                                          │
│ ERPNext · Automation · Python                            │
│                                                          │
│ GitHub                                                    │
│ github.com/company/svcf                         ↗        │
└──────────────────────────────────────────────────────────┘


┌──────────────────────┐  ┌────────────────────────────────┐
│ Tech Stack           │  │ Recent Activity                │
│                      │  │                                │
│ Python               │  │ ● Commit pushed       2h ago  │
│ FastAPI              │  │ ● Note updated        1d ago  │
│ PostgreSQL           │  │ ● Repository synced   2d ago  │
│ Docker               │  │                                │
└──────────────────────┘  └────────────────────────────────┘
```

------------------------------------------------------------------------

# 9. Card Usage Rules

Do not create a card for every piece of information.

### Avoid

``` text
┌──────────────┐
│ 0 Repos      │
└──────────────┘

┌──────────────┐
│ 0 Notes      │
└──────────────┘

┌──────────────┐
│ 0 Files      │
└──────────────┘
```

### Prefer

``` text
┌─────────────────────────────────────────────────────┐
│ Repository                                           │
│                                                     │
│ ● SVCF                                               │
│ github.com/company/svcf                              │
│                                                     │
│ Python · Docker · ERPNext                            │
│                                                     │
│ Last commit 2h ago                              ↗   │
└─────────────────────────────────────────────────────┘
```

Use cards for meaningful groups, not individual statistics.

------------------------------------------------------------------------

# 10. Project Creation UX

Project creation should be very fast.

## Create Project

``` text
Create Project

Project name
[ SVCF Project                         ]

Description
[ MultiBranch Chit Company             ]

Status
[ Active ▾ ]

Priority
[ Medium ▾ ]

Tags
[ ERPNext ] [ Automation ]

Repository
[ Connect GitHub repository            ]


                         Cancel   Create
```

### Required interaction

The user should be able to create a project in less than a minute.

Additional information can be configured later.

------------------------------------------------------------------------

# 11. Linking Architecture

Maintain the existing principle:

> **Everything is linked, not copied.**

Project should act as a relationship/context layer.

``` text
                    ┌─────────────┐
                    │   PROJECT   │
                    └──────┬──────┘
                           │
       ┌──────────┬────────┼────────┬──────────┐
       ↓          ↓        ↓        ↓          ↓
    GitHub      Notes     Files   Meetings   Contacts
       │          │        │        │          │
       └──────────┴────────┴────────┴──────────┘
                           │
                    Project Activity
```

Resources should remain owned by their original modules.

Examples:

``` text
Notes Module
    ↓
Note #123
    ↓
linked to Project #10
```

``` text
File Vault
    ↓
File #456
    ↓
linked to Project #10
```

Do not create duplicate project-specific copies.

------------------------------------------------------------------------

# 12. UI/UX Design Direction

Keep the existing Dev Nexus visual language, but simplify it.

## Keep

-   Light background
-   Soft purple/blue accent
-   Rounded corners
-   Subtle borders
-   Very light shadows
-   Clean typography
-   Generous whitespace
-   Small status indicators

## Change

-   Reduce number of cards
-   Reduce visual containers
-   Reduce unnecessary statistics
-   Reduce tab count
-   Improve information hierarchy
-   Make primary actions more visible
-   Prefer compact sections over large empty cards

------------------------------------------------------------------------

# 13. Typography

Recommended hierarchy:

``` text
Project Name
22–24px / Semibold

Section Title
14–16px / Semibold

Normal Content
13–14px

Metadata
12px
```

Avoid making every label visually prominent.

------------------------------------------------------------------------

# 14. Status Design

Use small status indicators instead of large badges.

Example:

``` text
● Active
● Planning
● Paused
● Completed
● Archived
```

Suggested semantic colors:

-   Active → Green
-   Planning → Blue/Purple
-   Paused → Amber
-   Completed → Neutral/Green
-   Archived → Gray

The status indicator should remain visually subtle.

------------------------------------------------------------------------

# 15. Priority Design

Keep priority lightweight.

``` text
Low       ·
Medium    ·
High      ·
```

Do not create large colored priority blocks.

Priority should support scanning, not dominate the interface.

------------------------------------------------------------------------

# 16. Responsive UX

The project page should work well on:

-   Desktop
-   Laptop
-   Tablet
-   Mobile

### Desktop

Use a two-column layout where useful:

``` text
Main content          Secondary information
────────────────      ─────────────────────
Project details       Tech stack
Repository            Recent activity
                      Environment
```

### Mobile

Stack everything vertically:

``` text
Project header

Tabs → horizontal scroll

Project details

Repository

Tech stack

Recent activity
```

Avoid horizontally overflowing dashboards.

------------------------------------------------------------------------

# 17. Empty States

Do not show empty statistic cards such as:

``` text
0 Repositories
0 Notes
0 Files
```

Instead use contextual empty states.

Example:

``` text
Repositories

No repository connected yet.

[ Connect GitHub ]
```

For Notes:

``` text
No project notes yet.

[ Add Note ]
```

This makes the UI feel intentional instead of empty.

------------------------------------------------------------------------

# 18. Secrets UX

Secrets should never be displayed in the Overview.

Inside Settings:

``` text
Secrets

DATABASE_URL          ••••••••••••
GITHUB_TOKEN          ••••••••••••
AWS_ACCESS_KEY        ••••••••••••

                         [Add Secret]
```

Values should remain masked and encrypted.

------------------------------------------------------------------------

# 19. Final Project Module

The final structure should be:

``` text
Projects
│
├── Project List
│   ├── Search
│   ├── Status Filter
│   ├── Tag Filter
│   └── Project Cards
│
└── Project
    │
    ├── Overview
    │
    ├── Code
    │   ├── Repositories
    │   └── Environments
    │
    ├── Docs
    │   ├── Notes
    │   ├── Files
    │   └── Links
    │
    ├── Activity
    │
    └── Settings
        ├── Project Details
        ├── Secrets
        └── Integrations
```

------------------------------------------------------------------------

# 20. Final UX Principles

### Principle 1

**Minimum manual entry.**

### Principle 2

**Automatically collect information whenever possible.**

### Principle 3

**One source of truth.**

### Principle 4

**Do not show information just because it exists.**

### Principle 5

**Overview should answer three questions immediately:**

``` text
What is this project?
Where is the code/documentation?
What is happening recently?
```

### Principle 6

**Use fewer cards and stronger information hierarchy.**

### Principle 7

**Keep advanced information one click away instead of showing everything
at once.**

### Final direction

> **Dev Nexus Projects should feel like a clean developer workspace, not
> a project-management application.**

The user should be able to open a project and understand its identity,
code, documentation, and recent activity within a few seconds.
