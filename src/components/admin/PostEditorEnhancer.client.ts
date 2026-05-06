type EnhancerOptions = {
	form: HTMLFormElement;
	editorId: string;
	previewId: string;
	statsId: string;
	autosaveKey: string;
	statusId?: string;
	restoreNoticeId?: string;
	timestampId?: string;
	enableAutoSlug?: boolean;
};

const snippets = {
	image: "\n![图片描述](/uploads/your-image.png)\n",
	github: '\n::github{repo="owner/repo"}\n',
	code: "\n```\n在此输入内容\n```\n",
	codeTs: "\n```ts\nconsole.log('Hello, Corvusx')\n```\n",
	codeTitle: '\n```ts title="example.ts"\n// 带有标题的代码块\n```\n',
	codeTerminal:
		'\n```bash title="Terminal" frame="terminal"\npnpm install\n```\n',
	codeMarkers:
		"\n```ts {1, 3-4} ins={6} del={2} mark={5}\n// 代码标记示例\n```\n",
	video:
		'\n<iframe src="https://www.youtube.com/embed/..." class="w-full aspect-video rounded-2xl" frameborder="0" allowfullscreen></iframe>\n',
	admonitionNote: "\n:::note\n这里是一段提示内容。\n:::\n",
	admonitionTip: "\n:::tip\n这里是一段建议内容。\n:::\n",
	admonitionWarning: "\n:::warning\n这里是一段警告内容。\n:::\n",
	admonitionCaution: "\n:::caution\n这里是一段警示内容。\n:::\n",
	mathBlock: "\n$$\nE = mc^2\n$$\n",
	mathInline: "$a^2 + b^2 = c^2$",
	table:
		"\n| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n",
	taskList: "\n- [ ] 待办事项 1\n- [ ] 待办事项 2\n",
	quote: "\n> 这里是一段引用内容。\n",
	spoiler: " :spoiler[这里是悬停显示内容] ",
	collapse:
		"\n<details>\n<summary>点击展开隐藏内容</summary>\n这里是折叠后的正文内容。\n</details>\n",
	linkCard: '\n::linkCard{url="https://example.com"}\n',
};

function insertAtSelection(editor: HTMLTextAreaElement, snippet: string) {
	const start = editor.selectionStart ?? editor.value.length;
	const end = editor.selectionEnd ?? editor.value.length;
	editor.value = `${editor.value.slice(0, start)}${snippet}${editor.value.slice(end)}`;
	editor.focus();
	editor.selectionStart = editor.selectionEnd = start + snippet.length;
	editor.dispatchEvent(new Event("input"));
}

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
		.trim()
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function initAdminPostEditor(options: EnhancerOptions) {
	const form = options.form;
	if (form.dataset.initialized === "true") {
		return;
	}
	form.dataset.initialized = "true";

	const editor = document.getElementById(options.editorId);
	const preview = document.getElementById(options.previewId);
	const stats = document.getElementById(options.statsId);
	const status = options.statusId
		? document.getElementById(options.statusId)
		: null;
	const restoreNotice = options.restoreNoticeId
		? document.getElementById(options.restoreNoticeId)
		: null;
	const timestamp = options.timestampId
		? document.getElementById(options.timestampId)
		: null;
	const titleInput = form.querySelector<HTMLInputElement>('[name="title"]');
	const slugInput = form.querySelector<HTMLInputElement>('[name="slug"]');

	if (
		!(editor instanceof HTMLTextAreaElement) ||
		!(preview instanceof HTMLDivElement) ||
		!(stats instanceof HTMLDivElement)
	) {
		return;
	}

	let previewTimer = 0;
	let saveTimer = 0;
	let isDirty = false;

	const updateDirtyState = (nextDirty: boolean) => {
		isDirty = nextDirty;
		if (window.adminIsDirty !== undefined) window.adminIsDirty = isDirty;
	};

	const setStatus = (
		message: string,
		tone: "default" | "success" | "warning" = "default",
	) => {
		if (!(status instanceof HTMLElement)) return;
		status.textContent = message;
		status.dataset.tone = tone;
		status.className =
			tone === "success"
				? "text-emerald-500 font-bold"
				: tone === "warning"
					? "text-amber-500 font-bold"
					: "text-black/30 dark:text-white/30";

		if (timestamp instanceof HTMLElement && tone === "success") {
			timestamp.textContent = `最近备份：${new Intl.DateTimeFormat("zh-CN", {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			}).format(new Date())}`;
		}
	};

	const showRestoreNotice = (message: string) => {
		if (!(restoreNotice instanceof HTMLElement)) return;
		restoreNotice.textContent = message;
		restoreNotice.classList.remove("hidden");
	};

	const hideRestoreNotice = () => {
		if (!(restoreNotice instanceof HTMLElement)) return;
		restoreNotice.classList.add("hidden");
	};

	const collectFormPayload = () => {
		const payload: Record<string, string | boolean> = {};
		for (const field of form.querySelectorAll(
			"input[name], textarea[name], select[name]",
		)) {
			if (field instanceof HTMLInputElement) {
				payload[field.name] =
					field.type === "checkbox" ? field.checked : field.value;
			}
			if (
				field instanceof HTMLTextAreaElement ||
				field instanceof HTMLSelectElement
			) {
				payload[field.name] = field.value;
			}
		}
		return payload;
	};

	const persist = () => {
		localStorage.setItem(
			options.autosaveKey,
			JSON.stringify(collectFormPayload()),
		);
		updateDirtyState(true);
		setStatus("正在写入本地草稿...", "default");
		window.clearTimeout(saveTimer);
		saveTimer = window.setTimeout(() => {
			setStatus("本地草稿已同步。", "success");
		}, 300);
	};

	const maybeRestore = async () => {
		const saved = localStorage.getItem(options.autosaveKey);
		if (!saved) {
			hideRestoreNotice();
			return;
		}

		try {
			const parsed = JSON.parse(saved) as Record<string, unknown>;

			// If the saved draft is essentially empty, just clear it and don't prompt
			const isDraftEmpty =
				!String(parsed.body || "").trim() && !String(parsed.title || "").trim();
			if (isDraftEmpty) {
				localStorage.removeItem(options.autosaveKey);
				hideRestoreNotice();
				return;
			}

			showRestoreNotice("检测到本地未提交草稿，正在等待是否恢复。");

			const shouldRestore =
				!editor.value.trim() &&
				(await window.showAdminConfirm?.("检测到未提交的本地草稿，是否恢复？"));

			if (!shouldRestore) {
				// User explicitly chose not to restore, or editor is already dirty
				// Clear the draft to prevent recurring prompts
				localStorage.removeItem(options.autosaveKey);
				setStatus("已忽略并清除本地草稿。", "warning");
				hideRestoreNotice();
				return;
			}

			for (const [key, value] of Object.entries(parsed)) {
				const field = form.querySelector(`[name="${key}"]`);
				if (field instanceof HTMLInputElement) {
					if (field.type === "checkbox") {
						field.checked = Boolean(value);
					} else {
						field.value = String(value ?? "");
					}
				}
				if (
					field instanceof HTMLTextAreaElement ||
					field instanceof HTMLSelectElement
				) {
					field.value = String(value ?? "");
				}
			}

			showRestoreNotice("已恢复上次未提交的本地草稿。");
			setStatus("本地草稿已恢复。", "success");
			updateDirtyState(true);
		} catch {
			localStorage.removeItem(options.autosaveKey);
			hideRestoreNotice();
		}
	};

	const render = async () => {
		const value = editor.value.trim();
		if (!value) {
			preview.innerHTML =
				"<span class='text-black/30 dark:text-white/30 italic'>在此输入内容以生成实时预览...</span>";
			stats.textContent = "0 字 / 0 分钟阅读";
			return;
		}

		try {
			const response = await fetch("/admin/api/preview-markdown/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ markdown: editor.value }),
			});
			if (!response.ok) {
				throw new Error(`Preview API returned ${response.status}`);
			}
			const payload = (await response.json()) as {
				html?: string;
				words?: number;
				minutes?: number;
			};
			preview.innerHTML = payload.html || "";
			stats.textContent = `${payload.words || 0} 字 / ${payload.minutes || 1} 分钟阅读`;

			// Re-initialize GitHub cards and other dynamic components
			window.initGitHubCards?.();
		} catch {
			preview.innerHTML =
				"<span class='text-rose-500 font-bold'>预览生成失败，请检查网络连接。</span>";
			stats.textContent = "";
		}
	};

	const scheduleRender = () => {
		window.clearTimeout(previewTimer);
		previewTimer = window.setTimeout(() => {
			persist();
			void render();
		}, 400);
	};

	editor.addEventListener("input", scheduleRender);

	form
		.querySelectorAll("input[name], textarea[name], select[name]")
		.forEach((field) => {
			field.addEventListener("change", () => {
				persist();
				void render();
			});
		});

	form.addEventListener("submit", () => {
		localStorage.removeItem(options.autosaveKey);
		hideRestoreNotice();
		updateDirtyState(false);
		setStatus("正在提交至服务器...", "default");
	});

	window.addEventListener("beforeunload", (event) => {
		if (!window.adminIsDirty) return;
		event.preventDefault();
	});

	window.addEventListener("keydown", (event) => {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
			event.preventDefault();
			const primarySubmit = form.querySelector<HTMLButtonElement>(
				'[data-submit-intent-value="stay"]',
			);
			form.requestSubmit(primarySubmit || undefined);
		}
	});

	if (options.enableAutoSlug && titleInput && slugInput) {
		let slugTouched = Boolean(slugInput.value.trim());

		slugInput.addEventListener("input", () => {
			slugTouched = true;
		});

		titleInput.addEventListener("input", () => {
			if (slugTouched) return;
			slugInput.value = slugify(titleInput.value);
			slugInput.dispatchEvent(new Event("change", { bubbles: true }));
		});
	}

	void maybeRestore();
	void render();
	if (!localStorage.getItem(options.autosaveKey)) {
		setStatus("已就绪。", "default");
	}

	const toolbar = form.querySelector("[data-admin-editor-toolbar]");
	toolbar
		?.querySelectorAll<HTMLButtonElement>("[data-snippet]")
		.forEach((button) => {
			button.addEventListener("click", () => {
				const key = button.dataset.snippet as keyof typeof snippets | undefined;
				if (!key) return;
				insertAtSelection(editor, snippets[key]);
			});
		});

	form
		.querySelectorAll<HTMLElement>("[data-category-suggestion]")
		.forEach((button) => {
			button.addEventListener("click", () => {
				const target =
					form.querySelector<HTMLInputElement>('[name="category"]');
				if (!target) return;
				target.value = button.dataset.categorySuggestion || "";
				target.dispatchEvent(new Event("change", { bubbles: true }));
			});
		});

	form
		.querySelectorAll<HTMLElement>("[data-tag-suggestion]")
		.forEach((button) => {
			button.addEventListener("click", () => {
				const target = form.querySelector<HTMLInputElement>('[name="tags"]');
				if (!target) return;
				const current = target.value
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean);
				const next = button.dataset.tagSuggestion || "";
				const merged = Array.from(new Set([...current, next])).filter(Boolean);
				target.value = merged.join(", ");
				target.dispatchEvent(new Event("change", { bubbles: true }));
			});
		});
}

window.initAdminPostEditor = initAdminPostEditor;

function bootEditors() {
	document
		.querySelectorAll<HTMLFormElement>("[data-admin-post-editor-form]")
		.forEach((form) => {
			window.initAdminPostEditor?.({
				form,
				editorId: form.dataset.editorId || "admin-markdown-editor",
				previewId: form.dataset.previewId || "admin-markdown-preview",
				statsId: form.dataset.statsId || "admin-markdown-stats",
				statusId: form.dataset.statusId || "admin-editor-status",
				restoreNoticeId: form.dataset.restoreId || "admin-restore-notice",
				timestampId: form.dataset.timestampId || "admin-editor-timestamp",
				autosaveKey: form.dataset.autosaveKey || "corvusx-admin-post",
				enableAutoSlug: form.dataset.enableAutoSlug === "true",
			});
		});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootEditors);
} else {
	bootEditors();
}
document.addEventListener("astro:page-load", bootEditors);
document.addEventListener("astro:after-swap", bootEditors);

export {};
