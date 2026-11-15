# Store listing draft

Name: Oasis

Short description: A local-first new-tab dashboard and bookmark library with spaces, notes, search and optional widgets.

Category: Productivity.

## Description

Make your new tab a useful place to return to. Oasis brings a quiet dashboard and an organized bookmark library together, with your saved content on your device.

Save pages from the toolbar, page/link context menu or a keyboard shortcut. Organize them with nested folders, colored tags, favorites and plain-text notes. Drag bookmarks into folders, arrange a manual order or review a copy/move to another space. Local statistics summarize your Library without adding tracking. Switch independent spaces for work, learning or personal projects. Find resources with typo-tolerant search, quoted phrases and folder, tag and domain filters. Save named search queries as custom smart collections, and review existing tag suggestions based on your other bookmarks from the same website. Both work offline. Smart collections surface recent additions and bookmarks that need organizing. Optional open counting adds recently and frequently opened collections.

Choose a light, dark or system theme, custom colors and offline illustrated backgrounds, or upload your own albums. Add your own daily quotes. Like or dislike backgrounds and quotes to adjust local rotation, optionally mix albums, and review or clear choices in Content preferences. Related content uses the same album or quote author; no external recommendation service is used. Arrange, hide or widen Home sections separately in each space. Keep the default Home minimal or enable a daily focus, world clocks, countdowns, focus timer and optional weather.

Import and export browser bookmark HTML, or use Oasis JSON to preserve bookmark notes and tags. Personal albums and quote collections have their own archives. Data stays in this browser profile; there is no account, cloud sync or automatic cross-device backup.

Toolbar capture can optionally read the current page’s description and cache small same-website icons/previews after you grant access and review them. No third-party lookup runs. Weather is optional and sends city searches and selected coordinates to Open-Meteo only after you enable it and grant access. Submitted web searches go to the search provider you choose. No analytics, ads or browsing-history permission.

## Privacy dashboard draft

Single purpose: Save, organize and access personal bookmarks from a customizable new-tab workspace.

Permission justifications:

- activeTab: prefill the explicit quick-capture form with the selected page’s title and URL.
- contextMenus: show user-invoked page and link capture actions.
- Optional scripting: read page details only through an explicit toolbar-capture action and temporary activeTab access. Same-origin raster copies are saved locally; access can be revoked in capture or browser settings.
- Optional host permissions for api.open-meteo.com and geocoding-api.open-meteo.com: user-enabled city search and weather forecasts. Core features do not need those hosts.
- New-tab override: display the user’s local dashboard and bookmark access.

Remote code: none. Scripts, styles and illustrated starter images are packaged. Weather responses are data, not executable code.

Data handling: local bookmark content, notes and optional Oasis open counts are stored in the browser profile. Optional page-detail reads fetch small same-origin images without cookies or referrer. Optional weather transmits city queries/selected coordinates to Open-Meteo. Explicit web searches and link navigation go to their chosen destinations. Do not claim that Oasis never makes network requests. Review the actual dashboard categories against this behavior before submitting; do not treat local storage as developer collection.

Owner-supplied fields before submission: public privacy-policy URL, support/repository URL, publisher identity/contact, markets and distribution visibility. No placeholder URLs are included in the manifest.
