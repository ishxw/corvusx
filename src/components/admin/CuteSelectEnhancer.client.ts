type CuteSelectVariant = "default" | "compact";

type CuteSelectInstance = {
	root: HTMLDivElement;
	select: HTMLSelectElement;
	trigger: HTMLButtonElement;
	label: HTMLSpanElement;
	panel: HTMLDivElement;
	optionButtons: HTMLButtonElement[];
	variant: CuteSelectVariant;
};

const cuteSelectInstances: CuteSelectInstance[] = [];
let activeCuteSelect: CuteSelectInstance | null = null;

function getVariant(select: HTMLSelectElement): CuteSelectVariant {
	return select.dataset.adminCuteSelectVariant === "compact"
		? "compact"
		: "default";
}

function getTriggerClasses(variant: CuteSelectVariant): string {
	if (variant === "compact") {
		return "flex w-full items-center justify-between gap-2.5 rounded-[0.95rem] border border-black/5 bg-white/80 px-3.5 py-2 text-left text-xs font-semibold text-black/65 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.3)] backdrop-blur-sm transition-all hover:border-[var(--primary)]/20 hover:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/15 dark:border-white/5 dark:bg-black/20 dark:text-white/65 dark:hover:border-[var(--primary)]/20 dark:hover:bg-black/25 dark:focus:ring-[var(--primary)]/20";
	}

	return "flex w-full items-center justify-between gap-2.5 rounded-[1rem] border border-black/5 bg-white/80 px-3.5 py-2.5 text-left text-sm font-semibold text-black/70 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.3)] backdrop-blur-sm transition-all hover:border-[var(--primary)]/20 hover:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/15 dark:border-white/5 dark:bg-black/20 dark:text-white/70 dark:hover:border-[var(--primary)]/20 dark:hover:bg-black/25 dark:focus:ring-[var(--primary)]/20";
}

function getPanelClasses(): string {
	return "pointer-events-none absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 origin-top scale-95 rounded-[1.15rem] border border-black/5 bg-white/95 p-2 opacity-0 shadow-[0_22px_52px_-24px_rgba(15,23,42,0.32)] backdrop-blur-xl transition-all duration-150 dark:border-white/5 dark:bg-[color-mix(in_oklab,var(--card-bg)_92%,transparent)]";
}

function getOptionClasses(
	variant: CuteSelectVariant,
	isSelected: boolean,
): string {
	const base =
		variant === "compact"
			? "flex w-full items-center rounded-[0.8rem] px-3 py-2 text-left text-xs font-bold transition-all"
			: "flex w-full items-center rounded-[0.9rem] px-3.5 py-2.5 text-left text-sm font-semibold transition-all";

	if (isSelected) {
		return `${base} bg-[var(--primary)] text-white shadow-[0_12px_28px_-16px_color-mix(in_oklab,var(--primary)_55%,transparent)]`;
	}

	return `${base} text-black/65 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] dark:text-white/65 dark:hover:bg-[var(--primary)]/12 dark:hover:text-white`;
}

function closeCuteSelect(instance: CuteSelectInstance) {
	instance.trigger.setAttribute("aria-expanded", "false");
	instance.panel.classList.add("pointer-events-none", "scale-95", "opacity-0");
	if (activeCuteSelect === instance) {
		activeCuteSelect = null;
	}
}

function openCuteSelect(instance: CuteSelectInstance) {
	if (activeCuteSelect && activeCuteSelect !== instance) {
		closeCuteSelect(activeCuteSelect);
	}

	const rect = instance.root.getBoundingClientRect();
	const viewportHeight = window.innerHeight;
	const panelHeight = Math.min(
		320,
		Math.max(160, instance.optionButtons.length * (instance.variant === "compact" ? 40 : 46) + 16),
	);
	const shouldOpenUpward =
		rect.bottom + panelHeight + 16 > viewportHeight && rect.top > viewportHeight / 3;

	if (shouldOpenUpward) {
		instance.panel.classList.remove("top-[calc(100%+0.5rem)]", "origin-top");
		instance.panel.classList.add("bottom-[calc(100%+0.5rem)]", "origin-bottom");
	} else {
		instance.panel.classList.remove("bottom-[calc(100%+0.5rem)]", "origin-bottom");
		instance.panel.classList.add("top-[calc(100%+0.5rem)]", "origin-top");
	}

	instance.trigger.setAttribute("aria-expanded", "true");
	instance.panel.classList.remove(
		"pointer-events-none",
		"scale-95",
		"opacity-0",
	);
	activeCuteSelect = instance;
}

function syncCuteSelect(instance: CuteSelectInstance) {
	const selectedOption =
		instance.select.selectedOptions[0] ||
		instance.select.options[instance.select.selectedIndex];

	instance.label.textContent = selectedOption?.textContent?.trim() || "";

	instance.optionButtons.forEach((button, index) => {
		const isSelected = index === instance.select.selectedIndex;
		button.className = getOptionClasses(instance.variant, isSelected);
		button.setAttribute("aria-selected", isSelected ? "true" : "false");
	});
}

function buildCuteSelect(select: HTMLSelectElement) {
	if (select.dataset.cuteSelectEnhanced === "true") {
		return;
	}

	select.dataset.cuteSelectEnhanced = "true";
	const variant = getVariant(select);

	const root = document.createElement("div");
	root.className = "relative";
	root.dataset.adminCuteSelectRoot = "true";

	const trigger = document.createElement("button");
	trigger.type = "button";
	trigger.className = getTriggerClasses(variant);
	trigger.setAttribute("aria-haspopup", "listbox");
	trigger.setAttribute("aria-expanded", "false");

	const label = document.createElement("span");
	label.className = "min-w-0 truncate";

	const chevron = document.createElement("span");
	chevron.className =
		"flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/35 transition-colors dark:bg-white/[0.04] dark:text-white/35";
	chevron.innerHTML =
		'<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>';

	trigger.append(label, chevron);

	const panel = document.createElement("div");
	panel.className = getPanelClasses();
	panel.setAttribute("role", "listbox");

	const optionButtons = Array.from(select.options).map((option, index) => {
		const optionButton = document.createElement("button");
		optionButton.type = "button";
		optionButton.className = getOptionClasses(
			variant,
			index === select.selectedIndex,
		);
		optionButton.textContent = option.textContent?.trim() || option.value;
		optionButton.setAttribute("role", "option");
		optionButton.setAttribute(
			"aria-selected",
			index === select.selectedIndex ? "true" : "false",
		);
		optionButton.addEventListener("click", () => {
			select.value = option.value;
			select.dispatchEvent(new Event("input", { bubbles: true }));
			select.dispatchEvent(new Event("change", { bubbles: true }));
			syncCuteSelect(instance);
			closeCuteSelect(instance);
		});
		panel.append(optionButton);
		return optionButton;
	});

	const instance: CuteSelectInstance = {
		root,
		select,
		trigger,
		label,
		panel,
		optionButtons,
		variant,
	};

	trigger.addEventListener("click", () => {
		if (trigger.getAttribute("aria-expanded") === "true") {
			closeCuteSelect(instance);
			return;
		}

		openCuteSelect(instance);
	});

	select.addEventListener("change", () => {
		syncCuteSelect(instance);
	});

	root.append(trigger, panel);
	select.insertAdjacentElement("afterend", root);
	select.classList.add("hidden");
	select.setAttribute("aria-hidden", "true");
	syncCuteSelect(instance);
	cuteSelectInstances.push(instance);
}

function bootCuteSelects() {
	document
		.querySelectorAll<HTMLSelectElement>("[data-admin-cute-select]")
		.forEach((select) => {
			buildCuteSelect(select);
		});
}

document.addEventListener("click", (event) => {
	const target = event.target;
	if (!(target instanceof Element)) {
		return;
	}

	if (target.closest("[data-admin-cute-select-root]")) {
		return;
	}

	if (activeCuteSelect) {
		closeCuteSelect(activeCuteSelect);
	}
});

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && activeCuteSelect) {
		closeCuteSelect(activeCuteSelect);
	}
});

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootCuteSelects);
} else {
	bootCuteSelects();
}

document.addEventListener("astro:page-load", bootCuteSelects);
document.addEventListener("astro:after-swap", bootCuteSelects);

export {};
