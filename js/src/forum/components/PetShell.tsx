import Component from 'flarum/common/Component';
import type Mithril from 'mithril';
import { ui } from '../utils/store';

let chunk: any = null;

export const petChunk = () => chunk;
let loading: Promise<void> | null = null;

/** The art and the card's insides: fetched once, after the page is drawn. */
export function loadPet(): Promise<void> {
  loading ??= import('../pet').then((pet) => {
    chunk = pet;
    m.redraw();
  });
  return loading;
}

function whenIdle(fn: () => void): void {
  if ('requestIdleCallback' in window) (window as any).requestIdleCallback(fn, { timeout: 1500 });
  else window.setTimeout(fn, 200);
}

/**
 * Where the pet's card goes (the sidebar, the corner's pop-up): a quiet
 * placeholder of the same size until the chunk arrives, so nothing jumps.
 */
export default class PetShell extends Component<{ variant: 'sidebar' | 'corner' }> {
  oncreate(vnode: Mithril.VnodeDOM<any, this>) {
    super.oncreate(vnode);
    if (this.attrs.variant === 'sidebar') ui.sidebar = true;
    whenIdle(loadPet);
  }

  onremove(vnode: Mithril.VnodeDOM<any, this>) {
    super.onremove(vnode);
    if (this.attrs.variant === 'sidebar') ui.sidebar = false;
  }

  view() {
    if (chunk) return chunk.panel(this.attrs.variant);
    return (
      <div className={`PetCard PetCard--${this.attrs.variant} PetCard--loading`} aria-busy="true">
        <div className="PetCard-stage PetScene" />
      </div>
    );
  }
}
