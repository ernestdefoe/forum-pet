import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import classList from 'flarum/common/utils/classList';
import type Mithril from 'mithril';
import { petState, t, ui } from '../utils/store';
import PetShell, { loadPet, petChunk } from './PetShell';

const PHONE = '(max-width: 767.98px)';

/** Whether the sidebar card is on the page and actually showing (phones and some themes hide it). */
function sidebarCardShowing(): boolean {
  const card = document.querySelector('.item-forumPetCard');
  return !!card && card.getBoundingClientRect().width > 0;
}

/** Transient things that may cover the corner for a moment: never stand on them. */
const PASSING = '.AlertManager, .CookieBanner, [class*="cookie" i], [class*="Cookie"]';

function fixedAncestor(el: Element | null): Element | null {
  for (; el && el !== document.body; el = el.parentElement) {
    if (getComputedStyle(el).position === 'fixed') return el;
  }
  return null;
}

/**
 * How high the pet must stand to clear whatever fixed sits in its corner:
 * a bottom tab bar, another extension's button. Checks the spot, steps
 * above what it finds, and checks again (a button on a tab bar).
 */
function lift(root: Element, button: Element): number {
  const box = button.getBoundingClientRect();
  const base = window.innerHeight - box.bottom;
  let bottom = base;
  for (let i = 0; i < 4; i++) {
    const x = box.left + box.width / 2;
    const ys = [window.innerHeight - bottom - box.height / 2, window.innerHeight - bottom - 4, window.innerHeight - bottom - box.height + 4];
    let top = Infinity;
    for (const y of ys) {
      for (const hit of document.elementsFromPoint(x, y)) {
        if (root.contains(hit)) continue;
        const fixed = fixedAncestor(hit);
        if (fixed && !fixed.matches(PASSING) && !root.contains(fixed)) top = Math.min(top, fixed.getBoundingClientRect().top);
      }
    }
    if (top === Infinity) break;
    bottom = window.innerHeight - top + 8;
  }
  return bottom > base ? bottom : 0;
}

/**
 * A small pet in the bottom-left corner that opens its card, wherever the
 * sidebar card isn't showing: phones, pages without the sidebar, themes
 * that hide it. It steps aside for the composer and on the pet's own page.
 */
export default class Corner extends Component {
  open = false;
  query = window.matchMedia(PHONE);
  lifted = 0;
  measuredFor = '';
  redraw = () => {
    this.measuredFor = '';
    m.redraw();
  };
  closeOnEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) {
      this.open = false;
      m.redraw();
    }
  };

  oncreate(vnode: Mithril.VnodeDOM<any, this>) {
    super.oncreate(vnode);
    this.query.addEventListener?.('change', this.redraw);
    document.addEventListener('keydown', this.closeOnEscape);
    window.addEventListener('resize', this.redraw);
    this.measure(vnode.dom);
    if ('requestIdleCallback' in window) (window as any).requestIdleCallback(() => loadPet(), { timeout: 2500 });
    else window.setTimeout(() => loadPet(), 400);
  }

  onupdate(vnode: Mithril.VnodeDOM<any, this>) {
    super.onupdate(vnode);
    this.measure(vnode.dom);
  }

  /** Once per page and size, after the page's own fixed bits have had a moment to appear. */
  measure(dom: Element | null) {
    const key = `${window.location.pathname}|${window.innerWidth}x${window.innerHeight}`;
    if (!dom || this.measuredFor === key) return;
    this.measuredFor = key;
    window.setTimeout(() => {
      const button = dom.querySelector('.PetCorner-button');
      if (!button || !dom.isConnected) return;
      dom.classList.remove('PetCorner--lifted');
      const lifted = lift(dom, button);
      if (lifted) dom.classList.add('PetCorner--lifted');
      if (lifted !== this.lifted) {
        this.lifted = lifted;
        m.redraw();
      }
    }, 600);
  }

  onremove(vnode: Mithril.VnodeDOM<any, this>) {
    super.onremove(vnode);
    this.query.removeEventListener?.('change', this.redraw);
    window.removeEventListener('resize', this.redraw);
    document.removeEventListener('keydown', this.closeOnEscape);
  }

  view() {
    const s = petState();
    if (!s) return null;

    // The app's root redraws before this one, so the sidebar is already drawn.
    const hidden = (ui.sidebar && sidebarCardShowing()) || app.composer.position !== 'hidden' || app.current.get('routeName') === 'forumPet';

    if (hidden) {
      this.open = false;
      return null;
    }

    const chunk = petChunk();
    const waiting = s.mine && (!s.mine.feed || !s.mine.play);

    return (
      <div
        className={classList('PetCorner', this.open && 'PetCorner--open', this.lifted && 'PetCorner--lifted')}
        style={this.lifted ? { '--pet-lift': `${this.lifted}px` } : undefined}
      >
        {this.open ? (
          <div className="PetCorner-pop" role="dialog" aria-label={s.name}>
            <Button
              className="Button Button--icon Button--link PetCorner-close"
              icon="fas fa-times"
              aria-label={t('corner.close')}
              onclick={() => (this.open = false)}
            />
            <PetShell variant="corner" />
          </div>
        ) : null}
        <button
          type="button"
          className="PetCorner-button"
          aria-expanded={this.open ? 'true' : 'false'}
          aria-label={t('corner.open', { pet: s.name })}
          onclick={() => {
            this.open = !this.open;
            loadPet();
          }}
        >
          {chunk ? chunk.mini() : <i className="fas fa-paw" aria-hidden="true" />}
          {waiting && !this.open ? <span className="PetCorner-dot" aria-hidden="true" /> : null}
        </button>
      </div>
    );
  }
}
