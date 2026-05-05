import type { AdminPost } from "@/types/admin";

export type AdminPostStatus = "draft" | "scheduled" | "published";

export type AdminPostStatusInfo = {
	status: AdminPostStatus;
	label: string;
	description: string;
	badgeClass: string;
	publishAt?: Date;
};

function parsePublishAt(value: string | undefined): Date | undefined {
	if (!value) return undefined;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function getAdminPostStatus(post: AdminPost, now = new Date()): AdminPostStatusInfo {
	if (post.draft) {
		return {
			status: "draft",
			label: "草稿",
			description: "未公开，仅后台可见",
			badgeClass: "bg-amber-500/15 text-amber-200",
		};
	}

	const publishAt = parsePublishAt(post.publishAt);
	if (publishAt && publishAt.getTime() > now.getTime()) {
		return {
			status: "scheduled",
			label: "定时发布",
			description: `计划于 ${publishAt.toLocaleString("zh-CN", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
			})} 发布`,
			badgeClass: "bg-sky-500/15 text-sky-200",
			publishAt,
		};
	}

	return {
		status: "published",
		label: "已发布",
		description: "前台公开可见",
		badgeClass: "bg-emerald-500/15 text-emerald-200",
		publishAt,
	};
}
