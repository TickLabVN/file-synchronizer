export interface AccountInfo {
  provider: string; // "google" | "box" | "dropbox" | ...
  id: string; // email, login, userId...
  displayName?: string; // user's display name
  icon?: string; // URL to the icon image
  label?: string; // user-friendly label for the account
}
