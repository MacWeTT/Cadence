// The one place the screens import their data from. The desktop build swaps this module for the local (SQLite) one
// (see `source.desktop.ts` and next.config.ts), so none of the server code reaches it.
export { source as dataSource } from '@/data/source';
export type {
  AccountActionResult,
  ActionResult,
  AuthResult,
  ContactResult,
  DataSource,
  FocusActionResult,
  ProfileActionResult,
} from '@/data/types';
