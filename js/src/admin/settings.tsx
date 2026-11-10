import app from 'flarum/admin/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import classList from 'flarum/common/utils/classList';
import type Mithril from 'mithril';
import { petArt, SKINS, SPECIES } from '../common/art';

const t = (key: string, params: Record<string, any> = {}) => app.translator.trans(`ernestdefoe-forum-pet.admin.${key}`, params, true);
const KEY = (k: string) => `ernestdefoe-forum-pet.${k}`;
const STATES = ['idle', 'happy', 'eating', 'sleepy', 'excited', 'celebrating'];

/** Species and skin, picked from live previews. Saved with the page's Save button. */
export class LookPicker extends Component<{ page: any }> {
  view() {
    const species = this.attrs.page.setting(KEY('species'), 'dumpling');
    const skin = this.attrs.page.setting(KEY('skin'), 'peach');
    const current = SPECIES.includes(species()) ? species() : 'dumpling';
    const skins = Object.keys(SKINS[current as keyof typeof SKINS]);
    const currentSkin = skins.includes(skin()) ? skin() : skins[0];

    return (
      <div className="Form-group PetAdmin-look">
        <label>{t('settings.species')}</label>
        <div className="PetAdmin-tiles" role="radiogroup" aria-label={t('settings.species')}>
          {SPECIES.map((name) => (
            <button
              type="button"
              role="radio"
              aria-checked={name === current ? 'true' : 'false'}
              className={classList('PetAdmin-tile', name === current && 'is-active')}
              onclick={() => {
                species(name);
                skin(Object.keys(SKINS[name])[0]);
              }}
            >
              <span className="PetAdmin-art">
                {petArt({
                  species: name,
                  skin: name === current ? currentSkin : Object.keys(SKINS[name])[0],
                  stage: 2,
                  mood: name === current ? 'happy' : 'idle',
                })}
              </span>
              <span className="PetAdmin-tileName">{t(`species.${name}`)}</span>
            </button>
          ))}
        </div>
        <label>{t('settings.skin')}</label>
        <div className="PetAdmin-skins" role="radiogroup" aria-label={t('settings.skin')}>
          {skins.map((name) => (
            <button
              type="button"
              role="radio"
              aria-checked={name === currentSkin ? 'true' : 'false'}
              className={classList('PetAdmin-skin', name === currentSkin && 'is-active')}
              onclick={() => skin(name)}
            >
              <span className="PetAdmin-swatch" style={{ background: (SKINS as any)[current][name][0] }} />
              {t(`skins.${name}`)}
            </button>
          ))}
        </div>
        <p className="helpText">{t('settings.look_help')}</p>
      </div>
    );
  }
}

/** Care needed for each stage: three rising numbers, kept as one setting. */
export class GrowthSettings extends Component<{ page: any }> {
  view() {
    const stored = this.attrs.page.setting(KEY('growth'), '15,75,300');
    const parts = String(stored() || '15,75,300').split(',');
    const set = (i: number, value: string) => {
      const next = [0, 1, 2].map((j) => (j === i ? value.replace(/\D/g, '') : (parts[j] || '').trim()));
      stored(next.join(','));
    };
    const nums = parts.map((p: string) => parseInt(p, 10));
    const valid = nums.length === 3 && nums[0] >= 1 && nums[1] > nums[0] && nums[2] > nums[1];

    return (
      <div className="Form-group PetAdmin-growth">
        <label>{t('settings.growth')}</label>
        <div className="PetAdmin-growthRow">
          {['hatch', 'grow', 'special'].map((name, i) => (
            <label className="PetAdmin-growthField">
              <span>{t(`settings.growth_${name}`)}</span>
              <input
                className="FormControl"
                type="number"
                min="1"
                inputmode="numeric"
                value={parts[i] || ''}
                oninput={(e: InputEvent) => set(i, (e.target as HTMLInputElement).value)}
              />
            </label>
          ))}
        </div>
        <p className={classList('helpText', !valid && 'PetAdmin-invalid')}>{valid ? t('settings.growth_help') : t('settings.growth_invalid')}</p>
        <Button
          className="Button Button--danger PetAdmin-reset"
          icon="fas fa-egg"
          onclick={() => {
            if (!confirm(t('settings.reset_confirm') as string)) return;
            app
              .request({ method: 'POST', url: `${app.forum.attribute('apiUrl')}/forum-pet/reset` })
              .then(() => app.alerts.show({ type: 'success' }, t('settings.reset_done')));
          }}
        >
          {t('settings.reset')}
        </Button>
      </div>
    );
  }
}

/** The admin's own picture for each mood, uploaded at once (not with Save). */
export class ArtSettings extends Component {
  art: Record<string, string> = {};
  busy: string | null = null;

  oninit(vnode: Mithril.Vnode) {
    super.oninit(vnode);
    const art = (app.forum.attribute('forumPet') as any)?.art;
    this.art = art && !Array.isArray(art) ? { ...art } : {};
  }

  refresh() {
    return app.request<any>({ method: 'GET', url: `${app.forum.attribute('apiUrl')}/forum-pet` }).then((s) => {
      this.art = s.art && !Array.isArray(s.art) ? s.art : {};
    });
  }

  upload(state: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/gif,image/webp,image/jpeg';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const body = new FormData();
      body.append('art', file);
      this.busy = state;
      m.redraw();
      app
        .request({
          method: 'POST',
          url: `${app.forum.attribute('apiUrl')}/forum-pet/art/${state}`,
          serialize: (raw: any) => raw,
          body,
          // Say why it was refused (too big, not a picture) instead of an empty error.
          errorHandler: (error: any) => {
            const code = error?.response?.errors?.[0]?.code;
            const known = ['forum_pet_upload_too_big', 'forum_pet_upload_not_image', 'forum_pet_upload_failed'];
            app.alerts.show({ type: 'error' }, t(`errors.${known.includes(code) ? code : 'forum_pet_upload_failed'}`));
            throw error;
          },
        })
        .then(() => this.refresh())
        .catch(() => {})
        .finally(() => {
          this.busy = null;
          m.redraw();
        });
    };
    input.click();
  }

  remove(state: string) {
    this.busy = state;
    app
      .request({ method: 'DELETE', url: `${app.forum.attribute('apiUrl')}/forum-pet/art/${state}` })
      .then(() => this.refresh())
      .catch(() => {})
      .finally(() => {
        this.busy = null;
        m.redraw();
      });
  }

  view() {
    return (
      <div className="Form-group PetAdmin-uploads">
        <label>{t('settings.art')}</label>
        <p className="helpText">{t('settings.art_help')}</p>
        <ul className="PetAdmin-states">
          {STATES.map((state) => (
            <li className="PetAdmin-state">
              <span className="PetAdmin-stateArt">
                {this.art[state] ? <img src={this.art[state]} alt="" /> : <i className="fas fa-image" aria-hidden="true" />}
              </span>
              <span className="PetAdmin-stateName">{t(`states.${state}`)}</span>
              <span className="PetAdmin-stateButtons">
                <Button className="Button Button--small" icon="fas fa-upload" loading={this.busy === state} onclick={() => this.upload(state)}>
                  {t(this.art[state] ? 'settings.art_replace' : 'settings.art_upload')}
                </Button>
                {this.art[state] ? (
                  <Button
                    className="Button Button--small Button--icon"
                    icon="fas fa-trash"
                    aria-label={t('settings.art_remove')}
                    disabled={this.busy === state}
                    onclick={() => this.remove(state)}
                  />
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}
