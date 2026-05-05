import path from "node:path";

export const DATA_DIR = path.resolve("data");
export const POSTS_DIR = path.resolve("src/content/posts");
export const SITE_SETTINGS_PATH = path.join(DATA_DIR, "site-settings.json");
export const SESSION_SECRET_PATH = path.join(DATA_DIR, "session-secret.txt");
export const ADMIN_USERS_PATH = path.join(DATA_DIR, "admin-users.json");
export const ADMIN_ACTIVITY_LOG_PATH = path.join(DATA_DIR, "admin-activity.json");
