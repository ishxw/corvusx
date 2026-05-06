import crypto from "node:crypto";
import fs from "node:fs/promises";
import { ADMIN_USERS_PATH, DATA_DIR, SESSION_SECRET_PATH } from "./paths";

type AdminUserRecord = {
	username: string;
	passwordHash: string;
	passwordSalt: string;
};

async function ensureDir(dir: string) {
	await fs.mkdir(dir, { recursive: true });
}

function pbkdf2(password: string, salt: string): string {
	return crypto
		.pbkdf2Sync(password, salt, 120000, 32, "sha256")
		.toString("hex");
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

export async function ensureDefaultAdminUser() {
	await ensureDir(DATA_DIR);
	try {
		await fs.access(ADMIN_USERS_PATH);
	} catch {
		const salt = crypto.randomBytes(16).toString("hex");
		const password = "admin123456";
		const record: AdminUserRecord = {
			username: "admin",
			passwordSalt: salt,
			passwordHash: pbkdf2(password, salt),
		};
		await fs.writeFile(
			ADMIN_USERS_PATH,
			`${JSON.stringify([record], null, 2)}\n`,
			"utf8",
		);
	}
}

async function getAdminUsers(): Promise<AdminUserRecord[]> {
	await ensureDefaultAdminUser();
	const raw = await fs.readFile(ADMIN_USERS_PATH, "utf8");
	return JSON.parse(raw) as AdminUserRecord[];
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

	const nextSalt = crypto.randomBytes(16).toString("hex");
	user.passwordSalt = nextSalt;
	user.passwordHash = pbkdf2(nextPassword, nextSalt);
	await saveAdminUsers(users);
	return { ok: true };
}
