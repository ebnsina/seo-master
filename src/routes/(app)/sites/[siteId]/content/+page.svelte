<script lang="ts">
	import { resolve } from '$app/paths';
	import { createBrief, deleteBrief, generateBriefDraft, getContent } from '../content.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const content = $derived(getContent(data.siteId));

	let keyword = $state('');
	let creating = $state(false);
	let busyId = $state<string | null>(null);

	async function create(event: SubmitEvent) {
		event.preventDefault();
		if (keyword.trim().length < 2) return;
		creating = true;
		try {
			await createBrief({ siteId: data.siteId, keyword: keyword.trim() });
			keyword = '';
		} finally {
			creating = false;
		}
	}

	async function draft(briefId: string) {
		busyId = briefId;
		try {
			await generateBriefDraft({ siteId: data.siteId, briefId });
		} finally {
			busyId = null;
		}
	}
</script>

<svelte:head><title>Content briefs · SEOMaster</title></svelte:head>

<a
	href={resolve('/(app)/sites/[siteId]', { siteId: data.siteId })}
	class="text-sm text-dim hover:text-accent"
>
	← Back to site
</a>

<div class="mt-4 space-y-6">
	<div>
		<h1 class="text-2xl text-text">Content briefs</h1>
		<p class="mt-1 text-dim">
			Enter a topic and we’ll build a brief — the questions to answer, headings, topics to cover,
			and pages to link — so you can write content that ranks.
		</p>
	</div>

	<form onsubmit={create} class="flex gap-3">
		<input
			bind:value={keyword}
			placeholder="e.g. how to start running"
			class="field"
			aria-label="Topic"
		/>
		<button class="btn btn-primary" disabled={creating}>
			{creating ? 'Building…' : 'Create brief'}
		</button>
	</form>

	{#if content.error}
		<div class="card p-6 text-bad">Couldn’t load briefs.</div>
	{:else if !content.ready}
		<div class="card p-6 text-dim">Loading…</div>
	{:else if content.current.briefs.length === 0}
		<div class="card p-10 text-center text-dim">
			No briefs yet. Create one above to get a ready-to-write content plan.
		</div>
	{:else}
		{#each content.current.briefs as row (row.id)}
			{@const b = row.brief}
			<div class="card p-5">
				<div class="flex flex-wrap items-center gap-2">
					<h2 class="flex-1 text-lg text-text">{b.keyword}</h2>
					<span class="text-xs font-semibold text-accent uppercase">{b.intent}</span>
					<span class="text-xs text-faint">~{b.recommendedWords} words</span>
					<button
						onclick={() => deleteBrief({ siteId: data.siteId, briefId: row.id })}
						class="btn px-2 py-1 text-xs"
					>
						Delete
					</button>
				</div>

				<div class="mt-4 grid gap-4 text-sm sm:grid-cols-2">
					<div>
						<p class="font-medium text-text">Questions to answer</p>
						<ul class="mt-1 list-disc space-y-0.5 pl-5 text-dim">
							{#each b.questions as q (q)}<li>{q}</li>{:else}<li class="text-faint">
									None found
								</li>{/each}
						</ul>
					</div>
					<div>
						<p class="font-medium text-text">Suggested headings</p>
						<ul class="mt-1 list-disc space-y-0.5 pl-5 text-dim">
							{#each b.headings as h (h)}<li>{h}</li>{/each}
						</ul>
					</div>
					<div>
						<p class="font-medium text-text">Topics to cover</p>
						<div class="mt-1 flex flex-wrap gap-1.5">
							{#each b.entities as e (e)}<span class="pill">{e}</span>{/each}
						</div>
					</div>
					<div>
						<p class="font-medium text-text">Link from these pages</p>
						<ul class="mt-1 space-y-0.5 text-dim">
							{#each b.internalLinks as l (l.url)}
								<li class="mono truncate text-xs">{l.title}</li>
							{:else}
								<li class="text-faint">No related pages found yet</li>
							{/each}
						</ul>
					</div>
				</div>

				<!-- AI draft -->
				<div class="mt-4 border-t border-line pt-4">
					{#if row.draft}
						<p class="font-medium text-text">{row.draft.title}</p>
						<p class="mt-1 text-sm text-dim italic">{row.draft.metaDescription}</p>
						<div class="mt-3 space-y-2 text-sm">
							{#each row.draft.outline as section (section.heading)}
								<div>
									<p class="font-medium text-text">{section.heading}</p>
									<ul class="mt-0.5 list-disc space-y-0.5 pl-5 text-dim">
										{#each section.points as point (point)}<li>{point}</li>{/each}
									</ul>
								</div>
							{/each}
						</div>
					{:else if content.current.aiAvailable}
						<button onclick={() => draft(row.id)} disabled={busyId === row.id} class="btn text-sm">
							{busyId === row.id ? 'Generating…' : '✨ Generate AI draft'}
						</button>
					{:else}
						<p class="text-xs text-faint">
							Connect an AI key to auto-generate a title, meta description and outline from this
							brief.
						</p>
					{/if}
				</div>
			</div>
		{/each}
	{/if}
</div>
