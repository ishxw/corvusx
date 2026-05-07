import crypto from "node:crypto";
import fs from "node:fs/promises";
import {
	ADMIN_BOOTSTRAP_STATE_PATH,
	ADMIN_USERS_PATH,
	DATA_DIR,
	SESSION_SECRET_PATH,
} from "./paths";

type AdminUserRecord = {
	username: string;
	passwordHash: string;
	passwordSalt: string;
};

type AdminBootstrapState = {
	username: string;
	temporaryPassword: string;
	requiresPasswordChange: boolean;
	source: "generated" | "legacy-default";
	createdAt: string;
	updatedAt: string;
};

const DEFAULT_ADMIN_USERNAME = "admin";
const LEGACY_DEFAULT_ADMIN_PASSWORD = "admin123456";
let adminAuthInitPromise: Promise<void> | null = null;
let adminPasswordReminderPrinted = false;

async function ensureDir(dir: string) {
	await fs.mkdir(dir, { recursive: true });
}

function pbkdf2(password: string, salt: string): string {
	return crypto
		.pbkdf2Sync(password, salt, 120000, 32, "sha256")
		.toString("hex");
}

function createPasswordHash(password: string): Pick<
	AdminUserRecord,
	"passwordHash" | "passwordSalt"
> {
	const passwordSalt = crypto.randomBytes(16).toString("hex");
	return {
		passwordSalt,
		passwordHash: pbkdf2(password, passwordSalt),
	};
}

function generateTemporaryPassword(): string {
	return crypto.randomBytes(12).toString("hex");
}

async function readAdminUsersFile(): Promise<AdminUserRecord[]> {
	const raw = await fs.readFile(ADMIN_USERS_PATH, "utf8");
	return JSON.parse(raw) as AdminUserRecord[];
}

function isPasswordMatch(user: AdminUserRecord, password: string): boolean {
	return pbkdf2(password, user.passwordSalt) === user.passwordHash;
}

async function readAdminBootstrapState(): Promise<AdminBootstrapState | null> {
	try {
		const raw = await fs.readFile(ADMIN_BOOTSTRAP_STATE_PATH, "utf8");
		const parsed = JSON.parse(raw) as Partial<AdminBootstrapState>;
		if (
			typeof parsed.username !== "string" ||
			typeof parsed.temporaryPassword !== "string" ||
			typeof parsed.requiresPasswordChange !== "boolean" ||
			(parsed.source !== "generated" && parsed.source !== "legacy-default") ||
			typeof parsed.createdAt !== "string" ||
			typeof parsed.updatedAt !== "string"
		) {
			return null;
		}
		return parsed as AdminBootstrapState;
	} catch {
		return null;
	}
}

async function saveAdminBootstrapState(
	state: AdminBootstrapState,
): Promise<void> {
	await ensureDir(DATA_DIR);
	await fs.writeFile(
		ADMIN_BOOTSTRAP_STATE_PATH,
		`${JSON.stringify(state, null, 2)}\n`,
		"utf8",
	);
}

async function clearAdminBootstrapState(): Promise<void> {
	await fs.rm(ADMIN_BOOTSTRAP_STATE_PATH, { force: true });
}

function printAdminPasswordReminder(state: AdminBootstrapState) {
	if (adminPasswordReminderPrinted || !state.requiresPasswordChange) {
		return;
	}

	const prefix = "[corvusx/admin]";
	if (state.source === "generated") {
		console.warn(
			`${prefix} 首次启动已创建管理员账号：${state.username}。`,
		);
	} else {
		console.warn(
			`${prefix} 检测到管理员仍在使用旧的初始密码。`,
		);
	}
	console.warn(
		`${prefix} 当前密码：${state.temporaryPassword} 请及时修改密码`,
	);
	adminPasswordReminderPrinted = true;
}

async function createBootstrapState(params: {
	username: string;
	temporaryPassword: string;
	source: AdminBootstrapState["source"];
}): Promise<AdminBootstrapState> {
	const timestamp = new Date().toISOString();
	const state: AdminBootstrapState = {
		username: params.username,
		temporaryPassword: params.temporaryPassword,
		requiresPasswordChange: true,
		source: params.source,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
	await saveAdminBootstrapState(state);
	return state;
}

async function initializeAdminAuth(): Promise<void> {
	await ensureDir(DATA_DIR);

	try {
		await fs.access(ADMIN_USERS_PATH);
	} catch {
		const temporaryPassword = generateTemporaryPassword();
		const record: AdminUserRecord = {
			username: DEFAULT_ADMIN_USERNAME,
			...createPasswordHash(temporaryPassword),
		};
		await fs.writeFile(
			ADMIN_USERS_PATH,
			`${JSON.stringify([record], null, 2)}\n`,
			"utf8",
		);

		const bootstrapState = await createBootstrapState({
			username: record.username,
			temporaryPassword,
			source: "generated",
		});
		printAdminPasswordReminder(bootstrapState);
		return;
	}

	const users = await readAdminUsersFile();
	const bootstrapState = await readAdminBootstrapState();

	if (bootstrapState?.requiresPasswordChange) {
		const user = users.find((item) => item.username === bootstrapState.username);
		if (user && isPasswordMatch(user, bootstrapState.temporaryPassword)) {
			printAdminPasswordReminder(bootstrapState);
			return;
		}

		await clearAdminBootstrapState();
		return;
	}

	const legacyAdminUser = users.find(
		(item) => item.username === DEFAULT_ADMIN_USERNAME,
	);
	if (legacyAdminUser && isPasswordMatch(legacyAdminUser, LEGACY_DEFAULT_ADMIN_PASSWORD)) {
		const legacyState = await createBootstrapState({
			username: legacyAdminUser.username,
			temporaryPassword: LEGACY_DEFAULT_ADMIN_PASSWORD,
			source: "legacy-default",
		});
		printAdminPasswordReminder(legacyState);
	}
}

async function getSessionSecret(): Promise<string> {
	await ensureDir(DATA_DIR);
	try {
		return await fs.readFile(SESSION_SECRET_PATH, "utf8");
	} catch {
		const secret = crypto.randomBytes(32).toString("hex");
		await fs.writeFile(SESSION_SECRET_PATH, secret, "utf8");
		return secret;
	}
}

export async function ensureAdminAuthReady() {
	if (!adminAuthInitPromise) {
		adminAuthInitPromise = initializeAdminAuth().catch((error) => {
			adminAuthInitPromise = null;
			throw error;
		});
	}

	await adminAuthInitPromise;
}

async function getAdminUsers(): Promise<AdminUserRecord[]> {
	await ensureAdminAuthReady();
	return readAdminUsersFile();
}

async function saveAdminUsers(users: AdminUserRecord[]) {
	await ensureDir(DATA_DIR);
	await fs.writeFile(
		ADMIN_USERS_PATH,
		`${JSON.stringify(users, null, 2)}\n`,
		"utf8",
	);
}

export async function verifyAdminCredentials(
	username: string,
	password: string,
): Promise<boolean> {
	const users = await getAdminUsers();
	const user = users.find((item) => item.username === username);
	if (!user) return false;
	return pbkdf2(password, user.passwordSalt) === user.passwordHash;
}

export async function createSessionToken(username: string): Promise<string> {
	const secret = await getSessionSecret();
	const expires = Date.now() + 1000 * 60 * 60 * 24 * 7;
	const payload = `${username}.${expires}`;
	const signature = crypto
		.createHmac("sha256", secret)
		.update(payload)
		.digest("hex");
	return Buffer.from(`${payload}.${signature}`, "utf8").toString("base64url");
}

export async function verifySessionToken(
	token: string | undefined,
): Promise<string | null> {
	if (!token) return null;

	try {
		const secret = await getSessionSecret();
		const decoded = Buffer.from(token, "base64url").toString("utf8");
		const [username, expiresText, signature] = decoded.split(".");
		if (!username || !expiresText || !signature) return null;
		const payload = `${username}.${expiresText}`;
		const expected = crypto
			.createHmac("sha256", secret)
			.update(payload)
			.digest("hex");
		if (expected !== signature) return null;
		if (Number(expiresText) < Date.now()) return null;
		return username;
	} catch {
		return null;
	}
}

export async function updateAdminPassword(
	username: string,
	currentPassword: string,
	nextPassword: string,
): Promise<{ ok: boolean; reason?: string }> {
	const users = await getAdminUsers();
	const user = users.find((item) => item.username === username);
	if (!user) {
		return { ok: false, reason: "User not found" };
	}

	if (pbkdf2(currentPassword, user.passwordSalt) !== user.passwordHash) {
		return { ok: false, reason: "Current password is incorrect" };
	}

	if (nextPassword.length < 8) {
		return { ok: false, reason: "Password too short" };
	}

	const nextPasswordHash = createPasswordHash(nextPassword);
	user.passwordSalt = nextPasswordHash.passwordSalt;
	user.passwordHash = nextPasswordHash.passwordHash;
	await saveAdminUsers(users);
	await clearAdminBootstrapState();
	return { ok: true };
}
