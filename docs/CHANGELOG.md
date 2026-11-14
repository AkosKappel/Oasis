# Changelog

## Unreleased

- Initialize the local Oasis extension repository.
- Add WXT, React, TypeScript, Tailwind, and shadcn/ui foundations.
- Add a new-tab shell, initial Dexie data model, and database initialization test.
- Add project documentation and development checks.

- Implement local bookmark creation, editing, soft deletion, favorites, basic text filtering, and new-tab links.
- Validate bookmark URLs and enforce space ownership in the data-access layer.
- Add repository tests and a Playwright test against the built Chromium extension.

- Add folder and colored-tag management, bookmark assignment, organization filters and counts.
- Search folder/tag names alongside bookmark content and display organization on bookmark cards.
- Preserve bookmarks when folders/tags are deleted, validate assignments by space, and test transactional rollback.
- Add shared extension test setup and a browser organization workflow.
