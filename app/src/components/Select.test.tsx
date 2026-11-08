import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select, SelectField } from './ui';

function Demo({ onPick }: { onPick?: (v: string) => void }) {
  const [v, setV] = useState('b');
  return (
    <SelectField label="Fruit" value={v} onChange={(e) => { setV(e.target.value); onPick?.(e.target.value); }}>
      <option value="a">Apple</option>
      <option value="b">Banana</option>
      <option value="c" disabled>Cherry</option>
      <optgroup label="More"><option value="d">Date</option><option value="e">Elder</option></optgroup>
    </SelectField>
  );
}
const trigger = () => screen.getByRole('combobox', { name: /Fruit/ });

describe('custom Select', () => {
  it('shows the current value and keeps the native select API', async () => {
    const onPick = vi.fn();
    render(<Demo onPick={onPick} />);
    expect(trigger()).toHaveTextContent('Banana');
    await userEvent.selectOptions(screen.getByLabelText('Fruit'), 'a');
    expect(onPick).toHaveBeenCalledWith('a');
    expect(trigger()).toHaveTextContent('Apple');
  });

  it('opens with Enter, moves with arrows (skipping disabled), selects with Enter and closes', async () => {
    const u = userEvent.setup();
    render(<Demo />);
    trigger().focus();
    await u.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    await u.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Date' })).toHaveAttribute('data-active', 'true');
    await u.keyboard('{Enter}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger()).toHaveTextContent('Date');
    expect(trigger()).toHaveFocus();
  });

  it('Home / End jump to the first and last option; Esc closes without changing', async () => {
    const u = userEvent.setup();
    render(<Demo />);
    trigger().focus();
    await u.keyboard('{ArrowDown}{Home}{Enter}');
    expect(trigger()).toHaveTextContent('Apple');
    await u.keyboard('{End}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger()).toHaveTextContent('Apple');
    await u.keyboard('{End}{Enter}');
    expect(trigger()).toHaveTextContent('Elder');
  });

  it('type-ahead jumps to a matching option', async () => {
    const u = userEvent.setup();
    render(<Demo />);
    trigger().focus();
    await u.keyboard('{ArrowDown}e');
    expect(screen.getByRole('option', { name: 'Elder' })).toHaveAttribute('data-active', 'true');
    await u.keyboard(' ');
    expect(trigger()).toHaveTextContent('Elder');
  });

  it('marks the selected row, closes on outside click and on Tab', async () => {
    const u = userEvent.setup();
    render(<div><Demo /><button type="button">outside</button></div>);
    await u.click(trigger());
    expect(screen.getByRole('option', { name: 'Banana' })).toHaveAttribute('aria-selected', 'true');
    await u.click(screen.getByText('outside'));
    expect(screen.queryByRole('listbox')).toBeNull();
    await u.click(trigger());
    await u.keyboard('{Tab}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('picks with the mouse and ignores disabled options', async () => {
    const u = userEvent.setup();
    render(<Demo />);
    await u.click(trigger());
    await u.click(screen.getByRole('option', { name: 'Cherry' }));
    expect(trigger()).toHaveTextContent('Banana');
    await u.click(screen.getByRole('option', { name: 'Date' }));
    expect(trigger()).toHaveTextContent('Date');
  });

  it('a bare Select with aria-label gets an accessible trigger name', () => {
    render(<Select aria-label="Metric" defaultValue="x"><option value="x">Minutes</option></Select>);
    expect(screen.getByRole('combobox', { name: /Metric/ })).toHaveTextContent('Minutes');
  });
});
