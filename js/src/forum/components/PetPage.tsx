import app from 'flarum/forum/app';
import Page from 'flarum/common/components/Page';
import Link from 'flarum/common/components/Link';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import humanTime from 'flarum/common/helpers/humanTime';
import classList from 'flarum/common/utils/classList';
import extractText from 'flarum/common/utils/extractText';
import type Mithril from 'mithril';
import { petArt } from '../../common/art';
import { PageStructure, IndexSidebar } from '../pet';
import { petState, setPetState, t, ui, STAGES } from '../utils/store';
import { careButtons, face, growth, kinds, meter, moodLine, profile, scene } from './parts';

/**
 * /pet: the pet up close. Its scene and needs, Feed and Play, how it grows,
 * who looked after it today and who has looked after it most.
 */
export default class PetPage extends Page {
  data: any = null;
  error = false;
  lastFlash: any = null;

  oninit(vnode: Mithril.Vnode<any, this>) {
    super.oninit(vnode);
    app.setTitle(extractText(t('page.title', { pet: petState()?.name || '' })));
    app.setTitleCount(0);
    this.load();
  }

  load() {
    app
      .request<any>({ method: 'GET', url: `${app.forum.attribute('apiUrl')}/forum-pet` })
      .then((data) => {
        this.data = data;
        setPetState(data);
      })
      .catch(() => (this.error = true))
      .finally(() => m.redraw());
  }

  view() {
    return (
      <PageStructure className="PetPage" sidebar={() => <IndexSidebar />}>
        {this.body()}
      </PageStructure>
    );
  }

  body(): Mithril.Children {
    if (!this.data) return this.error ? <p className="PetEmpty">{t('page.load_error')}</p> : <LoadingIndicator />;

    // A feed or a play changes the streak and the board: fetch them again once it lands.
    if (ui.flash && ui.flash !== this.lastFlash) {
      this.lastFlash = ui.flash;
      if (!ui.flash.already) this.load();
    }

    const s = { ...this.data, ...petState(), top: this.data.top, everyone: this.data.everyone, streak: this.data.streak };

    return (
      <div className="PetHome">
        <section className="PetHero">
          {scene(s, { big: true, say: moodLine(s) })}
          <div className="PetHero-side">
            <p className="PetHero-kicker">{t('page.kicker')}</p>
            <h1 className="PetHero-name">{s.name}</h1>
            <p className="PetHero-meta">
              <span className={`PetChip PetChip--${STAGES[s.stage]}`}>{t(`stage.${STAGES[s.stage]}`)}</span>
              <span className="PetHero-age">{t('page.born', { time: humanTime(s.bornAt) })}</span>
            </p>
            {careButtons(s, true)}
            {this.status(s)}
            <div className="PetMeters">
              {meter('energy', s.energy, t(`meter.energy_${s.energy >= 70 ? 'high' : s.energy >= 25 ? 'mid' : 'low'}`))}
              {meter('fullness', s.fullness, t('meter.fed', { count: s.feeds }))}
              {meter('fun', s.fun, t('meter.played', { count: s.plays }))}
            </div>
          </div>
        </section>

        {this.journey(s)}

        <div className="PetColumns">
          <section className="PetSection">
            <h2 className="PetSection-title">
              <i className="fas fa-heart" aria-hidden="true" /> {t('page.today', { count: s.caretakers })}
            </h2>
            {s.list.length ? (
              <ul className="PetPeople">
                {s.list.map((p: any) => (
                  <li className="PetPeople-one">
                    <Link className="PetPeople-link" href={profile(p)}>
                      {face(p)}
                      <span className="PetPeople-name">{p.name}</span>
                    </Link>
                    {kinds(p)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="PetEmpty">{t('carers.none', { pet: s.name })}</p>
            )}
            {s.caretakers > s.list.length ? <p className="PetMore">{t('page.and_more', { count: s.caretakers - s.list.length })}</p> : null}
          </section>

          <section className="PetSection">
            <h2 className="PetSection-title">
              <i className="fas fa-medal" aria-hidden="true" /> {t('page.devoted')}
            </h2>
            {s.top.length ? (
              <ol className="PetBoard">
                {s.top.map((p: any, i: number) => (
                  <li className={classList('PetBoard-one', i < 3 && `PetBoard-one--${i + 1}`)}>
                    <span className="PetBoard-rank">{i + 1}</span>
                    <Link className="PetPeople-link" href={profile(p)}>
                      {face(p)}
                      <span className="PetPeople-name">{p.name}</span>
                    </Link>
                    <span className="PetBoard-count">{t('page.care_count', { count: p.count })}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="PetEmpty">{t('page.devoted_none', { pet: s.name })}</p>
            )}
            <p className="PetMore">{t('page.everyone', { count: s.everyone, total: s.careTotal })}</p>
          </section>
        </div>

        {s.milestone ? (
          <p className="PetFootnote">
            <i className="fas fa-trophy" aria-hidden="true" />{' '}
            {s.milestoneAt
              ? t('page.milestone_when', { count: Number(s.milestone).toLocaleString(), time: humanTime(s.milestoneAt) })
              : t('page.milestone', { count: Number(s.milestone).toLocaleString() })}
          </p>
        ) : null}
      </div>
    );
  }

  status(s: any): Mithril.Children {
    if (!s.mine) return app.session.user ? null : <p className="PetStatus">{t('page.guest', { pet: s.name })}</p>;
    const both = s.mine.feed && s.mine.play;
    return (
      <p className="PetStatus">
        {both ? t('page.all_done', { pet: s.name }) : t('page.come_back', { pet: s.name })}
        {s.streak > 1 ? <span className="PetStreak">{t('page.streak', { count: s.streak })}</span> : null}
      </p>
    );
  }

  journey(s: any): Mithril.Children {
    const g = growth(s);
    const steps: number[] = s.growth;

    return (
      <section className="PetSection PetJourney">
        <h2 className="PetSection-title">
          <i className="fas fa-seedling" aria-hidden="true" /> {t('page.journey')}
        </h2>
        <ol className="PetJourney-steps">
          {STAGES.map((name, stage) => {
            const reached = s.stage >= stage;
            const date = stage === 0 ? s.bornAt : s.stageDates?.[stage];
            return (
              <li className={classList('PetJourney-step', reached && 'is-reached', s.stage === stage && 'is-current')}>
                <div className="PetJourney-art">
                  {petArt({ species: s.species, skin: s.skin, stage, mood: reached ? 'idle' : 'sleepy', art: s.art })}
                  {reached ? null : (
                    <span className="PetJourney-lock">
                      <i className="fas fa-lock" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <span className="PetJourney-name">{t(`stage.${name}`)}</span>
                <span className="PetJourney-when">
                  {reached && date
                    ? humanTime(date)
                    : stage === s.stage + 1
                      ? t('page.to_go', { count: Math.max(0, g.need - s.careTotal) })
                      : t('page.needs', { count: steps[stage - 1] })}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }
}
