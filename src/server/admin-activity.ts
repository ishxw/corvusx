import fs from "node:fs/promises";
import { ADMIN_ACTIVITY_LOG_PATH, DATA_DIR } from "./paths";

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

const legacyActionMap: Record<string, string> = {
	"鍚庡彴鐧诲綍": actionLabels["auth:login"],
	"閫€鍑虹櫥褰?": actionLabels["auth:logout"],
	"淇敼瀵嗙爜": actionLabels["auth:password"],
	"鍒涘缓鏂囩珷": actionLabels["post:create"],
	"淇濆瓨鏂囩珷": actionLabels["post:save"],
	"鍒犻櫎鏂囩珷": actionLabels["post:delete"],
	"鎵归噺鎿嶄綔": actionLabels["post:batch"],
	"鏇存柊绔欑偣璁剧疆": actionLabels["site:settings"],
	"涓婁紶绱犳潗": actionLabels["media:upload"],
	"鍒犻櫎绱犳潗": actionLabels["media:delete"],
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
	return actionLabels[value] || legacyActionMap[value] || value;
}

function normalizeDetail(value: string): string {
	const normalized = value
		.replaceAll("鑴?", "×")
		.replaceAll("脳", "×")
		.replaceAll("鈥?", "…");

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
	await ensureDir();
	await fs.writeFile(
		ADMIN_ACTIVITY_LOG_PATH,
		`${JSON.stringify(items, null, 2)}\n`,
		"utf8",
	);
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
