import { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";
import { getStoredTheme, setTheme } from "@utils/setting-utils";
import type { LIGHT_DARK_MODE } from "@/types/config";

function updateThemeSwitcher(mode: LIGHT_DARK_MODE) {
	const root = document.getElementById("theme-switcher");
	if (!root) return;

	const icons = {
		[LIGHT_MODE]: root.querySelector<HTMLElement>(".theme-icon-light"),
		[DARK_MODE]: root.querySelector<HTMLElement>(".theme-icon-dark"),
		[AUTO_MODE]: root.querySelector<HTMLElement>(".theme-icon-auto"),
	};

	for (const [key, element] of Object.entries(icons)) {
		if (!element) continue;
		element.classList.toggle("hidden", key !== mode);
	}

	root.querySelectorAll<HTMLElement>(".theme-option").forEach((button) => {
		const isActive = button.getAttribute("data-theme-option") === mode;
		button.classList.toggle("current-theme-btn", isActive);
	});
}

function initThemeSwitcher() {
	const root = document.getElementById("theme-switcher");
	if (!root || root.dataset.bound === "true") return;
	root.dataset.bound = "true";

	const switchBtn = document.getElementById("scheme-switch");
	const panel = document.getElementById("light-dark-panel");
	const modes: LIGHT_DARK_MODE[] = [LIGHT_MODE, DARK_MODE, AUTO_MODE];

	const applyMode = (mode: LIGHT_DARK_MODE) => {
		setTheme(mode);
		updateThemeSwitcher(mode);
	};

	const getNextMode = (): LIGHT_DARK_MODE => {
		const currentMode = getStoredTheme();
		const currentIndex = modes.indexOf(currentMode);
		return modes[(currentIndex + 1 + modes.length) % modes.length] ?? AUTO_MODE;
	};

	switchBtn?.addEventListener("click", () => {
		applyMode(getNextMode());
	});

	switchBtn?.addEventListener("mouseenter", () => {
		panel?.classList.remove("float-panel-closed");
	});

	root.addEventListener("mouseleave", () => {
		panel?.classList.add("float-panel-closed");
	});

	root.querySelectorAll<HTMLElement>(".theme-option").forEach((button) => {
		button.addEventListener("click", () => {
			const mode = button.getAttribute(
				"data-theme-option",
			) as LIGHT_DARK_MODE | null;
			if (mode) {
				applyMode(mode);
			}
		});
	});

	const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)");
	const handlePreferenceChange = () => {
		if (getStoredTheme() === AUTO_MODE) {
			updateThemeSwitcher(AUTO_MODE);
		}
	};

	darkModePreference.addEventListener("change", handlePreferenceChange);
	updateThemeSwitcher(getStoredTheme());
}

initThemeSwitcher();
document.addEventListener("astro:after-swap", initThemeSwitcher);
