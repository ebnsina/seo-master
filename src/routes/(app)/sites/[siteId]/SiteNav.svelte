<script lang="ts">
	import { resolve } from '$app/paths';

	type Section =
		| 'overview'
		| 'keywords'
		| 'rankings'
		| 'competitors'
		| 'links'
		| 'content'
		| 'analytics';

	let { siteId, current }: { siteId: string; current: Section } = $props();

	const tabs: { key: Section; label: string; href: string }[] = $derived([
		{ key: 'overview', label: 'Report', href: resolve('/(app)/sites/[siteId]', { siteId }) },
		{
			key: 'keywords',
			label: 'Keywords',
			href: resolve('/(app)/sites/[siteId]/keywords', { siteId })
		},
		{
			key: 'rankings',
			label: 'Rankings',
			href: resolve('/(app)/sites/[siteId]/rankings', { siteId })
		},
		{
			key: 'competitors',
			label: 'Competitors',
			href: resolve('/(app)/sites/[siteId]/competitors', { siteId })
		},
		{
			key: 'links',
			label: 'Links',
			href: resolve('/(app)/sites/[siteId]/links', { siteId })
		},
		{
			key: 'content',
			label: 'Content',
			href: resolve('/(app)/sites/[siteId]/content', { siteId })
		},
		{
			key: 'analytics',
			label: 'Analytics',
			href: resolve('/(app)/sites/[siteId]/analytics', { siteId })
		}
	]);
</script>

<div class="border-line mb-6 border-b">
	<a href={resolve('/dashboard')} class="mb-3 inline-block text-sm text-dim hover:text-accent">
		← All websites
	</a>
	<nav class="-mb-px flex gap-1 overflow-x-auto">
		{#each tabs as tab (tab.key)}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- tab.href is already resolve()d -->
			<a
				href={tab.href}
				class="border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition"
				class:border-accent={tab.key === current}
				class:text-accent={tab.key === current}
				class:border-transparent={tab.key !== current}
				class:text-dim={tab.key !== current}
			>
				{tab.label}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/each}
	</nav>
</div>
