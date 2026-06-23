<script lang="ts">
	import { resolve } from '$app/paths';
	import SiteNav from '../SiteNav.svelte';
	import { getAnalytics, listAnalyticsProperties, setAnalyticsProperty } from '../analytics.remote';
	import type { Ga4Property } from '$lib/server/google/analytics';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const analytics = $derived(getAnalytics(data.siteId));

	let properties = $state<Ga4Property[] | null>(null);
	let loadError = $state<string | null>(null);
	let busy = $state(false);

	async function loadProperties() {
		busy = true;
		loadError = null;
		try {
			const res = await listAnalyticsProperties(data.siteId);
			if (res.ok) properties = res.properties;
			else loadError = res.message;
		} finally {
			busy = false;
		}
	}

	async function choose(propertyId: string) {
		busy = true;
		try {
			await setAnalyticsProperty({ siteId: data.siteId, propertyId });
			properties = null;
		} finally {
			busy = false;
		}
	}

	const fmt = (n: number) => n.toLocaleString('en-US');
</script>

<svelte:head><title>Analytics · SEOMaster</title></svelte:head>

<SiteNav siteId={data.siteId} current="analytics" />

<div class="space-y-6">
	<div>
		<h1 class="text-2xl text-text">Analytics</h1>
		<p class="mt-1 text-dim">Your real visitor numbers from Google Analytics (last 28 days).</p>
	</div>

	{#if analytics.error}
		<div class="card p-6 text-bad">Couldn’t load analytics.</div>
	{:else if !analytics.ready}
		<div class="card p-6 text-dim">Loading…</div>
	{:else if !analytics.current.connected}
		<div class="card p-6 text-dim">
			Connect Google on the
			<a
				href={resolve('/(app)/sites/[siteId]', { siteId: data.siteId })}
				class="text-accent underline">site report</a
			>
			first, then choose your Analytics property here.
		</div>
	{:else if !analytics.current.propertyId}
		<div class="card p-6">
			<h2 class="text-lg text-text">Choose your Analytics property</h2>
			<p class="mt-1 text-sm text-dim">Pick the GA4 property that tracks this website.</p>

			{#if properties === null}
				<button onclick={loadProperties} disabled={busy} class="btn btn-primary mt-4">
					{busy ? 'Loading…' : 'Load my properties'}
				</button>
				{#if loadError}<p class="mt-2 text-sm text-bad">{loadError}</p>{/if}
			{:else if properties.length === 0}
				<p class="mt-3 text-sm text-dim">No Analytics properties found on this account.</p>
			{:else}
				<ul class="mt-3 divide-y divide-line">
					{#each properties as p (p.property)}
						<li class="flex items-center gap-3 py-2">
							<div class="min-w-0 flex-1">
								<div class="truncate text-text">{p.displayName}</div>
								<div class="mono text-xs text-faint">{p.account} · {p.property}</div>
							</div>
							<button
								onclick={() => choose(p.property)}
								disabled={busy}
								class="btn px-3 py-1 text-sm"
							>
								Use this
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{:else if analytics.current.summary?.ok}
		{@const s = analytics.current.summary.summary}
		<div class="grid gap-3 sm:grid-cols-3">
			<div class="card p-5 text-center">
				<div class="text-4xl font-semibold text-text">{fmt(s.users)}</div>
				<div class="mt-1 text-sm text-dim">Visitors</div>
			</div>
			<div class="card p-5 text-center">
				<div class="text-4xl font-semibold text-text">{fmt(s.sessions)}</div>
				<div class="mt-1 text-sm text-dim">Sessions</div>
			</div>
			<div class="card p-5 text-center">
				<div class="text-4xl font-semibold text-text">{fmt(s.pageViews)}</div>
				<div class="mt-1 text-sm text-dim">Page views</div>
			</div>
		</div>
		<p class="text-xs text-faint">
			Property: <span class="mono">{analytics.current.propertyId}</span>
		</p>
	{:else}
		<div class="card p-6">
			<p class="text-bad">
				{analytics.current.summary?.message ?? 'Couldn’t load analytics data.'}
			</p>
			<button onclick={loadProperties} disabled={busy} class="btn mt-3 text-sm">
				Change property
			</button>
			{#if properties && properties.length > 0}
				<ul class="mt-3 divide-y divide-line">
					{#each properties as p (p.property)}
						<li class="flex items-center gap-3 py-2">
							<span class="min-w-0 flex-1 truncate text-text">{p.displayName}</span>
							<button
								onclick={() => choose(p.property)}
								disabled={busy}
								class="btn px-3 py-1 text-sm"
							>
								Use this
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
