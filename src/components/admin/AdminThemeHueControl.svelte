<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { tick } from "svelte";

export let initialHue = 0;
export let defaultHue = 0;
export let name = "themeHue";

let hue = initialHue;
let rangeEl: HTMLInputElement;

function applyHue() {
	if (typeof document === "undefined") return;
	document.documentElement.style.setProperty("--hue", String(hue));
	// In admin, we don't save to localStorage here because this is for setting the global default,
	// which is saved via the form submission.
}

async function resetHue() {
	hue = defaultHue;
	await tick();
	rangeEl?.dispatchEvent(new Event("input", { bubbles: true }));
}

$: if (hue || hue === 0) {
	applyHue();
}
</script>

<div id="display-setting" class="dark admin-theme-hue-control float-panel transition-all w-80 px-4 py-4">
	<div class="flex flex-row gap-2 mb-3 items-center justify-between">
		<div
			class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3
				before:w-1 before:h-4 before:rounded-md before:bg-[var(--primary)]
				before:absolute before:-left-3 before:top-[0.33rem]"
		>
			{i18n(I18nKey.themeColor)}
			<div class="flex gap-1">
				<button
					type="button"
					aria-label="Reset to Default"
					class="btn-regular w-7 h-7 rounded-md active:scale-90 will-change-transform"
					class:opacity-0={hue === defaultHue}
					class:pointer-events-none={hue === defaultHue}
					on:click={resetHue}
					title="恢复预设值"
				>
					<div class="text-[var(--btn-content)]">
						<Icon icon="fa6-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
					</div>
				</button>
			</div>
		</div>
		<div class="flex gap-1">
			<div
				id="hueValue"
				class="transition bg-[var(--btn-regular-bg)] w-10 h-7 rounded-md flex justify-center
				font-bold text-sm items-center text-[var(--btn-content)]"
			>
				{hue}
			</div>
		</div>
	</div>
	<div class="w-full h-6 px-1 bg-[oklch(0.80_0.10_0)] dark:bg-[oklch(0.70_0.10_0)] rounded select-none">
		<input
			bind:this={rangeEl}
			aria-label={i18n(I18nKey.themeColor)}
			type="range"
			min="0"
			max="360"
			bind:value={hue}
			class="slider"
			id="colorSlider"
			step="5"
			style="width: 100%"
			{name}
		>
	</div>
</div>

<style lang="stylus">
  .admin-theme-hue-control
    --primary oklch(0.75 0.14 var(--hue))
    --float-panel-bg oklch(0.19 0.015 var(--hue))
    --btn-regular-bg oklch(0.33 0.035 var(--hue))
    --btn-regular-bg-hover oklch(0.38 0.04 var(--hue))
    --btn-regular-bg-active oklch(0.43 0.045 var(--hue))
    --btn-content oklch(0.75 0.1 var(--hue))
    --color-selection-bar linear-gradient(to right, oklch(0.70 0.10 0), oklch(0.70 0.10 30), oklch(0.70 0.10 60), oklch(0.70 0.10 90), oklch(0.70 0.10 120), oklch(0.70 0.10 150), oklch(0.70 0.10 180), oklch(0.70 0.10 210), oklch(0.70 0.10 240), oklch(0.70 0.10 270), oklch(0.70 0.10 300), oklch(0.70 0.10 330), oklch(0.70 0.10 360))

  #display-setting
    input[type="range"]
      -webkit-appearance none
      appearance none
      width 100%
      height 1.5rem
      background-image var(--color-selection-bar)
      background-color transparent
      background-repeat no-repeat
      background-size 100% 100%
      transition background-image 0.15s ease-in-out

      &::-webkit-slider-thumb
        -webkit-appearance none
        height 1rem
        width 0.5rem
        border-radius 0.125rem
        background rgba(255, 255, 255, 0.7)
        box-shadow none
        &:hover
          background rgba(255, 255, 255, 0.8)
        &:active
          background rgba(255, 255, 255, 0.6)

      &::-moz-range-thumb
        -webkit-appearance none
        height 1rem
        width 0.5rem
        border-radius 0.125rem
        border-width 0
        background rgba(255, 255, 255, 0.7)
        box-shadow none
        &:hover
          background rgba(255, 255, 255, 0.8)
        &:active
          background rgba(255, 255, 255, 0.6)

      &::-ms-thumb
        -webkit-appearance none
        height 1rem
        width 0.5rem
        border-radius 0.125rem
        background rgba(255, 255, 255, 0.7)
        box-shadow none
        &:hover
          background rgba(255, 255, 255, 0.8)
        &:active
          background rgba(255, 255, 255, 0.6)
</style>
