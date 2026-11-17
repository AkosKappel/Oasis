# Manual release testing

A hands-on checklist for the first public version. Automated checks already cover most logic in headless Chromium. This list is for what only a person in a real browser can judge: native permission prompts, the toolbar, context menus, shortcuts, assistive technology, and whether each feature behaves the way you intended.

Paths use the visible labels. "Settings" is the gear button on Home (bottom right) or the Settings button in Library. "More Library tools" is the menu button in the Library toolbar.

## Before you start

- [ ] Use a fresh browser profile (or a copy of yours), so the first-run flow and permission prompts start clean.
- [ ] Build with `pnpm build` (or `pnpm zip`), then load `.output/chrome-mv3` through `chrome://extensions` → Developer mode → Load unpacked. Repeat in Edge (`edge://extensions`) and, for the experimental target, Firefox (`about:debugging` → Load Temporary Add-on → `.output/firefox-mv3/manifest.json`).
- [ ] On the extensions page, confirm Oasis asks for no site access at install. Only the new tab, context menus and the toolbar action should be listed.
- [ ] Keep a bookmark HTML export from your real browser at hand for the import test.
- [ ] Note the browser and OS versions you test. Record results in the matrix in [RELEASE.md](RELEASE.md).

## First run

- [ ] Open a new tab. The "Welcome to Oasis" dialog appears.
- [ ] Change Clock format and Theme, then choose Start using Oasis. Reload: both choices stay.
- [ ] In a second profile, press Escape or Skip setup. No banner is left behind and it does not return.
- [ ] Choose Import bookmarks or a backup. It opens Settings → Backup and restore.
- [ ] Your browser may ask whether to keep the changed new-tab page. Accept it and confirm the new tab stays Oasis after a browser restart.

## Home

- [ ] Clock and date: switch Settings → General → Clock format between System, 12-hour and 24-hour; toggle Show date.
- [ ] Search box with Home search = Bookmarks: typing and pressing Enter opens the search dialog with your query and matching bookmarks.
- [ ] Settings → General → Home search: pick Google, DuckDuckGo, Bing and Brave in turn. Enter opens that engine with your query. Nothing is sent while typing.
- [ ] Ctrl+K (Cmd+K on macOS) opens "Search Oasis" from Home and Library. Arrow keys select, Enter opens, Escape closes and returns focus.
- [ ] Settings → Home layout: hide, reorder and widen sections, then Save layout. Reset layout restores the default. Open a second tab and confirm it follows.

## Links panel (Home → Links)

- [ ] The panel shows Favorites, Recently used and Frequently used, then your folders as a tree, then links without a folder.
- [ ] Search links and Filter by tag narrow every section. Matching folders open automatically.
- [ ] Tiles view: the grid button next to the tag filter switches to tiles. Folder tiles open in place; the path at the top and Back return. Reload: the view you picked stays.
- [ ] Reorder links (arrow button): drag links, or use the arrow buttons, in both list and tiles views. Library's Manual order shows the same order.
- [ ] Pin Links on a wide window (1024 px or more): the panel docks beside Home. Settings → Appearance → Links side moves it left or right.
- [ ] Settings → Appearance → Links sections: hide each section independently.
- [ ] Custom icons: edit a bookmark in Library, set Custom icon to an emoji or short label, and check it appears in Links. Clear it and the favicon or first letter returns.
- [ ] Arrow Up and Down move between links; Escape closes the panel and returns focus to Links.

## Links desktop (Settings → Home layout → Show Links desktop)

- [ ] Turn the section on and save. An empty desktop offers Arrange desktop.
- [ ] Arrange desktop: find and add links and folders, drag them to any place, and use the arrow buttons to move them with the keyboard. Moving onto another item swaps them.
- [ ] Done arranging, then reload: every item keeps its place. Folder tiles open a window with their links.
- [ ] A narrow window lists the items in reading order and explains that arranging needs a wider window.
- [ ] Delete a placed bookmark in Library: it disappears from the desktop and returns when restored from Trash.

## Focus mode (Home → Focus mode)

- [ ] Start a short session (1 minute). Home hides everything but the timer. Pause, resume and End focus work.
- [ ] Open a second tab during a session: it shows the same timer. Pause in one tab, and the other follows.
- [ ] Reload while running and while paused: no time is lost or gained.
- [ ] Alternate focus and breaks: after each phase you must choose Start break or Start next focus. Leaving the tab for a while never starts the next phase.
- [ ] Take a long break after every 4 focus sessions: after the fourth focus, the button reads Start long break and uses your long-break length.
- [ ] Start the next phase automatically: the next phase starts on time while the tab is open. Sleep the computer or close all Oasis tabs past a deadline; on return the cycle waits for you.
- [ ] There is no sound or system notification when a timer ends. Decide if that is acceptable for release.

## Daily content

- [ ] Settings → Appearance → Show daily focus: set today's focus on Home, complete it, edit it. It resets on the next local day.
- [ ] Settings → Image albums: use a built-in album, create your own album, upload JPEG/PNG/WebP images, set Background dimming, use a fixed image, then Use plain background.
- [ ] On Home, Like, Dislike and Next image under the background. Next only previews in this tab; Dislike removes the image from rotation.
- [ ] Settings → Quote collections: create a collection, add and edit quotes, Show daily on Home. Like, Dislike and Next quote work on Home.
- [ ] Settings → Content preferences: find, filter and clear likes and dislikes.
- [ ] Download album backup and quote backup, then restore them in a new profile.

## Widgets (Settings → Widgets)

- [ ] Add a World clock (check a zone with daylight saving), a Countdown, a Scratchpad note and a Task list. Notes and task lists start hidden until you tick Show on Home.
- [ ] On Home: edit a note, tick tasks, open Manage tasks. Remove completed tasks and use Undo.
- [ ] Download note and Download tasks produce readable text files.
- [ ] Weather: Allow weather access shows a browser prompt for two Open-Meteo sites only. Deny once (weather stays off), then allow, find your city and pick units.
- [ ] On Home: Refresh weather, then go offline and reload. Saved weather and the attribution still show.
- [ ] Turn weather off: the site access is removed (check the browser's extension site settings).

## Library (Home → Library)

- [ ] Add bookmark: save one with a title, URL, description, folder, tags and favorite. Try an invalid URL and a URL with a username: both are refused with a clear message.
- [ ] Suggest tags in the editor offers tags you already use on the same site.
- [ ] Edit, then delete a bookmark. The Undo toast restores it. Later, restore it from Settings → Backup and restore → Trash.
- [ ] Add notes and Edit notes on a card. Notes are searchable.
- [ ] Grid view and List view, every Sort by option. Reload: choices stay.
- [ ] Search with typos, quoted phrases and the operators `tag:`, `folder:`, `domain:` and `is:favorite`. Search help explains them.
- [ ] Collections select: Recently added, Favorites, Untagged, Unorganized. Recently opened and Frequently opened need Settings → Privacy → Count bookmark opens in Oasis.
- [ ] Saved searches (sidebar): save, load, edit and delete a search. Use Build with filters, then review the query before saving.
- [ ] Select bookmarks: Select visible, Move selected, Tag selected, Delete selected (with Undo).
- [ ] Organize by dragging: drag cards into folders. With Sort by → Manual order and no filters, drag cards to reorder. Try the keyboard Move up and Move down buttons.
- [ ] More Library tools → Folders and tags: nested folders, rename, move to another parent, colored tags. Deleting a folder keeps its bookmarks; deleting a tag keeps its bookmarks.
- [ ] More Library tools → Find duplicates: keep one copy, delete the others.
- [ ] More Library tools → Statistics: totals, Added by month, Top hosts and Most opened.

## Tools that ask for permissions

These prompts only exist in a real browser. Test allow, deny and remove for each, in Chrome and Edge at least.

- [ ] Toolbar popup (click the Oasis icon on a normal web page): the form is prefilled with the page title and URL. Save it and check it in Library.
- [ ] Popup → Read page details: a browser prompt asks for page access. Deny (you can still save), then allow and check the description and small images. Remove page-detail access works.
- [ ] After Read page details, tick Keep a text copy of this page and save. In Library, the card's Page text button opens the copy. Add highlights (type a phrase or Use selected text), add notes, reload, then Remove text copy.
- [ ] Search Library for a word that appears only in a saved page text: the bookmark is listed after the regular matches.
- [ ] Popup on a browser page such as `chrome://settings`: it explains the page cannot be saved.
- [ ] Right-click a page → Save page to Oasis, and right-click a link → Save link to Oasis. A save tab opens; Close closes it after saving.
- [ ] Alt+Shift+O saves the current page. If another extension already uses it, change it in `chrome://extensions/shortcuts`.
- [ ] More Library tools → Sessions and tabs → Save window → Read window tabs: a prompt asks to read tabs. Review, deselect some tabs, save into a new folder. Remove tab access.
- [ ] Sessions and tabs → Open folder: works without tab access. More than ten links asks first, and Stop opening keeps already opened tabs.
- [ ] More Library tools → Check links: select links, Allow selected sites (a prompt lists only those sites), then Check selected links. Try a real 404, a redirecting URL and a login page. Remove selected site access.
- [ ] If you checked an Open-Meteo address, confirm weather asks for access again afterwards.

## Spaces (Active space select on Home or Library)

- [ ] Manage spaces…: create, rename and delete a space. The default Personal space cannot be deleted.
- [ ] Each space has its own bookmarks, Home settings and widgets. Two tabs can show two different spaces.
- [ ] Select bookmarks → Transfer to space: review, then copy or move to another space.

## Backups and import (Settings → Backup and restore)

- [ ] Download complete space, then Restore as new space in a fresh profile. Everything appears, and running timers come back paused.
- [ ] Download backup (bookmarks only), then Restore backup into a library that already has some of them. Existing items are kept.
- [ ] Choose bookmark HTML: import your real browser export. Folders, links and the count of skipped duplicates look right.
- [ ] Download bookmark HTML, then import that file into Chrome, Edge or Firefox bookmarks.

## Settings, privacy and storage

- [ ] Settings → Appearance: theme, accents, custom Primary and Secondary colors with Reset colors. Cancel undoes the live preview.
- [ ] Change a setting in one tab and watch a second tab follow without a reload.
- [ ] Settings → Privacy: open counting is off by default. Turn it on, open bookmarks from Oasis, then Clear open history.
- [ ] Offline (disconnect the network): Home, Library, search and backups keep working. Only weather, web search and link checks need the network.
- [ ] Low disk space is hard to reproduce. If you can, fill the profile with large album images and confirm the Storage recovery banner explains what to do and no draft is lost.

## Accessibility and display

- [ ] Keyboard only: reach every control on Home, Library and Settings with Tab. Focus is always visible, and Escape closes dialogs.
- [ ] Windows with NVDA in Chrome and Edge: headings, form labels, error messages, dialog titles, search results and timers are announced sensibly.
- [ ] Browser zoom at 200% and 400%, and OS text scaling: nothing is cut off or needs sideways scrolling.
- [ ] Windows Contrast themes (high contrast): focus outlines, buttons and selected states remain visible.
- [ ] Narrow window (about 320 px wide) and a phone-sized window: Home, Links, Library and Settings stay usable.
- [ ] Light and dark system themes with Theme = System; switch the OS theme while Oasis is open.

## Upgrade and store

- [ ] Install the previous package, add data, then load the new build over it. Everything is kept.
- [ ] Review the store listing text, screenshots and privacy answers in [STORE-LISTING.md](STORE-LISTING.md) against what you saw while testing.
- [ ] After store approval, install from the store once and repeat First run, the toolbar popup and one permission prompt.
