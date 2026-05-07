import path from "node:path";

export const DATA_DIR: string = path.resolve("data");
export const POSTS_DIR: string = path.resolve("src/content/posts");
export const SITE_SETTINGS_PATH: string = path.join(
	DATA_DIR,
	"site-settings.json",
);
export const SESSION_SECRET_PATH: string = path.join(
	DATA_DIR,
	"session-secret.txt",
);
export const ADMIN_USERS_PATH: string = path.join(DATA_DIR, "admin-users.json");
export const ADMIN_BOOTSTRAP_STATE_PATH: string = path.join(
	DATA_DIR,
	"admin-bootstrap.json",
);
export const ADMIN_ACTIVITY_LOG_PATH: string = path.join(
	DATA_DIR,
	"admin-activity-log.json",
);
