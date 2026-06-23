<script lang="ts">
	import { resolve } from '$app/paths';
	import { getCategory, getGuidance, SEVERITY_ORDER } from '$lib/guidance/issues';
	import type { IssueSeverity } from '$lib/server/db/schema';
	import { getAudit, startAudit } from './audit.remote';
	import GoogleCard from './GoogleCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const audit = $derived(getAudit(data.siteId));

	const status = $derived(audit.current?.audit?.crawl.status);
	const running = $derived(status === 'queued' || status === 'running');

	// Poll while a crawl is in flight.
	$effect(() => {
		if (!running) return;
		const id = setInterval(() => void getAudit(data.siteId).refresh(), 2500);
		return () => clearInterval(id);
	});

	interface IssueGroup {
		code: string;
		severity: IssueSeverity;
		title: string;
		items: { pageUrl: string | null; detail: string | null }[];
	}

	const groups = $derived.by<IssueGroup[]>(() => {
		const snap = audit.current?.audit;
		if (!snap) return [];
		const byCode: Record<string, IssueGroup> = {};
		const order: string[] = [];
		for (const issue of snap.issues) {
			let group = byCode[issue.code];
			if (!group) {
				group = {
					code: issue.code,
					severity: issue.severity,
					title: getGuidance(issue.code)?.title ?? issue.code,
					items: []
				};
				byCode[issue.code] = group;
				order.push(issue.code);
			}
			group.items.push({ pageUrl: issue.pageUrl, detail: issue.detail });
		}
		return order
			.map((code) => byCode[code])
			.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
	});

	const seoGroups = $derived(groups.filter((g) => getCategory(g.code) === 'seo'));
	const geoGroups = $derived(groups.filter((g) => getCategory(g.code) === 'geo'));

	function scoreColor(score: number): string {
		if (score >= 80) return 'text-good';
		if (score >= 50) return 'text-warn';
		return 'text-bad';
	}

	const severityLabel: Record<IssueSeverity, string> = {
		critical: 'Critical',
		warning: 'Warning',
		notice: 'Suggestion'
	};
	const severityClass: Record<IssueSeverity, string> = {
		critical: 'text-bad',
		warning: 'text-warn',
		notice: 'text-faint'
	};

	async function runAudit() {
		await startAudit(data.siteId);
	}
</script>

<svelte:head>
	<title>{audit.current?.site.name ?? 'Site'} · Audit · SEOMaster</title>
</svelte:head>

<a href={resolve('/dashboard')} class="text-sm text-dim hover:text-accent">← All websites</a>

{#if audit.error}
	<div class="card mt-4 p-6 text-bad">Couldn’t load this website.</div>
{:else if !audit.ready}
	<div class="card mt-4 p-6 text-dim">Loading…</div>
{:else}
	{@const data = audit.current}
	<div class="mt-4 space-y-6">
		<!-- Header -->
		<div class="flex flex-wrap items-center gap-3">
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<h1 class="truncate text-2xl text-text">{data.site.name}</h1>
					{#if data.site.isLocal}<span class="pill">Local</span>{/if}
				</div>
				<span class="mono text-sm text-dim">{data.site.url}</span>
			</div>
			<a
				href={resolve('/(app)/sites/[siteId]/keywords', { siteId: data.site.id })}
				class="btn text-sm"
			>
				Keyword research
			</a>
			<a
				href={resolve('/(app)/sites/[siteId]/rankings', { siteId: data.site.id })}
				class="btn text-sm"
			>
				Rank tracking
			</a>
			<a
				href={resolve('/(app)/sites/[siteId]/competitors', { siteId: data.site.id })}
				class="btn text-sm"
			>
				Competitors
			</a>
			<a
				href={resolve('/(app)/sites/[siteId]/content', { siteId: data.site.id })}
				class="btn text-sm"
			>
				Content
			</a>
			<button
				onclick={runAudit}
				disabled={running || startAudit.pending > 0}
				class="btn btn-primary"
			>
				{running ? 'Auditing…' : data.audit ? 'Re-run audit' : 'Run audit'}
			</button>
		</div>

		{#if running}
			<div class="card p-8 text-center text-dim">
				<p>Auditing your site — crawling pages and checking for issues. This can take a minute.</p>
			</div>
		{:else if !data.audit}
			<div class="card p-10 text-center">
				<h2 class="text-lg text-text">No audit yet</h2>
				<p class="mx-auto mt-2 max-w-md text-dim">
					Run your first audit and we’ll crawl your pages, then show you exactly what to fix —
					explained in plain language.
				</p>
			</div>
		{:else if data.audit.crawl.status === 'failed'}
			<div class="card p-6">
				<p class="text-bad">The audit couldn’t finish.</p>
				<p class="mt-1 text-sm text-dim">{data.audit.crawl.error ?? 'Please try again.'}</p>
			</div>
		{:else}
			<!-- Readiness verdict -->
			{#if data.readiness}
				{@const r = data.readiness}
				<div
					class="card border-l-4 p-5"
					style:border-left-color={r.ready ? 'var(--good)' : 'var(--bad)'}
				>
					<div class="flex items-center gap-2">
						<span class="text-lg">{r.ready ? '✅' : '⚠️'}</span>
						<h2 class="text-lg text-text">{r.headline}</h2>
					</div>
					<p class="mt-1 text-dim">{r.detail}</p>
				</div>
			{/if}

			<!-- Submit to Google -->
			<GoogleCard siteId={data.site.id} />

			<!-- Score + summary -->
			<div class="grid gap-3 sm:grid-cols-3">
				<div class="card p-5 text-center">
					<div class="text-4xl font-semibold {scoreColor(data.audit.crawl.healthScore ?? 0)}">
						{data.audit.crawl.healthScore}
					</div>
					<div class="mt-1 text-sm text-dim">Health score</div>
				</div>
				<div class="card p-5 text-center">
					<div class="text-4xl font-semibold text-text">{data.audit.crawl.pagesCrawled}</div>
					<div class="mt-1 text-sm text-dim">Pages checked</div>
				</div>
				<div class="card p-5 text-center">
					<div class="text-4xl font-semibold text-text">{data.audit.issues.length}</div>
					<div class="mt-1 text-sm text-dim">Issues found</div>
				</div>
			</div>

			<!-- Speed & Core Web Vitals -->
			{#if data.audit.crawl.performanceScore != null}
				{@const c = data.audit.crawl}
				<div class="card p-5">
					<h2 class="text-lg text-text">Speed &amp; Core Web Vitals</h2>
					<p class="mt-1 text-sm text-dim">
						From Google PageSpeed (mobile). Faster loads and stable layouts rank better.
					</p>
					<div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
						<div class="rounded-field bg-elev-2 p-3 text-center">
							<div class="text-2xl font-semibold {scoreColor(c.performanceScore ?? 0)}">
								{c.performanceScore}
							</div>
							<div class="text-xs text-dim">Performance</div>
						</div>
						<div class="rounded-field bg-elev-2 p-3 text-center">
							<div class="text-2xl font-semibold text-text">
								{c.lcpMs != null ? `${(c.lcpMs / 1000).toFixed(1)}s` : '—'}
							</div>
							<div class="text-xs text-dim">LCP (load)</div>
						</div>
						<div class="rounded-field bg-elev-2 p-3 text-center">
							<div class="text-2xl font-semibold text-text">{c.clsScore?.toFixed(2) ?? '—'}</div>
							<div class="text-xs text-dim">CLS (shift)</div>
						</div>
						<div class="rounded-field bg-elev-2 p-3 text-center">
							<div class="text-2xl font-semibold text-text">
								{c.tbtMs != null ? `${c.tbtMs}ms` : '—'}
							</div>
							<div class="text-xs text-dim">TBT (blocking)</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Classic SEO issues -->
			{#if groups.length === 0}
				<div class="card p-8 text-center text-good">🎉 No issues found — great work!</div>
			{:else}
				{#if seoGroups.length > 0}
					<div class="space-y-3">
						<h2 class="text-lg text-text">What to fix</h2>
						{#each seoGroups as group (group.code)}
							{@render issueCard(group)}
						{/each}
					</div>
				{/if}

				<!-- AI search readiness (GEO) -->
				{#if geoGroups.length > 0}
					<div class="space-y-3">
						<h2 class="text-lg text-text">Get found by AI assistants</h2>
						<p class="-mt-1 text-sm text-dim">
							“GEO” means making your site easy for AI answer tools (ChatGPT, Claude, Perplexity) to
							read and cite. Fixing these helps you show up when people ask AI instead of searching.
						</p>
						{#each geoGroups as group (group.code)}
							{@render issueCard(group)}
						{/each}
					</div>
				{/if}
			{/if}
		{/if}
	</div>
{/if}

{#snippet issueCard(group: IssueGroup)}
	{@const g = getGuidance(group.code)}
	<details class="card p-5">
		<summary class="flex cursor-pointer items-center gap-3">
			<span class="text-xs font-semibold uppercase {severityClass[group.severity]}">
				{severityLabel[group.severity]}
			</span>
			<span class="flex-1 font-medium text-text">{group.title}</span>
			<span class="text-sm text-dim">
				{group.items.length}
				{group.items.length === 1 ? 'page' : 'pages'}
			</span>
		</summary>

		{#if g}
			<div class="mt-4 space-y-3 text-sm">
				<p class="text-dim"><strong class="text-text">What it is:</strong> {g.whatItIs}</p>
				<p class="text-dim"><strong class="text-text">Why it matters:</strong> {g.whyItMatters}</p>
				<div class="text-dim">
					<strong class="text-text">How to fix it:</strong>
					<ul class="mt-1 list-disc space-y-1 pl-5">
						{#each g.howToFix as step (step)}
							<li>{step}</li>
						{/each}
					</ul>
				</div>
				{#if g.difficulty === 'technical'}
					<p class="text-xs text-faint">
						This one’s technical — share it with whoever manages your site.
					</p>
				{/if}
			</div>
		{/if}

		<div class="mt-4 border-t border-line pt-3">
			<p class="mb-1 text-xs font-semibold text-faint">Affected:</p>
			<ul class="space-y-1">
				{#each group.items as item, i (item.pageUrl ?? i)}
					<li class="mono truncate text-xs text-dim">
						{item.pageUrl ?? 'Whole site'}{item.detail ? ` — ${item.detail}` : ''}
					</li>
				{/each}
			</ul>
		</div>
	</details>
{/snippet}
