// The one place the screens import their data from. The desktop build swaps this module for the local (SQLite) one
// with a bundler alias, so none of the server code reaches it.
export { remote as dataSource } from '@/data/remote';
export type { DataSource } from '@/data/types';
