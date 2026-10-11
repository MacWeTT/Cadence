# Changelog

Cadence follows [semantic versioning](https://semver.org). Until 1.0 (the public release, once the basic set of features is ready) the minor number marks a batch of user-visible work and the patch number a fix. The version lives in `package.json` and shows in the app's footer.

## Planned

- **0.3.5** Motion: every page moves in smoothly and loading no longer pops; the splash shows the app's description; a What's new page.
- **0.4** The cache-first data layer.
- **0.5** Focus sessions: a timer for a habit, with a confirmation when you finish.
- **Later** The desktop app, desktop and email notifications, and starting on login.

## 0.3.0

The first numbered version.

- Home dashboard with a greeting and a day-part alert, today and week views, habits, progress (heatmap, bars, rates).
- Light and dark themes, with a theme toggle.
- English locale files for all text.
- Branding: the ring "C." logo and favicon, the animated C-to-Cadence logo and splash, app metadata.
- A footer with About, Contact and the developer credit, and an About page.
- Automatic deploy to production on every merge into `develop`.
