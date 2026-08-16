<script lang="ts">
  interface Props {
    id: string;
    label: string;
    checked?: boolean;
    radio?: boolean;
    name?: string;
    showState?: boolean;
    onchange?: (checked: boolean) => void;
  }

  let {
    id,
    label,
    checked = false,
    radio = false,
    name = '',
    showState = false,
    onchange = () => {}
  }: Props = $props();
</script>

<div class="setting-option">
  <input
    {id}
    class="form-check-input"
    type={radio ? 'radio' : 'checkbox'}
    {name}
    {checked}
    onchange={(event) => onchange(event.currentTarget.checked)}
  />
  <label class={{ checked }} for={id}>
    {label}{#if showState}
      <span>{checked ? 'on' : 'off'}</span>{/if}
  </label>
</div>

<style>
  .setting-option {
    height: 24px;
    display: flex;
    align-items: flex-start;
  }

  input {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    margin: 4px 8px 0 0;
    border-color: var(--light-gray);
    background-color: var(--light-gray);
  }

  input:checked {
    border-color: var(--checkbox-bg-color);
    background-color: var(--checkbox-bg-color);
  }

  label {
    display: inline-block;
    margin: 0;
    font-size: 16px;
    font-weight: 300;
    line-height: 24px;
  }

  label.checked {
    font-weight: 700;
  }
</style>
