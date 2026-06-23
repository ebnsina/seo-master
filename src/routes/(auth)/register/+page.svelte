<script lang="ts">
	import { resolve } from '$app/paths';
	import { register } from '../auth.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Create your account · SEOMaster</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
	<div class="card p-8">
		<span class="pill mb-4">SEOMaster</span>
		<h1 class="text-2xl text-text">Create your account</h1>
		<p class="mt-1 text-sm text-dim">No SEO experience needed — we'll guide you step by step.</p>

		<form {...register} class="mt-6 space-y-4">
			<input {...register.fields.redirectTo.as('hidden', data.redirectTo)} />

			<label class="block">
				<span class="text-sm font-medium text-text">Your name</span>
				<input
					{...register.fields.name.as('text')}
					autocomplete="name"
					placeholder="Jane Doe"
					class="field mt-1"
				/>
				{#each register.fields.name.issues() as issue (issue.message)}
					<span class="mt-1 block text-sm text-bad">{issue.message}</span>
				{/each}
			</label>

			<label class="block">
				<span class="text-sm font-medium text-text">Email</span>
				<input
					{...register.fields.email.as('email')}
					autocomplete="email"
					placeholder="you@example.com"
					class="field mt-1"
				/>
				{#each register.fields.email.issues() as issue (issue.message)}
					<span class="mt-1 block text-sm text-bad">{issue.message}</span>
				{/each}
			</label>

			<label class="block">
				<span class="text-sm font-medium text-text">Password</span>
				<input
					{...register.fields._password.as('password')}
					autocomplete="new-password"
					placeholder="At least 8 characters"
					class="field mt-1"
				/>
				{#each register.fields._password.issues() as issue (issue.message)}
					<span class="mt-1 block text-sm text-bad">{issue.message}</span>
				{/each}
			</label>

			<button disabled={register.pending > 0} class="btn btn-primary w-full">
				{register.pending > 0 ? 'Creating account…' : 'Create account'}
			</button>
		</form>

		<p class="mt-6 text-center text-sm text-dim">
			Already have an account?
			<a href={resolve('/login')} class="font-medium text-accent hover:underline">Sign in</a>
		</p>
	</div>
</div>
