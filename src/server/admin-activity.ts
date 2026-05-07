import fs from "node:fs/promises";
import { ADMIN_ACTIVITY_LOG_PATH, DATA_DIR } from "./paths";
import { writeJsonAtomic } from "./file-utils";

export type AdminActivity = {
	id: string;
	action: string;
	detail: string;
	createdAt: string;
};

const actionLabels: Record<string, string> = {
	"auth:login": "后台登录",
	"auth:logout": "退出登录",
	"auth:password": "修改密码",
	"post:create": "创建文章",
	"post:save": "保存文章",
	"post:delete": "删除文章",
	"post:batch": "批量操作",
	"site:settings": "更新站点设置",
	"media:upload": "上传素材",
	"media:delete": "删除素材",
};

const batchActionLabels: Record<string, string> = {
	publish: "批量发布",
	draft: "批量转为草稿",
	delete: "批量删除",
	"set-category": "批量更新分类",
	"set-tags": "批量更新标签",
	"set-published-date": "批量更新发布日期",
	"set-publish-at": "批量更新定时发布时间",
};

function normalizeAction(value: string): string {
	return actionLabels[value] || value;
}

function normalizeDetail(value: string): string {
	const normalized = value.replaceAll("×", "×").replaceAll("…", "…");

	const batchMatch = /^([a-z-]+)\s*[×x]\s*(\d+)$/.exec(normalized);
	if (batchMatch && batchActionLabels[batchMatch[1]]) {
		return `${batchActionLabels[batchMatch[1]]} ${batchMatch[2]} 篇文章`;
	}

	return normalized;
}

async function ensureDir() {
	await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readActivities(): Promise<AdminActivity[]> {
	await ensureDir();
	try {
		const raw = await fs.readFile(ADMIN_ACTIVITY_LOG_PATH, "utf8");
		return JSON.parse(raw) as AdminActivity[];
	} catch {
		return [];
	}
}

async function writeActivities(items: AdminActivity[]) {
	await writeJsonAtomic(ADMIN_ACTIVITY_LOG_PATH, items);
}

export async function logAdminActivity(action: string, detail: string) {
	const activities = await readActivities();
	activities.unshift({
		id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
		action,
		detail,
		createdAt: new Date().toISOString(),
	});
	await writeActivities(activities.slice(0, 80));
}

export async function listAdminActivities(limit = 8): Promise<AdminActivity[]> {
	const activities = await readActivities();
	return activities.slice(0, limit).map((item) => ({
		...item,
		action: normalizeAction(item.action),
		detail: normalizeDetail(item.detail),
	}));
}
