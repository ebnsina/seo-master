<script lang="ts">
	import { resolve } from '$app/paths';
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<header class="border-line sticky top-0 z-30 border-b bg-bg/80 backdrop-blur">
		<div class="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
			<a href={resolve('/')} class="font-display text-xl font-semibold text-text">
				SEO<span class="text-accent">Master</span>
			</a>
			<nav class="ml-auto flex items-center gap-2 sm:gap-4">
				<a
					href={resolve('/pricing')}
					class="hidden px-2 text-sm text-dim hover:text-accent sm:block"
				>
					Pricing
				</a>
				<a href={resolve('/about')} class="hidden px-2 text-sm text-dim hover:text-accent sm:block">
					About
				</a>
				<a href={resolve('/login')} class="px-2 text-sm text-dim hover:text-accent">Log in</a>
				<a href={resolve('/register')} class="btn btn-primary px-4 py-2 text-sm">Get started</a>
			</nav>
		</div>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="border-line border-t">
		<div
			class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-dim sm:flex-row"
		>
			<span class="font-display font-semibold text-text"
				>SEO<span class="text-accent">Master</span></span
			>
			<nav class="flex flex-wrap justify-center gap-5">
				<a href={resolve('/pricing')} class="hover:text-accent">Pricing</a>
				<a href={resolve('/about')} class="hover:text-accent">About</a>
				<a href={resolve('/contact')} class="hover:text-accent">Contact</a>
				<a href={resolve('/login')} class="hover:text-accent">Log in</a>
			</nav>
			<span class="text-faint">© SEOMaster</span>
		</div>
	</footer>
</div>
