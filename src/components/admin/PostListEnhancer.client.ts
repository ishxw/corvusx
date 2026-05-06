type PostListOptions = {
	formSelector: string;
};

function initAdminPostList(options: PostListOptions) {
	const form = document.querySelector(options.formSelector);
	if (
		!(form instanceof HTMLFormElement) ||
		form.dataset.initialized === "true"
	) {
		return;
	}
	form.dataset.initialized = "true";

	const selectAll = form.querySelector<HTMLInputElement>("[data-select-all]");
	const selectionCounters = Array.from(
		form.querySelectorAll<HTMLElement>("[data-selection-count]"),
	);
	const batchButtons = Array.from(
		form.querySelectorAll<HTMLButtonElement>("[data-batch-action]"),
	);
	let submitting = false;

	const getPostCheckboxes = () =>
		Array.from(form.querySelectorAll<HTMLInputElement>("[data-post-checkbox]"));

	const syncState = () => {
		const checkboxes = getPostCheckboxes();
		const selected = checkboxes.filter((checkbox) => checkbox.checked);

		if (selectAll) {
			selectAll.checked =
				checkboxes.length > 0 && selected.length === checkboxes.length;
			selectAll.indeterminate =
				selected.length > 0 && selected.length < checkboxes.length;
		}

		for (const counter of selectionCounters) {
			counter.textContent = String(selected.length);
		}

		for (const button of batchButtons) {
			button.disabled = submitting || selected.length === 0;
		}
	};

	selectAll?.addEventListener("change", () => {
		for (const checkbox of getPostCheckboxes()) {
			checkbox.checked = Boolean(selectAll.checked);
		}
		syncState();
	});

	form.addEventListener("change", (event) => {
		const target = event.target;
		if (
			target instanceof HTMLInputElement &&
			target.matches("[data-post-checkbox]")
		) {
			syncState();
		}
	});

	for (const button of batchButtons) {
		button.addEventListener("click", async (event) => {
			const selectedCount = getPostCheckboxes().filter(
				(checkbox) => checkbox.checked,
			).length;
			if (selectedCount === 0) {
				event.preventDefault();
				window.showAdminToast?.("请先选择至少一篇文章。", "rose");
				return;
			}

			const message = button.dataset.confirm;
			if (message) {
				event.preventDefault();
				const confirmed = await window.showAdminConfirm?.(
					message.replace("{count}", String(selectedCount)),
				);
				if (!confirmed) return;
			}

			// Robust Action Capturing
			const actionField = form.querySelector<HTMLInputElement>(
				"[data-batch-action-field]",
			);
			const actionValue =
				button.dataset.batchSubmit || button.getAttribute("value");
			if (actionField && actionValue) {
				actionField.value = actionValue;
			}

			// Manually trigger form submission if we intercepted the click
			if (message) {
				form.requestSubmit(button);
			}
		});
	}

	form.addEventListener("click", async (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const deleteButton = target.closest<HTMLButtonElement>("[data-inline-delete]");
		if (!deleteButton) return;

		event.preventDefault();
		const message = deleteButton.dataset.confirm || "确认删除这篇文章吗？";
		const confirmed = await window.showAdminConfirm?.(message);
		if (!confirmed) return;

		const deleteForm = document.createElement("form");
		deleteForm.method = "POST";
		deleteForm.action = "/admin/api/posts/delete/";

		const fields = {
			slug: deleteButton.dataset.deleteSlug || "",
			status: deleteButton.dataset.deleteStatus || "all",
			sort: deleteButton.dataset.deleteSort || "published-desc",
			q: deleteButton.dataset.deleteQuery || "",
			page: deleteButton.dataset.deletePage || "1",
			pageSize: deleteButton.dataset.deletePageSize || "10",
		};

		for (const [name, value] of Object.entries(fields)) {
			const input = document.createElement("input");
			input.type = "hidden";
			input.name = name;
			input.value = value;
			deleteForm.appendChild(input);
		}

		document.body.appendChild(deleteForm);

		deleteButton.disabled = true;
		deleteButton.dataset.originalText = deleteButton.textContent || "";
		deleteButton.textContent = "处理中...";
		deleteForm.submit();
	});

	form.addEventListener("submit", (event) => {
		const submitter = event.submitter;
		if (!(submitter instanceof HTMLButtonElement)) return;

		submitting = true;
		batchButtons.forEach((button) => {
			button.disabled = true;
		});

		submitter.dataset.originalText = submitter.textContent || "";
		submitter.textContent = "正在处理…";
	});

	syncState();
}

window.initAdminPostList = initAdminPostList;

function bootPostLists() {
	document
		.querySelectorAll<HTMLFormElement>("[data-admin-batch-form]")
		.forEach(() => {
			window.initAdminPostList?.({
				formSelector: "[data-admin-batch-form]",
			});
		});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootPostLists);
} else {
	bootPostLists();
}
document.addEventListener("astro:page-load", bootPostLists);
document.addEventListener("astro:after-swap", bootPostLists);

export {};
