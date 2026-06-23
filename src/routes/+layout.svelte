<script lang="ts">
	import '@fontsource-variable/inter-tight/index.css';
	import '@fontsource-variable/sora/index.css';
	import '@fontsource-variable/geist-mono/index.css';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
