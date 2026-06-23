<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { fixIssue, type FixResult } from './audit.remote';

	let { siteId, code, pageUrl }: { siteId: string; code: string; pageUrl?: string } = $props();

	let busy = $state(false);
	let result = $state<FixResult | null>(null);
	let copied = $state(false);

	async function run() {
		busy = true;
		copied = false;
		try {
			result = await fixIssue({ siteId, code, pageUrl });
		} finally {
			busy = false;
		}
	}

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			copied = false;
		}
	}
</script>

<div class="mt-4 border-t border-line pt-3">
	{#if !result || !result.ok}
		<button onclick={run} disabled={busy} class="btn btn-primary text-xs">
			<Sparkles size={14} />
			{busy ? 'Writing your fix…' : 'Fix this for me with AI'}
		</button>
		{#if result && !result.ok && result.message}
			<p class="mt-2 text-xs text-faint">{result.message}</p>
		{/if}
	{:else if result.fix}
		{@const fix = result.fix}
		<div class="note note-info space-y-3 p-4">
			<div class="flex items-center gap-1.5 text-sm font-semibold text-accent">
				<Sparkles size={15} /> AI fix
			</div>
			<p class="text-sm text-dim">{fix.summary}</p>

			{#if fix.steps.length > 0}
				<ol class="list-decimal space-y-1 pl-5 text-sm text-dim">
					{#each fix.steps as step (step)}
						<li>{step}</li>
					{/each}
				</ol>
			{/if}

			{#if fix.snippet}
				<div>
					<div class="mb-1 flex items-center justify-between gap-2">
						<span class="text-xs font-semibold text-faint">{fix.snippetLabel ?? 'Snippet'}</span>
						<button onclick={() => copy(fix.snippet ?? '')} class="btn px-2 py-1 text-xs">
							{#if copied}<Check size={13} /> Copied{:else}<Copy size={13} /> Copy{/if}
						</button>
					</div>
					<pre
						class="mono overflow-x-auto rounded-field bg-elev p-3 text-xs text-text">{fix.snippet}</pre>
				</div>
			{/if}

			<button onclick={run} disabled={busy} class="btn text-xs">
				{busy ? 'Regenerating…' : 'Regenerate'}
			</button>
		</div>
	{/if}
</div>
