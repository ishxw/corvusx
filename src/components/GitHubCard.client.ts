type GitHubRepo = {
	description?: string | null;
	language?: string | null;
	forks?: number;
	stargazers_count?: number;
	license?: {
		spdx_id?: string | null;
	} | null;
	owner?: {
		avatar_url?: string | null;
	} | null;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

function formatCompact(value: number | undefined): string {
	return numberFormatter.format(value ?? 0).replaceAll("\u202f", "");
}

async function fetchLiveRepoData(repo: string): Promise<GitHubRepo | null> {
	const response = await fetch(`https://api.github.com/repos/${repo}`, {
		referrerPolicy: "no-referrer",
		headers: {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
		},
	});

	if (!response.ok) {
		throw new Error(`GitHub API returned ${response.status}`);
	}

	return (await response.json()) as GitHubRepo;
}

function markCardError(card: HTMLAnchorElement, message: string) {
	card.classList.remove("fetch-waiting");
	card.classList.add("fetch-error");

	const description = card.querySelector<HTMLElement>(".gc-description");
	const language = card.querySelector<HTMLElement>(".gc-language");
	const forks = card.querySelector<HTMLElement>(".gc-forks");
	const stars = card.querySelector<HTMLElement>(".gc-stars");
	const license = card.querySelector<HTMLElement>(".gc-license");

	if (description) description.innerText = message;
	if (language) language.innerText = "Unknown";
	if (forks) forks.innerText = "--";
	if (stars) stars.innerText = "--";
	if (license) license.innerText = "--";
}

function applyRepoData(card: HTMLAnchorElement, data: GitHubRepo | null) {
	if (!data) {
		markCardError(card, "Repository details are temporarily unavailable");
		return;
	}

	const description = card.querySelector<HTMLElement>(".gc-description");
	const language = card.querySelector<HTMLElement>(".gc-language");
	const forks = card.querySelector<HTMLElement>(".gc-forks");
	const stars = card.querySelector<HTMLElement>(".gc-stars");
	const license = card.querySelector<HTMLElement>(".gc-license");
	const avatar = card.querySelector<HTMLElement>(".gc-avatar");

	if (description) {
		description.innerText =
			data.description?.replace(/:[a-zA-Z0-9_]+:/g, "") || "Description not set";
	}
	if (language) language.innerText = data.language || "Unknown";
	if (forks) forks.innerText = formatCompact(data.forks);
	if (stars) stars.innerText = formatCompact(data.stargazers_count);
	if (license) license.innerText = data.license?.spdx_id || "no-license";
	if (avatar && data.owner?.avatar_url) {
		avatar.style.backgroundImage = `url(${data.owner.avatar_url})`;
		avatar.style.backgroundColor = "transparent";
	}

	card.classList.remove("fetch-waiting", "fetch-error");
	card.dataset.githubCardState = "loaded";
}

async function loadGitHubCard(card: HTMLAnchorElement) {
	if (card.dataset.githubCardState === "loading" || card.dataset.githubCardState === "loaded") {
		return;
	}

	const repo = card.dataset.repo || card.getAttribute("repo");
	if (!repo) {
		markCardError(card, "Repository not configured");
		return;
	}

	card.dataset.githubCardState = "loading";

	try {
		const liveData = await fetchLiveRepoData(repo);
		applyRepoData(card, liveData);
	} catch (error) {
		console.warn("[GITHUB-CARD] Live GitHub request failed", repo, error);
		card.dataset.githubCardState = "error";
		markCardError(card, "Repository details are temporarily unavailable");
	}
}

function initGitHubCards() {
	document.querySelectorAll<HTMLAnchorElement>("a.card-github").forEach((card) => {
		void loadGitHubCard(card);
	});
}

(window as any).initGitHubCards = initGitHubCards;

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initGitHubCards, { once: true });
} else {
	initGitHubCards();
}

document.addEventListener("astro:after-swap", initGitHubCards);
