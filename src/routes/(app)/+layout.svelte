<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { logout } from '../(auth)/auth.remote';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let drawerOpen = $state(false);

	const onWebsites = $derived(
		page.url.pathname === '/dashboard' || page.url.pathname.startsWith('/sites')
	);
	const onSetup = $derived(page.url.pathname.startsWith('/welcome'));

	function close() {
		drawerOpen = false;
	}
</script>

{#snippet sidebar()}
	<div class="flex h-full flex-col">
		<div class="border-line border-b px-5 py-5">
			<a
				href={resolve('/dashboard')}
				onclick={close}
				class="font-display text-xl font-semibold text-text"
			>
				SEO<span class="text-accent">Master</span>
			</a>
			<div class="mt-3"><span class="pill">{data.organization.name}</span></div>
		</div>

		<nav class="flex-1 space-y-1 p-3">
			<a
				href={resolve('/welcome')}
				onclick={close}
				class="block rounded-field px-3 py-2.5 text-sm font-medium transition"
				class:bg-accent-soft={onSetup}
				class:text-accent={onSetup}
				class:text-dim={!onSetup}
			>
				+ New website
			</a>
			<a
				href={resolve('/dashboard')}
				onclick={close}
				class="block rounded-field px-3 py-2.5 text-sm font-medium transition"
				class:bg-accent-soft={onWebsites}
				class:text-accent={onWebsites}
				class:text-dim={!onWebsites}
			>
				Websites
			</a>
		</nav>

		<div class="border-line border-t p-4">
			<p class="mono mb-2 truncate text-xs text-faint">{data.user.email}</p>
			<form {...logout}><button class="btn w-full text-sm">Sign out</button></form>
		</div>
	</div>
{/snippet}

<div class="flex min-h-screen">
	<!-- Desktop sidebar -->
	<aside
		class="bg-elev border-line hidden w-64 shrink-0 border-r md:sticky md:top-0 md:block md:h-screen md:overflow-y-auto print:!hidden"
	>
		{@render sidebar()}
	</aside>

	<!-- Mobile drawer -->
	{#if drawerOpen}
		<button class="fixed inset-0 z-40 bg-black/30 md:hidden" aria-label="Close menu" onclick={close}
		></button>
		<aside class="bg-elev border-line fixed inset-y-0 left-0 z-50 w-64 border-r md:hidden">
			{@render sidebar()}
		</aside>
	{/if}

	<div class="flex min-w-0 flex-1 flex-col">
		<!-- Mobile top bar -->
		<header
			class="bg-elev border-line flex items-center gap-3 border-b px-4 py-3 md:hidden print:!hidden"
		>
			<button onclick={() => (drawerOpen = true)} aria-label="Open menu" class="text-text">
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				>
					<path d="M3 6h18M3 12h18M3 18h18" />
				</svg>
			</button>
			<a href={resolve('/dashboard')} class="font-display text-lg font-semibold text-text">
				SEO<span class="text-accent">Master</span>
			</a>
		</header>

		<main class="mx-auto w-full max-w-5xl flex-1 px-6 py-10 sm:px-8">
			{@render children()}
		</main>
	</div>
</div>
