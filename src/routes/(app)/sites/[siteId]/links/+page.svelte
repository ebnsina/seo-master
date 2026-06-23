<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import SiteNav from '../SiteNav.svelte';
	import { analyzeLinks, getLastLinkAnalysis } from '../links.remote';
	import { formatWhen } from '$lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const last = $derived(getLastLinkAnalysis(data.siteId));

	let fresh = $state<Awaited<ReturnType<typeof analyzeLinks>> | null>(null);
	let freshAt = $state<Date | null>(null);
	let analyzing = $state(false);

	const analysis = $derived(fresh ?? (last.ready ? (last.current?.data ?? null) : null));
	const analyzedAt = $derived(freshAt ?? (last.ready ? (last.current?.createdAt ?? null) : null));

	async function analyze() {
		analyzing = true;
		try {
			fresh = await analyzeLinks(data.siteId);
			freshAt = new Date();
		} finally {
			analyzing = false;
		}
	}

	function path(url: string): string {
		try {
			return new URL(url).pathname;
		} catch {
			return url;
		}
	}
</script>

<svelte:head><title>Internal links · SEOMaster</title></svelte:head>

<SiteNav siteId={data.siteId} current="links" />

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl text-text">Internal links</h1>
			<p class="mt-1 max-w-2xl text-dim">
				Internal links help Google find your pages and tell it which ones matter. We’ll spot pages
				nothing links to, and suggest links between related pages.
			</p>
		</div>
		<button onclick={analyze} disabled={analyzing} class="btn btn-primary">
			{analyzing ? 'Analyzing…' : 'Analyze links'}
		</button>
	</div>

	{#if analyzing}
		<div class="card p-8 text-center text-dim">
			Crawling your pages and mapping how they link to each other — this can take a minute.
		</div>
	{:else if analysis}
		{#if !analysis.analyzed}
			<div class="note note-warn p-5 text-sm text-dim">
				We couldn’t find enough public pages to analyze. Make sure your site is live and has a few
				linked pages, then try again.
			</div>
		{:else}
			<p class="text-sm text-faint">
				{analysis.pagesAnalyzed} pages analyzed{analyzedAt ? ` · ${formatWhen(analyzedAt)}` : ''}.
			</p>

			<!-- Orphan pages -->
			<div class="card p-5">
				<h2 class="text-lg text-text">Orphan pages</h2>
				<p class="mt-1 text-sm text-dim">
					Nothing on your site links to these pages, so they’re hard to find and rank. Add a link to
					each from a relevant page or your menu.
				</p>
				{#if analysis.orphans.length === 0}
					<p class="mt-3 text-sm text-good">No orphan pages — every page is linked. Nice.</p>
				{:else}
					<ul class="mt-3 space-y-2">
						{#each analysis.orphans as o (o.url)}
							<li class="rounded-field bg-elev-2 px-4 py-2.5">
								<p class="truncate text-sm font-medium text-text">{o.title}</p>
								<p class="mono truncate text-xs text-dim">{path(o.url)}</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Link suggestions -->
			<div class="card p-5">
				<h2 class="text-lg text-text">Suggested internal links</h2>
				<p class="mt-1 text-sm text-dim">
					These pages cover related topics but don’t link to each other yet. Adding a link helps
					both rank.
				</p>
				{#if analysis.suggestions.length === 0}
					<p class="mt-3 text-sm text-good">
						Your related pages are already well linked — nothing to suggest.
					</p>
				{:else}
					<ul class="mt-3 space-y-3">
						{#each analysis.suggestions as s (s.fromUrl + s.toUrl)}
							<li class="rounded-field bg-elev-2 p-4">
								<div class="flex flex-wrap items-center gap-2 text-sm">
									<span class="min-w-0 flex-1 truncate font-medium text-text" title={s.fromTitle}>
										{s.fromTitle}
									</span>
									<ArrowRight size={15} class="text-accent" />
									<span class="min-w-0 flex-1 truncate font-medium text-text" title={s.toTitle}>
										{s.toTitle}
									</span>
								</div>
								<div class="mono mt-1 flex flex-wrap gap-x-2 text-xs text-dim">
									<span class="truncate">{path(s.fromUrl)}</span>
									<span>→</span>
									<span class="truncate">{path(s.toUrl)}</span>
								</div>
								<div class="mt-2 flex flex-wrap gap-1.5">
									{#each s.sharedTerms as term (term)}
										<span class="pill">{term}</span>
									{/each}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	{:else}
		<div class="note note-info p-5 text-sm text-dim">
			Click <strong class="text-accent">Analyze links</strong> to map your site’s internal links. We’ll
			crawl up to 25 pages — no setup needed.
		</div>
	{/if}
</div>
