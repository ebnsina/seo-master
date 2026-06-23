<script lang="ts">
	import {
		getVerificationInstructions,
		verifyOwnership,
		type SubmitResult,
		type VerificationInstructions
	} from './google.remote';

	let { siteId }: { siteId: string } = $props();

	type Method = 'META' | 'FILE' | 'DNS_TXT';
	const methods: { value: Method; label: string; hint: string }[] = [
		{ value: 'META', label: 'Add a tag', hint: 'Paste one line into your site’s HTML' },
		{ value: 'FILE', label: 'Upload a file', hint: 'Put a small file on your site' },
		{ value: 'DNS_TXT', label: 'DNS record', hint: 'Add a record at your domain provider' }
	];

	let method = $state<Method>('META');
	let instructions = $state<VerificationInstructions | null>(null);
	let result = $state<SubmitResult | null>(null);
	let busy = $state(false);

	function chooseMethod(value: Method) {
		method = value;
		instructions = null;
		result = null;
	}

	async function getInstructions() {
		busy = true;
		result = null;
		try {
			instructions = await getVerificationInstructions({ siteId, method });
		} finally {
			busy = false;
		}
	}

	async function verify() {
		busy = true;
		try {
			result = await verifyOwnership({ siteId, method });
		} finally {
			busy = false;
		}
	}
</script>

<div class="mt-4 rounded-field border border-line bg-elev-2 p-4">
	<h3 class="font-medium text-text">Verify you own this site</h3>
	<p class="mt-1 text-sm text-dim">
		Google needs to confirm the site is yours before it accepts your sitemap. Pick the way that’s
		easiest for you.
	</p>

	<div class="mt-3 flex flex-wrap gap-2">
		{#each methods as m (m.value)}
			<button
				onclick={() => chooseMethod(m.value)}
				class="rounded-field border px-3 py-2 text-left text-sm transition"
				class:border-accent={method === m.value}
				class:text-accent={method === m.value}
				class:border-line={method !== m.value}
			>
				<span class="block font-medium">{m.label}</span>
				<span class="block text-xs text-faint">{m.hint}</span>
			</button>
		{/each}
	</div>

	{#if !instructions}
		<button onclick={getInstructions} disabled={busy} class="btn btn-primary mt-4 text-sm">
			{busy ? 'Getting instructions…' : 'Get instructions'}
		</button>
	{:else}
		<div class="mt-4 space-y-2 text-sm">
			{#if instructions.method === 'META'}
				<p class="text-dim">
					Add this tag inside your page’s <code class="mono">&lt;head&gt;</code>:
				</p>
				<pre
					class="mono overflow-x-auto rounded-field bg-bg p-3 text-xs text-text">{instructions.metaTag}</pre>
			{:else if instructions.method === 'FILE'}
				<p class="text-dim">
					Create a file named <code class="mono text-text">{instructions.fileName}</code> with this content:
				</p>
				<pre
					class="mono overflow-x-auto rounded-field bg-bg p-3 text-xs text-text">{instructions.fileContent}</pre>
				<p class="text-dim">
					It should be reachable at
					<code class="mono text-text break-all">{instructions.fileUrl}</code>.
				</p>
			{:else}
				<p class="text-dim">Add a <strong>TXT</strong> record to your domain with this value:</p>
				<pre
					class="mono overflow-x-auto rounded-field bg-bg p-3 text-xs text-text">{instructions.dnsValue}</pre>
				<p class="text-faint text-xs">DNS changes can take a little while to take effect.</p>
			{/if}

			<div class="flex flex-wrap items-center gap-3 pt-2">
				<button onclick={verify} disabled={busy} class="btn btn-primary text-sm">
					{busy ? 'Checking…' : 'I’ve added it — Verify'}
				</button>
				<button onclick={getInstructions} disabled={busy} class="btn text-sm">
					Show instructions again
				</button>
			</div>
		</div>
	{/if}

	{#if result}
		<p class="mt-3 text-sm {result.ok ? 'text-good' : 'text-bad'}">{result.message}</p>
	{/if}
</div>
