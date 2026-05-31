<script lang="ts" generics="TData extends any">
  import { Checkbox } from '$lib/components/ui/checkbox'
  import type { Props } from './props'
  import { isComponent, isComponentConfig, isSnippetConfig } from './utils'
  import { cn } from '$lib/utils'
  import MultipleSelectRoot from '$lib/components/custom/multiple-select/MultipleSelectRoot.svelte'
  import {
    MultipleSelectAll,
    MultipleSelectCheckbox,
  } from '$lib/components/custom/multiple-select'
  import { ThreeCheckbox } from '$lib/components/custom/checkbox'

  const props: Props<TData> = $props()

  // 选择状态
  const selectedMap = $derived(
    new Map(props.selectedRows?.map((row) => [props.getRowId(row), row]))
  )

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      props.selectedRows = [...props.dataSource]
    } else {
      props.selectedRows = []
    }
  }

  function toggleSelect(id: string, row: TData, checked: boolean) {
    if (!props.selectedRows) return
    
    if (checked) {
      if (!selectedMap.has(id)) {
        props.selectedRows = [...props.selectedRows, row]
      }
    } else {
      props.selectedRows = props.selectedRows.filter(
        (r) => props.getRowId(r) !== id
      )
    }
  }

  // 判断行是否被选中
  function isSelected(id: string) {
    return selectedMap.has(id)
  }

  // 全选状态
  const allSelected = $derived(
    props.dataSource.length > 0 && 
    props.dataSource.every((row) => selectedMap.has(props.getRowId(row)))
  )
  
  const someSelected = $derived(
    props.selectedRows && 
    props.selectedRows.length > 0 && 
    !allSelected
  )
</script>

<div class={cn('w-full overflow-auto', props.class)}>
  <table class="w-full caption-bottom text-sm">
    <thead class="[&_tr]:border-b bg-muted/50 sticky top-0">
      <tr>
        {#if props.rowSelection}
          <th class="w-12 px-4 py-3 text-left">
            <ThreeCheckbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={(v) => toggleSelectAll(v as boolean)}
            />
          </th>
        {/if}
        {#each props.columns as column}
          <th class="px-4 py-3 text-left font-medium">{column.title}</th>
        {/each}
      </tr>
    </thead>
    <tbody class="[&_tr:last-child]:border-0">
      {#each props.dataSource as row, index (props.getRowId(row))}
        <tr class="border-b transition-colors hover:bg-muted/50" style="content-visibility: auto; contain-intrinsic-size: auto 53px;">
          {#if props.rowSelection}
            <td class="px-4 py-3">
              <Checkbox
                checked={isSelected(props.getRowId(row))}
                onCheckedChange={(v) => 
                  toggleSelect(props.getRowId(row), row, v as boolean)
                }
              />
            </td>
          {/if}
          {#each props.columns as column}
            <td class="px-4 py-3">
              {#if column.render}
                {@const rendered = column.render(
                  (row as any)[column.dataIndex as string],
                  row,
                  index
                )}
                {#if isComponent(rendered)}
                  {@const Component = rendered.component}
                  <Component {...rendered.props} />
                {:else if isComponentConfig(rendered)}
                  {@const Component = rendered.component}
                  <svelte:component this={Component} {...rendered.props} />
                {:else if isSnippetConfig(rendered)}
                  {@render rendered.snippet(rendered.params)}
                {:else}
                  {rendered}
                {/if}
              {:else}
                {(row as any)[column.dataIndex as string]}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
  
  {#if props.dataSource.length === 0}
    <div class="p-8 text-center text-muted-foreground">
      暂无数据
    </div>
  {/if}
</div>
