# Changelog

Cadence follows [semantic versioning](https://semver.org). Until 1.0 (the public release, once the basic set of features is ready) the minor number marks a batch of user-visible work and the patch number a fix. The version lives in `package.json` and shows in the app's footer.

## Planned

- **0.4** The cache-first data layer.
- **0.5** Focus sessions: a timer for a habit, with a confirmation when you finish.
- **0.6** Habit links: add one or many links to a habit, and open them all in one click.
- **Later** The desktop app, desktop and email notifications, and starting on login.

## 0.3.5 (2026-10-11)

Smoother, with a changelog.

- Every page moves in smoothly: it arrives as one piece and loading no longer pops.
- The Home ring, the alert banner and the habit rows move too: ticking a habit glides it from To do to Done.
- The splash shows the app's description under the logo.
- A What's new page (this one), linked from the footer.
- The tab icon follows the theme.
- Two dark themes, Slate and Forest night, and a theme menu.
- Every page has the same width, whether or not it scrolls.

## 0.3.0 (2026-10-11)

The first numbered version.

- Home dashboard with a greeting and a day-part alert, today and week views, habits, progress (heatmap, bars, rates).
- Light and dark themes, with a theme toggle.
- English locale files for all text.
- Branding: the ring "C." logo and favicon, the animated C-to-Cadence logo and splash, app metadata.
- A footer with About, Contact and the developer credit, and an About page.
- Automatic deploy to production on every merge into `develop`.
