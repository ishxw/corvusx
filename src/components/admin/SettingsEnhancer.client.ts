type ProfileLinkInput = {
	name: string;
	url: string;
	icon: string;
};

type NavLinkInput = {
	name: string;
	url: string;
	icon?: string;
	external?: boolean;
};

type SettingsEnhancerOptions = {
	form: HTMLFormElement;
	profileContainerId: string;
	navContainerId: string;
	profileTemplateId: string;
	navTemplateId: string;
	profileHiddenInputId: string;
	navHiddenInputId: string;
};

declare global {
	interface Window {
		initAdminSettingsEnhancer?: (options: SettingsEnhancerOptions) => void;
	}
}

function initAdminSettingsEnhancer(options: SettingsEnhancerOptions) {
	const form = options.form;
	if (form.dataset.initialized === "true") {
		return;
	}
	form.dataset.initialized = "true";

	const profileContainer = document.getElementById(options.profileContainerId) as HTMLDivElement;
	const navContainer = document.getElementById(options.navContainerId) as HTMLDivElement;
	const profileTemplate = document.getElementById(options.profileTemplateId) as HTMLTemplateElement;
	const navTemplate = document.getElementById(options.navTemplateId) as HTMLTemplateElement;
	const profileHiddenInput = document.getElementById(
		options.profileHiddenInputId,
	) as HTMLInputElement;
	const navHiddenInput = document.getElementById(options.navHiddenInputId) as HTMLInputElement;

	const setTextContent = (el: HTMLElement | null, text: string) => {
		if (el) el.textContent = text;
	};

	const getInputValue = (row: HTMLElement, field: string) =>
		row.querySelector<HTMLInputElement>(`[data-field="${field}"]`)?.value || "";

	const getCheckboxValue = (row: HTMLElement, field: string) =>
		row.querySelector<HTMLInputElement>(`[data-field="${field}"]`)?.checked || false;

	const profileCount = document.querySelector<HTMLElement>("[data-profile-link-count]");
	const navCount = document.querySelector<HTMLElement>("[data-nav-link-count]");
	const profileEmpty = document.querySelector<HTMLElement>("[data-profile-empty]");
	const navEmpty = document.querySelector<HTMLElement>("[data-nav-empty]");
	const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
	const submitText = submitButton?.querySelector("span");

	let isDirty = false;

	const getRows = (container: HTMLDivElement) =>
		Array.from(container.querySelectorAll<HTMLElement>("[data-repeater-row]"));

	const createRow = (
		template: HTMLTemplateElement,
		payload: Partial<ProfileLinkInput & NavLinkInput> = {},
	) => {
		const node = template.content.firstElementChild?.cloneNode(true);
		if (!(node instanceof HTMLElement)) {
			return null;
		}

		for (const [key, value] of Object.entries(payload)) {
			const field = node.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-field="${key}"]`);
			if (!field) continue;
			if (field instanceof HTMLInputElement && field.type === "checkbox") {
				field.checked = Boolean(value);
			} else {
				field.value = String(value ?? "");
			}
		}

		return node;
	};

	const toggleEmptyStates = () => {
		const profileRows = getRows(profileContainer);
		const navRows = getRows(navContainer);
		profileEmpty?.classList.toggle("hidden", profileRows.length > 0);
		navEmpty?.classList.toggle("hidden", navRows.length > 0);
		setTextContent(profileCount, String(profileRows.length));
		setTextContent(navCount, String(navRows.length));
	};

	const clearRowValidity = (row: HTMLElement) => {
		row.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-field]").forEach((field) => {
			if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
				field.setCustomValidity("");
			}
		});
	};

	const validateRows = () => {
		let firstInvalid: HTMLInputElement | HTMLSelectElement | null = null;

		for (const row of getRows(profileContainer)) {
			clearRowValidity(row);
			const url = getInputValue(row, "url");
			const name = getInputValue(row, "name");
			const icon = getInputValue(row, "icon");
			if ((name || icon) && !url) {
				const target = row.querySelector<HTMLInputElement>('[data-field="url"]');
				target?.setCustomValidity("请输入社交链接 URL。");
				firstInvalid ??= target || null;
			}
		}

		for (const row of getRows(navContainer)) {
			clearRowValidity(row);
			const name = getInputValue(row, "name");
			const url = getInputValue(row, "url");
			if ((name || url) && (!name || !url)) {
				const target = !name
					? row.querySelector<HTMLInputElement>('[data-field="name"]')
					: row.querySelector<HTMLInputElement>('[data-field="url"]');
				target?.setCustomValidity("请完整填写导航链接的名称和 URL。");
				firstInvalid ??= target || null;
			}
		}

		if (firstInvalid) {
			firstInvalid.reportValidity();
			firstInvalid.focus();
			return false;
		}

		return true;
	};

	const serializeProfileLinks = (): ProfileLinkInput[] =>
		getRows(profileContainer)
			.map((row) => ({
				name: getInputValue(row, "name"),
				url: getInputValue(row, "url"),
				icon: getInputValue(row, "icon") || "fa6-solid:link",
			}))
			.filter((item) => item.url);

	const serializeNavLinks = (): NavLinkInput[] =>
		getRows(navContainer)
			.map((row) => ({
				name: getInputValue(row, "name"),
				url: getInputValue(row, "url"),
				icon: getInputValue(row, "icon"),
				external:
					getCheckboxValue(row, "external") ||
					/^https?:\/\//i.test(getInputValue(row, "url")),
			}))
			.filter((item) => item.name && item.url);

	const syncHiddenInputs = () => {
		profileHiddenInput.value = JSON.stringify(serializeProfileLinks());
		navHiddenInput.value = JSON.stringify(serializeNavLinks());
		toggleEmptyStates();
	};

	// We'll initialize this after the first syncHiddenInputs
	let initialData: FormData | null = null;

	const checkDirty = () => {
		syncHiddenInputs();
		if (!initialData) return;
		
		const currentData = new FormData(form);
		let dirty = false;
		for (const [key, value] of currentData.entries()) {
			if (initialData.get(key) !== value) {
				dirty = true;
				break;
			}
		}
		isDirty = dirty;
		
		if (submitButton) {
			submitButton.classList.toggle("ring-2", isDirty);
			submitButton.classList.toggle("ring-[var(--primary)]", isDirty);
			submitButton.classList.toggle("ring-offset-4", isDirty);
		}
	};

	const addRow = (
		container: HTMLDivElement,
		template: HTMLTemplateElement,
		payload: Partial<ProfileLinkInput & NavLinkInput> = {},
	) => {
		const row = createRow(template, payload);
		if (!row) return;
		container.append(row);
		checkDirty();
		row.querySelector<HTMLInputElement>("[data-field='name']")?.focus();
	};

	form.addEventListener("input", (event) => {
		const target = event.target;
		if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
			if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
				target.setCustomValidity("");
			}
			checkDirty();
		}
	});

	form.addEventListener("change", () => {
		checkDirty();
	});

	form.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const removeButton = target.closest<HTMLElement>("[data-remove-row]");
		if (removeButton) {
			const row = removeButton.closest<HTMLElement>("[data-repeater-row]");
			row?.remove();
			checkDirty();
			return;
		}

		const profileAddButton = target.closest<HTMLElement>("[data-add-row='profile']");
		if (profileAddButton) {
			addRow(profileContainer, profileTemplate, {
				name: "",
				url: "",
				icon: "fa6-brands:github",
			});
			return;
		}

		const navAddButton = target.closest<HTMLElement>("[data-add-row='nav']");
		if (navAddButton) {
			addRow(navContainer, navTemplate, {
				name: "",
				url: "/",
				icon: "",
				external: false,
			});
		}
	});

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (!validateRows()) return;

		syncHiddenInputs();
		if (submitButton) submitButton.disabled = true;
		if (submitText) submitText.textContent = "正在保存...";

		try {
			const formData = new FormData(form);
			const response = await fetch(form.action, {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				window.showAdminToast?.("站点设置已成功保存。", "success");
				isDirty = false;
				initialData = formData;
				checkDirty();
			} else {
				window.showAdminToast?.("保存失败，服务器返回错误。", "rose");
			}
		} catch {
			window.showAdminToast?.("保存失败，请检查网络连接。", "rose");
		} finally {
			if (submitButton) submitButton.disabled = false;
			if (submitText) submitText.textContent = "保存所有设置";
		}
	});

	window.addEventListener("beforeunload", (event) => {
		if (!isDirty) return;
		event.preventDefault();
	});

	// INITIALIZATION
	syncHiddenInputs();
	initialData = new FormData(form);
}

window.initAdminSettingsEnhancer = initAdminSettingsEnhancer;

function bootSettingsForms() {
	document.querySelectorAll<HTMLFormElement>("[data-admin-settings-form]").forEach((form) => {
		window.initAdminSettingsEnhancer?.({
			form,
			profileContainerId: "profile-links-container",
			navContainerId: "nav-links-container",
			profileTemplateId: "profile-link-template",
			navTemplateId: "nav-link-template",
			profileHiddenInputId: "profileLinksJson",
			navHiddenInputId: "navLinksJson",
		});
	});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootSettingsForms);
} else {
	bootSettingsForms();
}
document.addEventListener("astro:page-load", bootSettingsForms);
document.addEventListener("astro:after-swap", bootSettingsForms);

export {};
