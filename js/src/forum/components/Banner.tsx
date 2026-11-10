import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import LinkButton from 'flarum/common/components/LinkButton';
import { celebration, petState, t } from '../utils/store';

const KEY = 'forumPet.banner';
let gone: string | null = null;

function dismissed(key: string): boolean {
  if (gone === key) return true;
  try {
    return localStorage.getItem(KEY) === key;
  } catch {
    return false;
  }
}

/** Evolution day, or a post-count milestone: a banner on the discussion list for the day. */
export default class Banner extends Component {
  view() {
    const s = petState();
    const c = celebration(s);
    if (!c || dismissed(c.key)) return null;

    return (
      <div className="PetBanner" role="status">
        <div className="container PetBanner-inner">
          <span className="PetBanner-icon" aria-hidden="true">
            <i className="fas fa-champagne-glasses" />
          </span>
          <span className="PetBanner-text">{c.text}</span>
          <LinkButton className="Button Button--primary PetBanner-go" href={app.route('forumPet')}>
            {t('banner.visit', { pet: s.name })}
          </LinkButton>
          <Button
            className="Button Button--icon Button--link PetBanner-close"
            icon="fas fa-times"
            aria-label={t('banner.dismiss')}
            onclick={() => {
              gone = c.key;
              try {
                localStorage.setItem(KEY, c.key);
              } catch {
                // Private mode: it stays for this page view.
              }
            }}
          />
        </div>
      </div>
    );
  }
}
