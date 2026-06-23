<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Globe from '@lucide/svelte/icons/globe';
	import Rocket from '@lucide/svelte/icons/rocket';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { addSite, getSites, removeSite } from '../sites.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const sites = getSites();
</script>

<svelte:head>
	<title>Your websites · SEOMaster</title>
</svelte:head>

<div class="space-y-12">
	<div>
		<h1 class="font-display text-3xl text-text">Welcome back, {data.user.name}</h1>
		<p class="mt-2 text-lg leading-relaxed text-dim">Let’s get your websites ranking on Google.</p>
	</div>

	<!-- First-run: guided setup hero -->
	{#if sites.ready && sites.current.length === 0}
		<div class="card p-10 text-center sm:p-14">
			<div
				class="bg-accent-soft text-accent mx-auto inline-flex size-14 items-center justify-center rounded-field"
			>
				<Rocket size={26} />
			</div>
			<h2 class="font-display mt-5 text-2xl text-text">New here? Let’s set you up</h2>
			<p class="mx-auto mt-3 max-w-md leading-relaxed text-dim">
				A quick 3-step walkthrough: add your site, run a free audit, and get a clear list of fixes.
			</p>
			<a href={resolve('/welcome')} class="btn btn-primary mt-7 inline-flex px-6">
				Start guided setup <ArrowRight size={18} />
			</a>
		</div>
	{/if}

	<!-- Quick add -->
	<div class="card p-7">
		<h2 class="text-lg font-medium text-text">
			{sites.ready && sites.current.length > 0 ? 'Add another website' : 'Add a website'}
		</h2>
		<p class="mt-1 text-sm leading-relaxed text-dim">
			Paste your address — no technical setup needed.
		</p>

		<form {...addSite} class="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
			<div>
				<input
					{...addSite.fields.url.as('text')}
					placeholder="example.com"
					class="field"
					aria-label="Website address"
				/>
				{#each addSite.fields.url.issues() as issue (issue.message)}
					<span class="mt-1 block text-sm text-bad">{issue.message}</span>
				{/each}
			</div>
			<input
				{...addSite.fields.name.as('text')}
				placeholder="Friendly name (optional)"
				class="field"
				aria-label="Friendly name"
			/>
			<button disabled={addSite.pending > 0} class="btn btn-primary">
				{addSite.pending > 0 ? 'Adding…' : 'Add website'}
			</button>
		</form>
	</div>

	<!-- Site list -->
	{#if sites.error}
		<div class="card p-6 text-bad">Couldn’t load your websites. Please refresh.</div>
	{:else if sites.ready && sites.current.length > 0}
		<div>
			<h2 class="mb-4 text-lg font-medium text-text">Your websites</h2>
			<ul class="grid gap-4">
				{#each sites.current as site (site.id)}
					<li class="card flex items-center gap-4 p-6">
						<div
							class="bg-accent-soft text-accent hidden size-11 shrink-0 items-center justify-center rounded-field sm:inline-flex"
						>
							<Globe size={20} />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<a
									href={resolve('/(app)/sites/[siteId]', { siteId: site.id })}
									class="truncate text-lg font-medium text-text hover:text-accent"
								>
									{site.name}
								</a>
								{#if site.verificationStatus === 'verified'}
									<span class="pill pill-good">Verified</span>
								{/if}
							</div>
							<span class="mono text-sm text-dim">{site.domain}</span>
						</div>
						<a
							href={resolve('/(app)/sites/[siteId]', { siteId: site.id })}
							class="btn btn-primary px-4 py-2 text-sm"
						>
							Open report
						</a>
						<button
							onclick={() => removeSite(site.id)}
							disabled={removeSite.pending > 0}
							aria-label="Remove website"
							class="btn px-3 py-2 text-sm"
						>
							<Trash2 size={16} />
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
