<script lang="ts">
	import { resolve } from '$app/paths';
	import { logout } from '../(auth)/auth.remote';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<div class="min-h-screen">
	<header class="border-b border-line bg-elev/80 backdrop-blur">
		<div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
			<a href={resolve('/dashboard')} class="font-display text-lg font-semibold text-text">
				SEO<span class="text-accent">Master</span>
			</a>
			<span class="pill">{data.organization.name}</span>

			<div class="ml-auto flex items-center gap-3">
				<span class="mono hidden text-sm text-dim sm:inline">{data.user.email}</span>
				<form {...logout}>
					<button class="btn px-4 py-2 text-sm">Sign out</button>
				</form>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-8">
		{@render children()}
	</main>
</div>
