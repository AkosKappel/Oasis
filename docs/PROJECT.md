# Oasis — Project Blueprint

**Document type:** Product & Technical Specification  
**Project status:** Planning / Pre-development  
**Document version:** 0.1.0  
**Last updated:** 2026-11-12  
**Product name:** Oasis  
**Working tagline:** Your personal space on the web.

---

# 1. Project Overview

## 1.1 Vision

Oasis is a modern, customizable browser experience that combines the beauty and simplicity of a personal browser dashboard with the organizational power of a bookmark manager.

It aims to become the user's personal home on the web: a place to access frequently used websites, organize useful resources, discover saved content and manage everyday browsing activities.

Oasis takes inspiration from:

- **Momentum** — beautiful new-tab experience, daily focus, widgets and productivity features.
- **Raindrop.io** — bookmark management, collections, folders, tags and search.
- **Raycast / Spotlight** — keyboard-first navigation and command palette.
- **Notion** — customizable workspaces and flexible organization.

Oasis should combine these ideas into one cohesive, fast and intuitive experience.

## 1.2 Product principles

1. **Beautiful and minimal:** Clean, modern UI with attention to typography, spacing and details.
2. **Powerful organization:** Flexible folders, tags, spaces and smart collections.
3. **Fast access:** Excellent search, keyboard shortcuts and command palette.
4. **Customizable:** Users control their dashboard, appearance, widgets and preferences.
5. **Local-first:** The application should work without requiring an account or internet connection for core functionality.
6. **Privacy-conscious:** User data belongs to the user.
7. **Extensible:** Architecture should support additional features without major restructuring.
8. **Free initially:** Core functionality should not be artificially restricted.

## 1.3 Target audience

Initial target audience:

- People who use their browser extensively.
- Developers and technical users.
- People who collect many useful websites and resources.
- People who enjoy productivity tools and customization.
- Users who want a more useful new-tab experience.

Initial development will be driven by personal requirements, with the intention of making Oasis suitable for public release.

---

# 2. Product Structure

Oasis will initially be a browser extension that replaces the default new-tab page.

The application will have several interconnected areas.

## 2.1 Dashboard

The primary new-tab experience.

Purpose:
- Provide quick access to frequently used websites.
- Display useful information and widgets.
- Offer an aesthetically pleasing browsing environment.
- Provide access to the user's spaces and collections.

## 2.2 Library

A dedicated bookmark management interface.

Purpose:
- Store and organize links.
- Browse folders and collections.
- Manage tags.
- Search saved resources.
- Add notes and descriptions.
- Maintain saved content.

## 2.3 Search

A global search experience available throughout Oasis.

Purpose:
- Find bookmarks quickly.
- Search folders and tags.
- Find commands and application actions.
- Support advanced filtering and fuzzy matching.

## 2.4 Statistics

An overview of user activity and library usage.

Purpose:
- Show bookmark collection growth.
- Display frequently accessed resources.
- Track activity.
- Provide insights into browsing habits.

## 2.5 Settings

A centralized configuration area.

Purpose:
- Customize appearance.
- Manage dashboard layouts and widgets.
- Configure preferences and keyboard shortcuts.
- Manage data and synchronization.
- Configure privacy options.

---

# 3. Feature Specification

Feature priorities:

- **P0:** Essential for MVP.
- **P1:** Important for early releases.
- **P2:** Future enhancement.
- **P3:** Long-term idea.

Feature statuses:

- Planned
- In progress
- Implemented
- Deferred
- Rejected

## 3.1 Bookmark Management

**Priority: P0**

The central functionality of Oasis.

### Core functionality

- [ ] Add bookmarks.
- [ ] Edit bookmarks.
- [ ] Delete bookmarks.
- [ ] Open bookmarks.
- [ ] Store page title and URL.
- [ ] Automatically retrieve website favicons.
- [ ] Automatically retrieve page descriptions.
- [ ] Store preview images where available.
- [ ] Mark bookmarks as favorites.
- [ ] Pin important bookmarks.
- [ ] Support custom bookmark icons.
- [ ] Support custom bookmark descriptions.
- [ ] Support custom ordering.
- [ ] Support multiple bookmark views.

### Bookmark metadata

Each bookmark should support:

- Title
- URL
- Description
- Favicon
- Preview image
- Folder assignment
- Multiple tags
- Notes
- Creation date
- Last modified date
- Last opened date
- Open count
- Favorite status
- Custom icon (optional)
- Custom icon color (optional)

### Bookmark views

- [ ] Grid view.
- [ ] List view.
- [ ] Compact list view.
- [ ] Configurable card density.
- [ ] Sorting by name, creation date and last opened.
- [ ] Manual sorting through drag and drop.

## 3.2 Folders and Collections

**Priority: P0**

Folders provide hierarchical organization.

### Features

- [ ] Create folders.
- [ ] Rename folders.
- [ ] Delete folders.
- [ ] Nest folders.
- [ ] Assign custom icons.
- [ ] Customize folder icon colors.
- [ ] Drag and drop bookmarks between folders.
- [ ] Drag and drop folders to reorder them.
- [ ] Display bookmark counts.
- [ ] Support custom sorting.

Folders represent where a bookmark belongs.

A bookmark should initially belong to one folder, with an optional root-level location.

### Smart Folders

**Priority: P1**

Smart folders are dynamic collections based on configurable conditions.

Unlike normal folders, their contents are generated automatically.

Initial predefined smart folders:

- Recently Added
- Recently Opened
- Frequently Opened
- Favorites
- Untagged
- Unorganized
- All Bookmarks

Potential future smart folders:

- Recently Modified
- Unused Bookmarks
- Broken Links
- Duplicate Bookmarks
- Bookmarks from a Specific Domain
- Bookmarks with Specific Tags

Eventually, users should be able to create their own smart folders using rules.

Example:

`Development Resources`

Conditions:
- Tag is `development`
- OR domain contains `github.com`
- AND bookmark is not archived

Smart folders should update automatically when bookmarks change.

## 3.3 Tags

**Priority: P0**

Tags provide non-hierarchical categorization.

### Features

- [ ] Create tags.
- [ ] Rename tags.
- [ ] Delete tags.
- [ ] Assign multiple tags to bookmarks.
- [ ] Assign custom colors.
- [ ] Search by tags.
- [ ] Filter bookmarks by tags.
- [ ] Display tag counts.
- [ ] Support tag management.

Tags should not have a hierarchical structure.

A bookmark can belong to one folder and have multiple tags.

Example:

Folder: Development

Tags:
- Tools
- Open Source
- Coding
- Productivity

## 3.4 Multiple Spaces / Workspaces

**Priority: P1**

One of the important distinguishing features of Oasis.

Users should be able to create multiple independent spaces for different contexts.

Examples:

- Personal
- Work
- Development
- Learning
- Projects

Each space should have its own:

- Bookmarks
- Folders
- Tags
- Smart folders
- Dashboard layout
- Widget configuration
- Preferences (where appropriate)

### Features

- [ ] Create spaces.
- [ ] Rename spaces.
- [ ] Delete spaces.
- [ ] Assign icons and colors.
- [ ] Switch between spaces.
- [ ] Configure separate dashboard layouts.
- [ ] Configure separate widgets.
- [ ] Keep bookmarks isolated between spaces.
- [ ] Optionally support moving or copying bookmarks between spaces.

Potential future functionality:

- Shared spaces.
- Collaborative spaces.
- Export/import individual spaces.
- Space-specific synchronization.

Important architectural consideration:

Spaces should be represented explicitly in the data model from the beginning, even if the first release only creates one default space.

## 3.5 Search

**Priority: P0**

Search should be one of the strongest features of Oasis.

It must remain fast even with thousands of bookmarks.

### Searchable fields

- Bookmark titles.
- URLs.
- Domains.
- Descriptions.
- Notes.
- Folder names.
- Tags.
- Space names.

### Matching techniques

- Exact matching.
- Partial matching.
- Fuzzy matching.
- Typo tolerance.
- Multi-word matching.
- Case-insensitive matching.
- Search by domain.
- Search by tag.
- Search by folder.

### Search operators

Potential syntax:

`tag:development`

`folder:resources`

`domain:github.com`

`is:favorite`

`is:untagged`

`is:recent`

### Advanced functionality

- [ ] Search across all spaces.
- [ ] Search within the current space.
- [ ] Search history.
- [ ] Keyboard navigation.
- [ ] Highlight matching text.
- [ ] Configurable search behavior.
- [ ] Advanced filters.

Potential libraries:
- Fuse.js
- MiniSearch

Initial implementation should prioritize fast local search with fuzzy matching.

Full-text indexing of external web pages can be considered later.

## 3.6 Command Palette

**Priority: P0**

Inspired by Raycast and Spotlight.

The command palette should be accessible through a configurable keyboard shortcut.

Suggested default: `Ctrl + K` / `Cmd + K`.

### Features

- [ ] Global bookmark search.
- [ ] Search folders.
- [ ] Search tags.
- [ ] Navigate to application sections.
- [ ] Add bookmarks.
- [ ] Create folders.
- [ ] Create tags.
- [ ] Switch spaces.
- [ ] Change themes.
- [ ] Trigger application actions.
- [ ] Display keyboard shortcuts.
- [ ] Support fuzzy command matching.
- [ ] Keyboard-only navigation.

The command palette should become the primary keyboard-driven interaction mechanism.

## 3.7 Dashboard Customization

**Priority: P0 / P1**

The dashboard should be highly customizable.

Unlike Momentum, where some elements have relatively fixed positions, Oasis should give users control over their dashboard layout.

### Layout functionality

- [ ] Move components around the page.
- [ ] Drag and drop widgets.
- [ ] Resize supported widgets.
- [ ] Hide and show widgets.
- [ ] Configure widget positions.
- [ ] Configure widget sizes.
- [ ] Save layouts independently for each space.
- [ ] Support multiple layout presets.
- [ ] Reset to default layout.

Potential future feature:

Allow users to create multiple dashboard layouts and switch between them.

Example:
- Minimal
- Productivity
- Work
- Personal
- Focus

The layout system should be flexible enough to support additional widgets without major changes.

## 3.8 Widgets and Productivity

**Priority: P1**

Oasis should support modular dashboard widgets.

Initial widget ideas:

### Time and Date

- [ ] Digital clock.
- [ ] Analog clock.
- [ ] Date display.
- [ ] Multiple timezone clocks.
- [ ] Day percentage clock.
- [ ] Year percentage clock.
- [ ] Week percentage clock.
- [ ] Countdown timers.

### Productivity

- [ ] Pomodoro timer.
- [ ] Daily focus.
- [ ] To-do list.
- [ ] Quick notes.
- [ ] Daily goals.
- [ ] Focus session tracking.

### Information

- [ ] Weather.
- [ ] Daily quote.
- [ ] Daily photo.
- [ ] Calendar events.
- [ ] Recently opened links.
- [ ] Recently added bookmarks.
- [ ] Frequently opened links.

### Bookmark widgets

- [ ] Favorites.
- [ ] Pinned links.
- [ ] Recently added.
- [ ] Frequently opened.
- [ ] Custom folder.
- [ ] Smart folder.

Widgets should have configurable settings and should be independently movable and hideable.

## 3.9 Notes and Annotations

**Priority: P1**

Allow users to attach notes to bookmarks.

Features:

- [ ] Add notes to bookmarks.
- [ ] Edit notes.
- [ ] Support basic Markdown formatting.
- [ ] Search notes.
- [ ] Display notes in bookmark details.
- [ ] Optional quick notes widget.

Potential future features:

- Highlight saved page content.
- Multiple annotations per bookmark.
- Rich text notes.
- Standalone notes.

The initial implementation should remain lightweight rather than becoming a full note-taking application.

## 3.10 Statistics and Activity

**Priority: P1**

Provide useful information about the user's bookmark library and activity.

### Collection statistics

- Total bookmarks.
- Total folders.
- Total tags.
- Total spaces.
- Bookmarks added over time.
- Bookmarks per folder.
- Bookmarks per domain.
- Tag usage.

### Usage statistics

- Most frequently opened bookmarks.
- Most frequently visited domains.
- Recently opened bookmarks.
- Most active folders.
- Most active tags.
- Links not accessed recently.

### Activity visualization

Potential GitHub-style activity heatmap.

Track:
- Bookmarks saved.
- Bookmarks opened.
- Daily activity.
- Weekly and monthly trends.

Statistics should be privacy-conscious and configurable.

## 3.11 Link Health and Maintenance

**Priority: P1 / P2**

Help users maintain a healthy bookmark library.

### Features

- [ ] Detect broken links.
- [ ] Detect duplicate URLs.
- [ ] Detect missing page titles.
- [ ] Detect missing favicons.
- [ ] Identify unorganized bookmarks.
- [ ] Identify bookmarks without tags.
- [ ] Identify unused bookmarks.
- [ ] Display link health status.
- [ ] Allow manual link verification.
- [ ] Provide optional scheduled checks.

Future possibilities:
- Detect redirects.
- Detect changed URLs.
- Detect unavailable domains.
- Archive important web pages.

Automated checking should respect privacy, rate limits and website restrictions.

## 3.12 Quick Bookmark Capture

**Priority: P0**

Saving a bookmark should be extremely easy.

Possible methods:

- [ ] Save current tab using extension popup.
- [ ] Save current tab using keyboard shortcut.
- [ ] Right-click context menu.
- [ ] Paste URL into command palette.
- [ ] Save multiple selected tabs.
- [ ] Drag URL into a folder.
- [ ] Automatically retrieve page metadata.

Potential future functionality:

Suggest folders and tags based on bookmark content and existing organization.

## 3.13 Tab Management

**Priority: P2**

Save groups of browser tabs as collections.

Features:

- Save all open tabs.
- Save selected tabs.
- Name tab collections.
- Reopen all tabs.
- Reopen selected tabs.
- Associate tab collections with spaces.

Example:

`Project Oasis Research`

Contains 12 saved browser tabs.

## 3.14 Appearance and Personalization

**Priority: P0 / P1**

Customization is an important part of the Oasis identity.

### Themes

- [ ] Light theme.
- [ ] Dark theme.
- [ ] System theme.
- [ ] Custom accent colors.
- [ ] Custom background colors.
- [ ] Preset themes.

### Typography

- [ ] Font family selection.
- [ ] Font size configuration.
- [ ] Font weight preferences.
- [ ] Typography presets.

### Layout

- [ ] Grid and list preferences.
- [ ] Card density.
- [ ] Sidebar configuration.
- [ ] Widget positioning.
- [ ] Background customization.
- [ ] Spacing preferences.

### Icons

Potential icon sources:

- Lucide.
- Simple Icons.
- Material Symbols.
- Website favicons.

Support searchable icon selection for folders, spaces and bookmarks.

### Backgrounds

- Daily photos.
- Custom uploaded images.
- Solid colors.
- Gradients.
- Optional background blur.
- Optional image overlays.

### General preferences

- Keyboard shortcuts.
- Default bookmark view.
- Default space.
- Default folder.
- Search preferences.
- Date and time format.
- Language.
- Privacy settings.

---

# 4. Technical Architecture

## 4.1 Selected Technology Stack

The initial stack is agreed upon.

| Area | Technology |
|---|---|
| Extension framework | WXT |
| UI framework | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Local database | IndexedDB |
| IndexedDB wrapper | Dexie.js |
| State management | Zustand |
| Fuzzy search | Fuse.js |
| Alternative search | MiniSearch |
| Command palette | cmdk |
| Drag and drop | dnd-kit |
| Forms and validation | Zod |
| Charts | Recharts |
| Icons | Lucide + Simple Icons |
| Animations | Motion |
| Future backend | Supabase |
| Database | PostgreSQL |
| Future authentication | Supabase Auth |

Library choices can be revisited during implementation if better alternatives emerge.

## 4.2 Browser Extension

Use WXT with Manifest V3.

Initial browser targets:
- Google Chrome.
- Microsoft Edge.

Potential later targets:
- Firefox.
- Other Chromium-based browsers.

Main extension components:

- New-tab page.
- Background service worker.
- Extension popup.
- Content scripts where needed.
- Context menu integration.
- Keyboard commands.

The new-tab page will be the primary interface.

## 4.3 Local-first Architecture

**Preferred initial approach.**

Core functionality should work without a backend.

Data is stored locally using IndexedDB through Dexie.js.

Benefits:
- No account required.
- No hosting costs for core functionality.
- Offline functionality.
- Fast data access.
- Better privacy.
- Simpler initial infrastructure.

The application should have a clean data-access layer so database implementation details do not leak into UI components.

## 4.4 Backend and Synchronization

**Status: OPEN DECISION**

Cloud synchronization is desirable but not yet finalized.

Leading candidate: Supabase.

Potential backend functionality:
- User authentication.
- Cloud bookmark storage.
- Synchronization between devices.
- Backup and restore.
- Cross-browser synchronization.
- Shared spaces in the future.

Possible architecture:

Local IndexedDB remains the primary application interface.

A synchronization layer communicates changes with Supabase when enabled.

Important requirements:
- Stable record IDs.
- Creation and modification timestamps.
- Deletion tracking.
- Conflict resolution.
- Schema versioning.
- Migration support.

Do not tightly couple the application to Supabase before the synchronization model is designed.

## 4.5 Proposed Project Structure

```text
oasis/
├── entrypoints/
│   ├── newtab/
│   ├── popup/
│   ├── background.ts
│   └── content.ts
│
├── src/
│   ├── components/
│   │   ├── bookmarks/
│   │   ├── folders/
│   │   ├── tags/
│   │   ├── spaces/
│   │   ├── search/
│   │   ├── command-palette/
│   │   ├── dashboard/
│   │   ├── widgets/
│   │   └── ui/
│   │
│   ├── features/
│   │   ├── bookmarks/
│   │   ├── collections/
│   │   ├── statistics/
│   │   ├── settings/
│   │   ├── appearance/
│   │   └── import-export/
│   │
│   ├── database/
│   │   ├── schema.ts
│   │   ├── bookmarks.ts
│   │   ├── folders.ts
│   │   ├── tags.ts
│   │   └── spaces.ts
│   │
│   ├── hooks/
│   ├── lib/
│   ├── stores/
│   ├── types/
│   └── assets/
│
├── docs/
│   ├── PROJECT.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   └── CHANGELOG.md
│
├── public/
├── package.json
├── tsconfig.json
└── wxt.config.ts
```

This structure is a starting proposal. Adjust it to WXT conventions during repository setup.

---

# 5. Initial Data Model

The following is a conceptual data model, not the final database schema.

## 5.1 Space

```typescript
interface Space {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}
```

## 5.2 Bookmark

```typescript
interface Bookmark {
  id: string;
  spaceId: string;
  folderId?: string;

  title: string;
  url: string;
  description?: string;

  favicon?: string;
  image?: string;

  notes?: string;
  tags: string[];

  isFavorite: boolean;
  isPinned: boolean;

  customIcon?: string;
  customIconColor?: string;

  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
  openCount: number;
}
```

## 5.3 Folder

```typescript
interface Folder {
  id: string;
  spaceId: string;
  parentId?: string;

  name: string;
  icon?: string;
  color?: string;

  sortOrder: number;

  createdAt: number;
  updatedAt: number;
}
```

## 5.4 Tag

```typescript
interface Tag {
  id: string;
  spaceId: string;

  name: string;
  color: string;

  createdAt: number;
  updatedAt: number;
}
```

## 5.5 Smart Folder

```typescript
interface SmartFolder {
  id: string;
  spaceId: string;

  name: string;
  icon?: string;

  rules: {
    field: string;
    operator: string;
    value?: string;
  }[];

  matchMode: "all" | "any";

  createdAt: number;
  updatedAt: number;
}
```

## 5.6 Dashboard Widget

```typescript
interface DashboardWidget {
  id: string;
  spaceId: string;

  type: string;
  title?: string;

  position: {
    x: number;
    y: number;
  };

  size: {
    width: number;
    height: number;
  };

  visible: boolean;
  settings: Record<string, unknown>;
}
```

## 5.7 Important data considerations

- Use stable IDs instead of relying on names.
- Support schema migrations from the beginning.
- Make space ownership explicit.
- Store dates consistently.
- Use a flexible settings structure for widgets.
- Consider soft deletion or deletion tombstones for future synchronization.
- Define folder deletion behavior carefully.
- Avoid storing unnecessary personal browsing data.

---

# 6. User Experience and Design Direction

## 6.1 Design Philosophy

Oasis should feel:

- Modern.
- Calm.
- Minimal.
- Premium.
- Functional.
- Personal.

Avoid excessive borders, unnecessary shadows, visual clutter and too many simultaneous widgets.

The interface should feel cohesive even when users heavily customize it.

## 6.2 Navigation

Proposed navigation:

- Dashboard
- Library
- Favorites
- Smart Folders
- Statistics
- Settings

Spaces should be accessible from a prominent space selector.

The command palette should provide an alternative navigation mechanism.

## 6.3 Layout Direction

Initial concept:

- Optional sidebar.
- Prominent global search.
- Main dashboard canvas.
- Movable widgets.
- Customizable bookmark sections.
- Space selector.
- Minimal settings and navigation controls.

Users should be able to hide elements they don't need.

---

# 7. Privacy, Security and Data Ownership

Important principles:

- No account required for initial use.
- Local storage by default.
- No unnecessary tracking.
- No analytics without appropriate user consent.
- Clear export functionality.
- Clear data deletion functionality.
- Transparent synchronization behavior.

Future cloud functionality should be opt-in.

Sensitive information should not be collected unnecessarily.

---

# 8. Development Roadmap

## Version 0.1 — Project Foundation

**Status: Planned**

- [ ] Create Git repository.
- [ ] Initialize WXT.
- [ ] Configure React and TypeScript.
- [ ] Configure Tailwind CSS.
- [ ] Integrate shadcn/ui.
- [ ] Establish project structure.
- [ ] Configure ESLint and formatting.
- [ ] Configure development scripts.
- [ ] Create initial design system.
- [ ] Set up IndexedDB and Dexie.js.
- [ ] Implement initial database schema.

## Version 0.2 — Core Bookmark Management

- [ ] Create bookmarks.
- [ ] Edit bookmarks.
- [ ] Delete bookmarks.
- [ ] Automatic favicon retrieval.
- [ ] Folder management.
- [ ] Tag management.
- [ ] Favorites.
- [ ] Basic bookmark grid.
- [ ] Basic bookmark list.
- [ ] Import/export.

## Version 0.3 — Search and Navigation

- [ ] Global search.
- [ ] Fuzzy matching.
- [ ] Search filters.
- [ ] Command palette.
- [ ] Keyboard shortcuts.
- [ ] Bookmark quick capture.
- [ ] Context menu integration.

## Version 0.4 — Dashboard

- [ ] New-tab dashboard.
- [ ] Space selector.
- [ ] Recently added section.
- [ ] Frequently opened section.
- [ ] Favorites widget.
- [ ] Customizable widget layout.
- [ ] Drag and drop.
- [ ] Theme customization.

## Version 0.5 — Advanced Organization

- [ ] Nested folders.
- [ ] Smart folders.
- [ ] Advanced tag management.
- [ ] Bookmark notes.
- [ ] Multiple spaces.
- [ ] Space-specific layouts.
- [ ] Bulk operations.

## Version 0.6 — Personalization

- [ ] Custom accent colors.
- [ ] Typography settings.
- [ ] Custom backgrounds.
- [ ] Daily photos.
- [ ] Daily quotes.
- [ ] Clock widgets.
- [ ] Day percentage clock.
- [ ] Pomodoro timer.
- [ ] Customizable dashboard presets.

## Version 0.7 — Statistics and Maintenance

- [ ] Bookmark statistics.
- [ ] Activity heatmap.
- [ ] Most visited domains.
- [ ] Frequently opened bookmarks.
- [ ] Duplicate detection.
- [ ] Broken link detection.
- [ ] Library maintenance tools.

## Version 0.8 — Cloud Synchronization

**Status: Conditional / Not yet committed**

- [ ] Finalize backend decision.
- [ ] Design synchronization architecture.
- [ ] Set up Supabase if selected.
- [ ] Authentication.
- [ ] Cloud database.
- [ ] Sync engine.
- [ ] Conflict resolution.
- [ ] Backup and restore.

## Version 1.0 — Public Release

- [ ] Complete MVP functionality.
- [ ] Polish UI and interactions.
- [ ] Test performance.
- [ ] Test browser compatibility.
- [ ] Test data migrations.
- [ ] Review privacy and security.
- [ ] Write user documentation.
- [ ] Prepare extension store assets.
- [ ] Publish first stable version.

Version numbers and milestones are provisional and can be reorganized as development progresses.

---

# 9. Backlog and Future Ideas

Ideas that are interesting but not currently required.

### Productivity
- Multiple Pomodoro configurations.
- Daily goals.
- To-do lists.
- Calendar integration.
- Countdown widgets.
- Habit tracking.

### Bookmark intelligence
- Automatic tag suggestions.
- Automatic folder suggestions.
- AI-powered search.
- Semantic search.
- Automatic categorization.
- Related bookmark suggestions.

### Content management
- Full-text page indexing.
- Web page archiving.
- Article reading mode.
- Text highlighting.
- Multiple annotations.
- PDF support.

### Advanced functionality
- Shared collections.
- Collaboration.
- Mobile companion.
- Standalone web application.
- Public API.
- Third-party integrations.
- Community widget ecosystem.
- Custom themes.
- Custom widget development.

---

# 10. Open Questions and Decisions

These questions should be revisited during planning and development.

| Question | Current position |
|---|---|
| Browser extension or web app? | Extension first |
| Frontend-only or backend? | Local-first initially |
| Backend provider? | Supabase candidate |
| Authentication? | Not needed for MVP |
| Cloud synchronization? | Desired, not finalized |
| Multiple spaces? | Yes |
| Space-specific bookmarks? | Yes |
| Dashboard customization? | Yes |
| Movable widgets? | Yes |
| Smart folders? | Yes |
| Free or paid? | Free initially |
| Browser support? | Chrome and Edge first |
| Open source? | Undecided |
| AI features? | Future possibility |

---

# 11. Product Differentiation

Oasis should not simply replicate Momentum or Raindrop.

Its main differentiators should be:

1. A beautiful new-tab experience combined with a real bookmark manager.
2. Excellent global search and keyboard-first navigation.
3. Flexible spaces for different contexts.
4. Smart folders and powerful organization.
5. Fully customizable dashboard with movable widgets.
6. Useful statistics and bookmark maintenance.
7. Local-first architecture and privacy.
8. A cohesive experience rather than several disconnected productivity tools.

---

# 12. Project Management and Versioning

This document is intended to be a living project specification.

It should be updated whenever significant decisions, features or architectural changes are made.

## Document versioning

Use semantic versioning for the document:

- **Major:** Significant changes to product direction or architecture.
- **Minor:** New sections, substantial features or new decisions.
- **Patch:** Corrections, clarifications and small updates.

## Feature lifecycle

Features should follow this lifecycle:

Idea → Planned → In Progress → Implemented → Released

Alternative statuses:
- Deferred
- Rejected
- Needs Discussion

## Release management

Each release should document:

- Version number.
- Release date.
- New features.
- Improvements.
- Bug fixes.
- Breaking changes.
- Technical changes.
- Outstanding issues.

## Suggested repository documentation

| File | Purpose |
|---|---|
| `docs/PROJECT.md` | Main product specification and project blueprint |
| `docs/ARCHITECTURE.md` | Technical architecture and implementation decisions |
| `docs/ROADMAP.md` | Development milestones and priorities |
| `docs/CHANGELOG.md` | Release history |
| `docs/DECISIONS.md` | Important architectural and product decisions |
| `README.md` | Project introduction and setup instructions |

The main PROJECT document should link to the other documents as they are created.

## Initial Changelog

### 0.1.0 — 2026-11-12

Initial project blueprint created.

- Defined Oasis product vision.
- Identified Momentum, Raindrop, Raycast and Notion as inspiration.
- Established initial product principles.
- Defined bookmark management features.
- Added folders, tags and smart folders.
- Added multiple spaces.
- Added customizable dashboard and widgets.
- Added global search and command palette.
- Added statistics and link maintenance.
- Added notes and tab management.
- Selected initial technology stack.
- Proposed local-first architecture.
- Identified Supabase as a potential future backend.
- Defined initial data model.
- Created provisional development roadmap.

---

# 13. Current Project Status

**Current stage: Product planning / Repository not yet initialized.**

### Confirmed decisions

- [x] Project name: Oasis.
- [x] Browser extension as initial product.
- [x] WXT.
- [x] React.
- [x] TypeScript.
- [x] Tailwind CSS.
- [x] shadcn/ui.
- [x] Dexie.js / IndexedDB.
- [x] Lucide and Simple Icons.
- [x] Local-first as initial architectural direction.
- [x] Multiple spaces as a product feature.
- [x] Customizable dashboard as a product feature.
- [x] Smart folders as a product feature.

### Outstanding decisions

- [ ] Finalize the backend and synchronization strategy.
- [ ] Finalize the initial dashboard design.
- [ ] Finalize the MVP feature scope.
- [ ] Finalize the initial database schema.
- [ ] Determine browser support beyond Chrome and Edge.
- [ ] Decide whether the project will be open source.

### Immediate next steps

1. Create the Git repository.
2. Initialize the WXT project.
3. Set up React, TypeScript and Tailwind.
4. Integrate shadcn/ui.
5. Establish the initial folder structure.
6. Set up Dexie.js.
7. Implement the initial data model.
8. Start designing the Oasis dashboard.

---

**End of Project Blueprint — Version 0.1.0**

This document is the initial source of truth for Oasis. Future product discussions, implementation decisions, feature additions and releases should be reflected here or in the corresponding project documentation.
