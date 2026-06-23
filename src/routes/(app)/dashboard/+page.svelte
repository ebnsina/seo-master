<script lang="ts">
	import { resolve } from '$app/paths';
	import { addSite, getSites, removeSite } from '../sites.remote';

	const sites = getSites();
</script>

<svelte:head>
	<title>Your websites · SEOMaster</title>
</svelte:head>

<div class="space-y-8">
	<div>
		<h1 class="text-2xl text-text">Your websites</h1>
		<p class="mt-1 text-dim">
			Add a website and we’ll check what’s holding it back — then guide you, step by step, toward
			ranking on Google.
		</p>
	</div>

	<!-- Add a website -->
	<div class="card p-6">
		<h2 class="text-lg text-text">Add a website</h2>
		<p class="mt-1 text-sm text-dim">Paste your address — no technical setup needed.</p>

		<form {...addSite} class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
	{:else if !sites.ready}
		<div class="card p-6 text-dim">Loading your websites…</div>
	{:else if sites.current.length === 0}
		<div class="card p-10 text-center">
			<h2 class="text-lg text-text">No websites yet</h2>
			<p class="mx-auto mt-2 max-w-md text-dim">
				Add your first website above. We’ll scan it and show you the most important things to fix
				first — explained in plain language.
			</p>
		</div>
	{:else}
		<ul class="grid gap-3">
			{#each sites.current as site (site.id)}
				<li class="card flex items-center gap-4 p-5">
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<a
								href={resolve('/(app)/sites/[siteId]', { siteId: site.id })}
								class="truncate font-medium text-text hover:text-accent"
							>
								{site.name}
							</a>
							{#if site.verificationStatus === 'verified'}
								<span class="pill pill-good">Verified</span>
							{:else}
								<span class="text-xs text-faint">Not verified yet</span>
							{/if}
						</div>
						<span class="mono text-sm text-dim">{site.domain}</span>
					</div>
					<a
						href={resolve('/(app)/sites/[siteId]', { siteId: site.id })}
						class="btn btn-primary px-4 py-2 text-sm"
					>
						Audit
					</a>
					<button
						onclick={() => removeSite(site.id)}
						disabled={removeSite.pending > 0}
						class="btn px-4 py-2 text-sm"
					>
						Remove
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
