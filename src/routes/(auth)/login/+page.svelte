<script lang="ts">
	import { resolve } from '$app/paths';
	import { login } from '../auth.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Sign in · SEOMaster</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
	<div class="card p-8">
		<span class="pill mb-4">SEOMaster</span>
		<h1 class="text-2xl text-text">Welcome back</h1>
		<p class="mt-1 text-sm text-dim">Sign in to keep climbing the rankings.</p>

		<form {...login} class="mt-6 space-y-4">
			<input {...login.fields.redirectTo.as('hidden', data.redirectTo)} />

			<label class="block">
				<span class="text-sm font-medium text-text">Email</span>
				<input
					{...login.fields.email.as('email')}
					autocomplete="email"
					placeholder="you@example.com"
					class="field mt-1"
				/>
				{#each login.fields.email.issues() as issue (issue.message)}
					<span class="mt-1 block text-sm text-bad">{issue.message}</span>
				{/each}
			</label>

			<label class="block">
				<span class="text-sm font-medium text-text">Password</span>
				<input
					{...login.fields._password.as('password')}
					autocomplete="current-password"
					class="field mt-1"
				/>
				{#each login.fields._password.issues() as issue (issue.message)}
					<span class="mt-1 block text-sm text-bad">{issue.message}</span>
				{/each}
			</label>

			<button disabled={login.pending > 0} class="btn btn-primary w-full">
				{login.pending > 0 ? 'Signing in…' : 'Sign in'}
			</button>
		</form>

		<p class="mt-6 text-center text-sm text-dim">
			New here?
			<a href={resolve('/register')} class="font-medium text-accent hover:underline">
				Create an account
			</a>
		</p>
	</div>
</div>
