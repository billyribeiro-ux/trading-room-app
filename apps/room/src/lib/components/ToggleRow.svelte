<script lang="ts">
  interface Props {
    label: string;
    checked?: boolean;
    detail?: string;
    onchange?: (checked: boolean) => void;
    radio?: boolean;
    name?: string;
  }

  let {
    label,
    checked = false,
    detail = '',
    onchange = () => {},
    radio = false,
    name = ''
  }: Props = $props();
</script>

<label class="toggle-row">
  <span>
    {label}
    {#if detail}<small>{detail}</small>{/if}
  </span>
  <input
    type={radio ? 'radio' : 'checkbox'}
    {name}
    {checked}
    onchange={(event) => onchange(event.currentTarget.checked)}
  />
  <span class="toggle" aria-hidden="true"></span>
</label>

<style>
  .toggle-row {
    min-height: 43px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin: 0;
    color: var(--modal-content-color);
    cursor: pointer;
  }

  small {
    display: block;
    color: var(--dark-gray);
    font-size: 12px;
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .toggle {
    position: relative;
    flex: 0 0 34px;
    width: 34px;
    height: 18px;
    border-radius: 9px;
    background: var(--light-gray);
    transition: background 120ms linear;
  }

  .toggle::after {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--white);
    content: '';
    transition: transform 120ms linear;
  }

  input:checked + .toggle {
    background: var(--checkbox-bg-color);
  }

  input:checked + .toggle::after {
    transform: translateX(16px);
  }

  input:focus-visible + .toggle {
    outline: 2px solid var(--bs-primary-border-subtle);
    outline-offset: 2px;
  }
</style>
