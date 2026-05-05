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
		showAdminConfirm?: (message: string) => Promise<boolean>;
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
				(item) => {
					const cleanUrl = item.url.split('?')[0];
					return `
						<div class="group flex flex-col rounded-3xl border border-black/5 bg-black/[0.02] p-3 transition-all hover:bg-white hover:shadow-xl dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-black/40">
							<div class="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5">
								<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name)}" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
								<div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
									<button type="button" class="btn-regular scale-90 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-transform group-hover:scale-100" data-media-select="${escapeHtml(cleanUrl)}">选择使用</button>
								</div>
							</div>
							<div class="px-1">
								<div class="truncate text-xs font-bold text-black/80 dark:text-white/90" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
								<div class="mt-1 flex items-center justify-between text-[10px] font-medium text-black/30 dark:text-white/30">
									<span>${formatFileSize(item.size)}</span>
									<span>${formatDate(item.modifiedAt)}</span>
								</div>
								<div class="mt-3 flex gap-2">
									<button type="button" class="btn-plain flex-1 rounded-lg py-2 text-[10px] font-bold" data-media-copy="${escapeHtml(cleanUrl)}">复制路径</button>
									<button type="button" class="rounded-lg bg-rose-500/5 px-3 py-2 text-[10px] font-bold text-rose-500 transition-colors hover:bg-rose-500 hover:text-white" data-media-delete="${escapeHtml(cleanUrl)}">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
									</button>
								</div>
							</div>
						</div>
					`;
				}
			)
			.join("");
	};

	const loadItems = async () => {
		setStatus("正在加载素材列表…");
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
			setStatus("点击“使用”可立即将路径回填到当前字段。");
		} catch {
			allItems = [];
			renderItems();
			setStatus("素材列表加载失败，请重试。");
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

	uploadInput.addEventListener("change", () => {
		const file = uploadInput.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const container = uploadForm.querySelector(".relative.flex.min-h-\\[120px\\]");
				if (container instanceof HTMLElement) {
					// Clear previous preview if any
					const oldPreview = container.querySelector("[data-preview-image]");
					oldPreview?.remove();
					const oldText = container.querySelector("[data-preview-text]");
					oldText?.remove();
					const oldSvg = container.querySelector("svg");
					oldSvg?.classList.add("hidden");

					const img = document.createElement("img");
					img.src = e.target?.result as string;
					img.className = "absolute inset-0 h-full w-full object-cover rounded-2xl opacity-40 pointer-events-none";
					img.setAttribute("data-preview-image", "");
					
					const text = document.createElement("div");
					text.className = "relative z-10 px-4 text-center text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/80 pointer-events-none";
					text.textContent = `已选择：${file.name}`;
					text.setAttribute("data-preview-text", "");

					container.prepend(img);
					container.append(text);
				}
			};
			reader.readAsDataURL(file);
		}
	});

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
			
			// Restore upload area
			const container = uploadForm.querySelector(".relative.flex.min-h-\\[120px\\]");
			if (container instanceof HTMLElement) {
				container.querySelector("[data-preview-image]")?.remove();
				container.querySelector("[data-preview-text]")?.remove();
				container.querySelector("svg")?.classList.remove("hidden");
			}

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
		if (!value) return;
		const confirmed = await window.showAdminConfirm?.(`确认删除素材 ${value} 吗？此操作不可撤销。`);
		if (!confirmed) return;
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
