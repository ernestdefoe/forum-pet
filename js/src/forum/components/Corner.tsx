import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import classList from 'flarum/common/utils/classList';
import type Mithril from 'mithril';
import { petState, t, ui } from '../utils/store';
import PetShell, { loadPet, petChunk } from './PetShell';

const PHONE = '(max-width: 767.98px)';

/**
 * A small pet in the bottom-left corner that opens its card. By default
 * only on phones, where the sidebar is not shown. It steps aside for the
 * composer, on the pet's own page, and wherever the sidebar card is showing.
 */
export default class Corner extends Component {
  open = false;
  query = window.matchMedia(PHONE);
  redraw = () => m.redraw();
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
    if ('requestIdleCallback' in window) (window as any).requestIdleCallback(() => loadPet(), { timeout: 2500 });
    else window.setTimeout(() => loadPet(), 400);
  }

  onremove(vnode: Mithril.VnodeDOM<any, this>) {
    super.onremove(vnode);
    this.query.removeEventListener?.('change', this.redraw);
    document.removeEventListener('keydown', this.closeOnEscape);
  }

  view() {
    const s = petState();
    if (!s) return null;

    const phone = this.query.matches;
    const hidden =
      (app.forum.attribute('forumPetCorner') === 'phones' && !phone) ||
      (!phone && ui.sidebar) ||
      app.composer.position !== 'hidden' ||
      app.current.get('routeName') === 'forumPet';

    if (hidden) {
      this.open = false;
      return null;
    }

    const chunk = petChunk();
    const waiting = s.mine && (!s.mine.feed || !s.mine.play);

    return (
      <div className={classList('PetCorner', this.open && 'PetCorner--open')}>
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
