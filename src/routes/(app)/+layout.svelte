<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { logout } from '../(auth)/auth.remote';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const onDashboard = $derived(
		page.url.pathname === '/dashboard' || page.url.pathname.startsWith('/sites')
	);
</script>

<div class="flex min-h-screen">
	<!-- Sidebar (desktop) -->
	<aside class="bg-elev border-line hidden w-60 shrink-0 flex-col border-r md:flex">
		<div class="border-line border-b p-4">
			<a href={resolve('/dashboard')} class="font-display text-lg font-semibold text-text">
				SEO<span class="text-accent">Master</span>
			</a>
			<div class="mt-2"><span class="pill">{data.organization.name}</span></div>
		</div>

		<nav class="flex-1 space-y-1 p-3">
			<a
				href={resolve('/dashboard')}
				class="block rounded-field px-3 py-2 text-sm font-medium transition"
				class:bg-accent-soft={onDashboard}
				class:text-accent={onDashboard}
				class:text-dim={!onDashboard}
			>
				Websites
			</a>
		</nav>

		<div class="border-line border-t p-4">
			<p class="mono mb-2 truncate text-xs text-faint">{data.user.email}</p>
			<form {...logout}>
				<button class="btn w-full text-sm">Sign out</button>
			</form>
		</div>
	</aside>

	<div class="flex min-w-0 flex-1 flex-col">
		<!-- Top bar (mobile) -->
		<header
			class="bg-elev border-line flex items-center justify-between border-b px-4 py-3 md:hidden"
		>
			<a href={resolve('/dashboard')} class="font-display text-lg font-semibold text-text">
				SEO<span class="text-accent">Master</span>
			</a>
			<form {...logout}>
				<button class="btn px-3 py-1.5 text-sm">Sign out</button>
			</form>
		</header>

		<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
			{@render children()}
		</main>
	</div>
</div>
