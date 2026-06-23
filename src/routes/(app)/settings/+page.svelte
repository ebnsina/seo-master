<script lang="ts">
	import Mail from '@lucide/svelte/icons/mail';
	import { getSettings, setWeeklyReport } from './settings.remote';

	const settings = $derived(getSettings());
	let saving = $state(false);

	async function toggle(enabled: boolean) {
		saving = true;
		try {
			await setWeeklyReport(enabled);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Settings · SEOMaster</title></svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<h1 class="text-2xl text-text">Settings</h1>
		<p class="mt-1 text-dim">Manage how SEOMaster keeps you informed.</p>
	</div>

	{#if !settings.ready}
		<div class="card p-6 text-dim">Loading…</div>
	{:else}
		{@const s = settings.current}
		<div class="card p-6">
			<div class="flex items-start gap-4">
				<span
					class="bg-accent-soft text-accent inline-flex size-10 shrink-0 items-center justify-center rounded-field"
				>
					<Mail size={20} />
				</span>
				<div class="min-w-0 flex-1">
					<h2 class="text-lg text-text">Weekly SEO summary</h2>
					<p class="mt-1 text-sm text-dim">
						Get a Monday email with each website’s health score and outstanding issues — sent to
						<span class="text-text">{s.email}</span>.
					</p>

					{#if !s.emailConfigured}
						<div class="note note-warn mt-3 p-3 text-sm text-dim">
							Email isn’t set up on this server yet, so reports can’t be sent. Ask your
							administrator to configure SMTP.
						</div>
					{/if}

					<label class="mt-4 flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							checked={s.weeklyReport}
							disabled={saving || !s.emailConfigured}
							onchange={(e) => toggle(e.currentTarget.checked)}
							class="size-4 accent-[var(--accent)]"
						/>
						<span class="text-sm font-medium text-text">
							{s.weeklyReport ? 'Weekly reports are on' : 'Send me weekly reports'}
						</span>
					</label>
				</div>
			</div>
		</div>
	{/if}
</div>
