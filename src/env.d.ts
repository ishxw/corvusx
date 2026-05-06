/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />
/// <reference path="./global.d.ts" />

declare namespace App {
	interface Locals {
		adminUser: string | null;
	}
}
