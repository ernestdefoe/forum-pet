import app from 'flarum/forum/app';
import Link from 'flarum/common/components/Link';
import type Mithril from 'mithril';
import { petArt } from '../common/art';
import { petState, t, STAGES } from './utils/store';
import { careButtons, face, growthBar, moodLine, profile, scene } from './components/parts';

/*
 * The lazy chunk: the art, the card's insides and the page. forum.js asks
 * for it once the browser is idle after the page is drawn.
 */

export let PageStructure: any;
export let IndexSidebar: any;

export async function loadCore(): Promise<void> {
  if (PageStructure) return;
  const [structure, sidebar] = await Promise.all([
    flarum.reg.asyncModuleImport('flarum/forum/components/PageStructure'),
    flarum.reg.asyncModuleImport('flarum/forum/components/IndexSidebar'),
  ]);
  PageStructure = structure.default || structure;
  IndexSidebar = sidebar.default || sidebar;
}

export { default as PetPage } from './components/PetPage';

/** The card in the sidebar and in the corner's pop-up. */
export function panel(variant: 'sidebar' | 'corner'): Mithril.Children {
  const s = petState();
  if (!s) return null;
  const shown = (s.list || []).slice(0, 6);
  const more = Math.max(0, s.caretakers - shown.length);

  return (
    <div className={`PetCard PetCard--${variant}`}>
      {scene(s, { href: app.route('forumPet') })}
      <div className="PetCard-body">
        <div className="PetCard-head">
          <Link className="PetCard-name" href={app.route('forumPet')}>
            {s.name}
          </Link>
          <span className={`PetChip PetChip--${STAGES[s.stage]}`}>{t(`stage.${STAGES[s.stage]}`)}</span>
        </div>
        <p className="PetCard-mood">{moodLine(s)}</p>
        {growthBar(s)}
        {careButtons(s)}
        {s.caretakers ? (
          <div className="PetCard-carers">
            <span className="PetFaces">
              {shown.map((p: any) => (
                <Link href={profile(p)} title={p.name} className="PetFaces-one">
                  {face(p)}
                </Link>
              ))}
              {more ? <span className="PetFaces-more">+{more}</span> : null}
            </span>
            <span className="PetCard-carersText">{t('carers.today', { count: s.caretakers })}</span>
          </div>
        ) : (
          <p className="PetCard-carersText PetCard-carersText--none">{t('carers.none', { pet: s.name })}</p>
        )}
      </div>
    </div>
  );
}

/** The corner button's little pet. */
export function mini(): Mithril.Children {
  const s = petState();
  if (!s) return null;
  return petArt({ species: s.species, skin: s.skin, stage: s.stage, mood: s.mood, hat: s.hat, art: s.art });
}
