type PostListOptions = {
	formSelector: string;
};

declare global {
	interface Window {
		initAdminPostList?: (options: PostListOptions) => void;
	}
}

function initAdminPostList(options: PostListOptions) {
	const form = document.querySelector(options.formSelector);
	if (!(form instanceof HTMLFormElement) || form.dataset.initialized === "true") {
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
			selectAll.checked = checkboxes.length > 0 && selected.length === checkboxes.length;
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
		if (target instanceof HTMLInputElement && target.matches("[data-post-checkbox]")) {
			syncState();
		}
	});

	for (const button of batchButtons) {
		button.addEventListener("click", (event) => {
			const selectedCount = getPostCheckboxes().filter((checkbox) => checkbox.checked).length;
			if (selectedCount === 0) {
				event.preventDefault();
				window.showAdminToast?.("请先选择至少一篇文章。", "rose");
				return;
			}

			const message = button.dataset.confirm;
			if (message && !window.confirm(message.replace("{count}", String(selectedCount)))) {
				event.preventDefault();
				return;
			}

			// Robust Action Capturing
			const actionField = form.querySelector<HTMLInputElement>("[data-batch-action-field]");
			const actionValue = button.dataset.batchSubmit || button.getAttribute("value");
			if (actionField && actionValue) {
				actionField.value = actionValue;
			}
		});
	}

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
	document.querySelectorAll<HTMLFormElement>("[data-admin-batch-form]").forEach(() => {
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
