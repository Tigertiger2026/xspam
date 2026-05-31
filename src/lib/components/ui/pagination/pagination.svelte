<script lang="ts">
	import { Pagination as PaginationPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let className: string | undefined = undefined;
	export let count: number = 0;
	export let perPage: number = 10;
	export let page: number = 1;
	export let siblingCount: number = 1;
	export { className as class };

	$: currentPage = page;
</script>

<PaginationPrimitive.Root
	{count}
	{perPage}
	{siblingCount}
	bind:page
	{...$$restProps as any}
>
	{#snippet children({ pages, range })}
		<nav class={cn("mx-auto flex w-full flex-col items-center", className)}>
			<slot {pages} {range} {currentPage} />
		</nav>
	{/snippet}
</PaginationPrimitive.Root>
