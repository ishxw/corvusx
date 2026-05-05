type MediaPickerOptions = {
	modalId: string;
	endpoint: string;
};

type MediaItem = {
	name: string;
	url: string;
	size: number;
	modifiedAt: string;
};

declare global {
	interface Window {
		initAdminMediaPicker?: (options: MediaPickerOptions) => void;
	}
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string): string {
	try {
		return new Intl.DateTimeFormat("zh-CN", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(value));
	} catch {
		return value;
	}
}

function initAdminMediaPicker(options: MediaPickerOptions) {
	const modal = document.getElementById(options.modalId);
	if (!(modal instanceof HTMLDivElement) || modal.dataset.initialized === "true") {
		return;
	}
	modal.dataset.initialized = "true";

	const grid = modal.querySelector<HTMLElement>("[data-media-grid]");
	const status = modal.querySelector<HTMLElement>("[data-media-status]");
	const emptyState = modal.querySelector<HTMLElement>("[data-media-empty]");
	const count = modal.querySelector<HTMLElement>("[data-media-count]");
	const title = modal.querySelector<HTMLElement>("[data-media-picker-title]");
	const toast = modal.querySelector<HTMLElement>("[data-media-toast]");
	const searchInput = modal.querySelector<HTMLInputElement>("[data-media-search]");
	const sortSelect = modal.querySelector<HTMLSelectElement>("[data-media-sort]");
	const uploadForm = modal.querySelector<HTMLFormElement>("[data-media-upload-form]");
	const uploadInput = modal.querySelector<HTMLInputElement>("[data-media-upload-input]");
	const uploadSubmit = modal.querySelector<HTMLButtonElement>("[data-media-upload-submit]");

	if (
		!(grid instanceof HTMLDivElement) ||
		!(status instanceof HTMLElement) ||
		!(emptyState instanceof HTMLElement) ||
		!(count instanceof HTMLElement) ||
		!(title instanceof HTMLElement) ||
		!(searchInput instanceof HTMLInputElement) ||
		!(sortSelect instanceof HTMLSelectElement) ||
		!(uploadForm instanceof HTMLFormElement) ||
		!(uploadInput instanceof HTMLInputElement) ||
		!(uploadSubmit instanceof HTMLButtonElement)
	) {
		return;
	}

	let activeTargetId = "";
	let activeTrigger: HTMLElement | null = null;
	let isOpen = false;
	let allItems: MediaItem[] = [];
	let toastTimer = 0;
	let previewSyncToken = 0;

	const setStatus = (message: string) => {
		status.textContent = message;
	};

	const showToast = (message: string, tone: "success" | "warning" = "success") => {
		if (!(toast instanceof HTMLElement)) return;
		toast.textContent = message;
		toast.className =
			tone === "success"
				? "mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
				: "mb-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100";
		toast.classList.remove("hidden");
		window.clearTimeout(toastTimer);
		toastTimer = window.setTimeout(() => {
			toast.classList.add("hidden");
		}, 2200);
	};

	const setOpen = (nextOpen: boolean) => {
		isOpen = nextOpen;
		modal.classList.toggle("hidden", !nextOpen);
		modal.classList.toggle("flex", nextOpen);
		document.body.classList.toggle("overflow-hidden", nextOpen);
	};

	const getTargetInput = () => {
		if (!activeTargetId) return null;
		const input = document.getElementById(activeTargetId);
		return input instanceof HTMLInputElement ? input : null;
	};

	const syncMediaPreviews = async () => {
		const currentToken = ++previewSyncToken;
		const previewPairs = Array.from(
			document.querySelectorAll<HTMLImageElement>("[data-media-preview-for]"),
		);

		for (const image of previewPairs) {
			const fieldId = image.dataset.mediaPreviewFor;
			if (!fieldId) continue;

			const input = document.getElementById(fieldId);
			if (!(input instanceof HTMLInputElement)) continue;

			const rawValue = input.value.trim();
			const empty = document.querySelector<HTMLElement>(
				`[data-media-preview-empty="${fieldId}"]`,
			);

			if (!rawValue) {
				image.src = "";
				image.classList.add("hidden");
				empty?.classList.remove("hidden");
				continue;
			}

			if (
				rawValue.startsWith("/") ||
				rawValue.startsWith("http://") ||
				rawValue.startsWith("https://") ||
				rawValue.startsWith("data:")
			) {
				image.src = rawValue;
				image.classList.remove("hidden");
				empty?.classList.add("hidden");
				continue;
			}

			try {
				const response = await fetch(
					`/admin/api/resolve-preview-url/?value=${encodeURIComponent(rawValue)}`,
					{
						headers: { Accept: "application/json" },
						cache: "no-store",
					},
				);
				if (!response.ok) throw new Error(`Resolve preview failed: ${response.status}`);
				const payload = (await response.json()) as {
					value?: string;
					isResolvable?: boolean;
				};
				if (currentToken !== previewSyncToken) return;

				if (payload.isResolvable && payload.value) {
					image.src = payload.value;
					image.classList.remove("hidden");
					empty?.classList.add("hidden");
				} else {
					image.src = "";
					image.classList.add("hidden");
					empty?.classList.remove("hidden");
				}
			} catch {
				image.src = "";
				image.classList.add("hidden");
				empty?.classList.remove("hidden");
			}
		}
	};

	const fillTargetInput = (value: string) => {
		const target = getTargetInput();
		if (!target) return;
		target.value = value;
		target.dispatchEvent(new Event("input", { bubbles: true }));
		target.dispatchEvent(new Event("change", { bubbles: true }));
		void syncMediaPreviews();
	};

	const getVisibleItems = () => {
		const keyword = searchInput.value.trim().toLowerCase();
		const sort = sortSelect.value;
		const filtered = allItems.filter((item) => {
			if (!keyword) return true;
			return `${item.name} ${item.url}`.toLowerCase().includes(keyword);
		});

		filtered.sort((a, b) => {
			if (sort === "oldest") return a.modifiedAt.localeCompare(b.modifiedAt);
			if (sort === "name-asc") return a.name.localeCompare(b.name, "zh-CN");
			if (sort === "name-desc") return b.name.localeCompare(a.name, "zh-CN");
			if (sort === "size-desc") return b.size - a.size;
			if (sort === "size-asc") return a.size - b.size;
			return b.modifiedAt.localeCompare(a.modifiedAt);
		});

		return filtered;
	};

	const renderItems = () => {
		const items = getVisibleItems();
		count.textContent = String(items.length);
		emptyState.classList.toggle("hidden", items.length > 0);

		if (items.length === 0) {
			grid.innerHTML = "";
			return;
		}

		grid.innerHTML = items
			.map(
				(item) => `
					<div class="rounded-3xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
						<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name)}" class="mb-3 aspect-video w-full rounded-2xl object-cover" />
						<div class="mb-1 line-clamp-1 text-sm font-medium text-90">${escapeHtml(item.name)}</div>
						<div class="mb-3 text-xs text-50">${formatFileSize(item.size)} · ${formatDate(item.modifiedAt)}</div>
						<div class="mb-3 break-all rounded-2xl bg-black/5 px-3 py-2 text-xs text-50 dark:bg-white/5">${escapeHtml(item.url)}</div>
						<div class="flex flex-wrap gap-2">
							<button type="button" class="btn-regular rounded-2xl px-3 py-2 text-sm font-semibold" data-media-select="${escapeHtml(item.url)}">使用</button>
							<button type="button" class="btn-plain rounded-2xl px-3 py-2 text-sm font-medium" data-media-copy="${escapeHtml(item.url)}">复制路径</button>
							<button type="button" class="rounded-2xl bg-rose-500/12 px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20" data-media-delete="${escapeHtml(item.url)}">删除</button>
						</div>
					</div>
				`,
			)
			.join("");
	};

	const loadItems = async () => {
		setStatus("正在加载素材…");
		try {
			const response = await fetch(options.endpoint, {
				headers: {
					Accept: "application/json",
				},
				cache: "no-store",
			});
			if (!response.ok) throw new Error(`Media API returned ${response.status}`);
			const payload = (await response.json()) as { items?: MediaItem[] };
			allItems = payload.items || [];
			renderItems();
			setStatus("选择素材后会立即回填到当前字段。");
		} catch {
			allItems = [];
			renderItems();
			setStatus("素材列表加载失败，请稍后重试。");
		}
	};

	const openModal = async (trigger: HTMLElement) => {
		activeTrigger = trigger;
		activeTargetId = trigger.dataset.targetInput || "";
		title.textContent = trigger.dataset.pickerLabel || "选择素材";
		searchInput.value = "";
		sortSelect.value = "newest";
		setOpen(true);
		await loadItems();
	};

	const closeModal = () => {
		setOpen(false);
		activeTargetId = "";
		activeTrigger?.focus();
		activeTrigger = null;
		uploadForm.reset();
	};

	const uploadMedia = async () => {
		const file = uploadInput.files?.[0];
		if (!file) {
			uploadInput.reportValidity();
			return;
		}

		const formData = new FormData();
		formData.append("file", file);
		uploadSubmit.disabled = true;
		setStatus("正在上传素材…");

		try {
			const response = await fetch(options.endpoint, {
				method: "POST",
				headers: { Accept: "application/json" },
				body: formData,
			});
			if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
			uploadForm.reset();
			await loadItems();
			showToast("素材上传成功，列表已刷新。");
			setStatus("上传成功，可以继续选择素材。");
		} catch {
			showToast("素材上传失败，请稍后重试。", "warning");
			setStatus("素材上传失败，请稍后重试。");
		} finally {
			uploadSubmit.disabled = false;
		}
	};

	const deleteMedia = async (value: string) => {
		if (!value || !window.confirm(`确认删除 ${value} 吗？`)) return;
		setStatus("正在删除素材…");

		try {
			const response = await fetch(options.endpoint, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({ file: value }),
			});
			if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

			const target = getTargetInput();
			if (target?.value === value) {
				target.value = "";
				target.dispatchEvent(new Event("input", { bubbles: true }));
				target.dispatchEvent(new Event("change", { bubbles: true }));
				void syncMediaPreviews();
			}

			await loadItems();
			showToast("素材已删除。");
			setStatus("删除成功。");
		} catch {
			showToast("删除失败，请稍后重试。", "warning");
			setStatus("删除失败，请稍后重试。");
		}
	};

	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const trigger = target.closest<HTMLElement>("[data-open-media-picker]");
		if (trigger) {
			event.preventDefault();
			void openModal(trigger);
			return;
		}

		if (target === modal || target.closest("[data-close-media-picker]")) {
			if (isOpen) {
				event.preventDefault();
				closeModal();
			}
			return;
		}

		const selectButton = target.closest<HTMLElement>("[data-media-select]");
		if (selectButton) {
			event.preventDefault();
			const value = selectButton.dataset.mediaSelect || "";
			if (value) {
				fillTargetInput(value);
				showToast("素材已回填到当前字段。");
				setStatus("素材已回填。");
				closeModal();
			}
			return;
		}

		const copyButton = target.closest<HTMLElement>("[data-media-copy]");
		if (copyButton) {
			event.preventDefault();
			const value = copyButton.dataset.mediaCopy || "";
			if (value) {
				void navigator.clipboard.writeText(value);
				showToast("素材路径已复制。");
				setStatus("素材路径已复制。");
			}
			return;
		}

		const deleteButton = target.closest<HTMLElement>("[data-media-delete]");
		if (deleteButton) {
			event.preventDefault();
			const value = deleteButton.dataset.mediaDelete || "";
			void deleteMedia(value);
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && isOpen) closeModal();
	});

	uploadForm.addEventListener("submit", (event) => {
		event.preventDefault();
		void uploadMedia();
	});

	searchInput.addEventListener("input", renderItems);
	sortSelect.addEventListener("change", renderItems);

	document.querySelectorAll<HTMLInputElement>("[data-media-input]").forEach((input) => {
		input.addEventListener("input", () => {
			void syncMediaPreviews();
		});
		input.addEventListener("change", () => {
			void syncMediaPreviews();
		});
	});

	void syncMediaPreviews();
}

window.initAdminMediaPicker = initAdminMediaPicker;

function bootMediaPickers() {
	document.querySelectorAll<HTMLElement>("[data-media-picker-modal]").forEach((modal) => {
		const modalId = modal.id;
		if (!modalId) return;
		window.initAdminMediaPicker?.({
			modalId,
			endpoint: "/admin/api/media/",
		});
	});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootMediaPickers);
} else {
	bootMediaPickers();
}
document.addEventListener("astro:page-load", bootMediaPickers);
document.addEventListener("astro:after-swap", bootMediaPickers);

export {};
