# 0.6: install Cadence like an app (PWA), design

Status: built, awaiting review.

## Scope

Make Cadence installable on a phone or computer, with its own icon and window, and an offline page. The profile page is 0.6.5 and notifications 0.7 (they will reuse the service worker).

Already there before this release: a web app manifest, 192 and 512 icons, an Apple icon, and a theme colour.

## What changes

- **Manifest:** an `id` and `scope`, categories, a maskable icon (the mark inside the safe zone on the page colour, so a phone can crop it to a circle) and two shortcuts on the installed icon: Today and Progress.
- **Apple:** `apple-mobile-web-app` metadata, so iPhone's "Add to Home Screen" opens it without browser chrome.
- **Service worker** (`public/sw.js`): shows `public/offline.html` when a page cannot be reached because the network is down. It does nothing else: **it never stores pages, habits or anything from an account** (a shared device must not keep someone's data after sign-out), and server errors are shown as they are. Registered in production only (in development it would hold on to stale files). Served with `no-cache`, so a fix reaches everyone on their next visit.
- **Install button:** "Install app" in the account menu where the browser offers it (Chrome, Edge, Android); on iPhone and iPad, which have no install prompt, "Add to Home Screen" shows a hint to use Share. Hidden once Cadence runs as an installed app.

## Not included, on purpose

- **Offline use of your habits.** The app still needs a connection to show and change data; offline reading and queued ticks would be their own feature (they need a local store and conflict rules).
- **A localised offline page.** `offline.html` is plain English: it has to work with nothing else loaded. Revisit with the second language.

## Updating the offline page

The worker keeps its own copy of `offline.html`. When that file changes, bump `VERSION` in `public/sw.js` in the same change; the new worker then replaces the stored copy and removes the old one.

## Tests

`e2e/pwa.spec.ts`: the manifest and its icons, the worker's headers, the offline page with the network cut, a real 404 not being replaced by it, and the install button with a simulated browser prompt. `tests/unit/lib/install-prompt.test.ts` covers the prompt handling. Checked by hand on a production build: the app registers the worker itself and goes offline cleanly.
