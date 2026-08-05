import { describe, it, expect, vi } from 'vitest';
import { привязатьСвайп } from '../../src/ui/swipe';

describe('привязатьСвайп', () => {
  it('свайп вправо включает glitch', () => {
    const el = document.createElement('div');
    const cb = vi.fn();
    const отписка = привязатьСвайп(el, cb);

    el.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 50 }));
    el.dispatchEvent(new MouseEvent('mouseup', { clientX: 120, clientY: 52 }));

    expect(cb).toHaveBeenCalledWith('glitch');
    отписка();
  });

  it('свайп влево включает ascii', () => {
    const el = document.createElement('div');
    const cb = vi.fn();
    привязатьСвайп(el, cb);

    el.dispatchEvent(new MouseEvent('mousedown', { clientX: 200, clientY: 40 }));
    el.dispatchEvent(new MouseEvent('mouseup', { clientX: 40, clientY: 42 }));

    expect(cb).toHaveBeenCalledWith('ascii');
  });

  it('короткий жест игнорируется', () => {
    const el = document.createElement('div');
    const cb = vi.fn();
    привязатьСвайп(el, cb);

    el.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50 }));
    el.dispatchEvent(new MouseEvent('mouseup', { clientX: 60, clientY: 50 }));

    expect(cb).not.toHaveBeenCalled();
  });
});
