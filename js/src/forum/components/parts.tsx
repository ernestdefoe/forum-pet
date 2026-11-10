import app from 'flarum/forum/app';
import Button from 'flarum/common/components/Button';
import Link from 'flarum/common/components/Link';
import stringToColor from 'flarum/common/utils/stringToColor';
import classList from 'flarum/common/utils/classList';
import type Mithril from 'mithril';
import { petArt } from '../../common/art';
import { care, flashLine, STAGES, t, ui, type Kind } from '../utils/store';
import { confetti } from '../confetti';

/*
 * Pieces shared by the card and the page. Plain functions, called as
 * functions (a plain function used as a JSX tag renders nothing in Mithril).
 */

/** The pet in its scene, with a speech bubble when it has something to say. */
export function scene(s: any, opts: { big?: boolean; say?: Mithril.Children; href?: string } = {}): Mithril.Children {
  const flash = ui.flash;
  const action = flash && !flash.already && !flash.evolved ? flash.kind : null;
  const mood = flash?.evolved ? 'celebrating' : s.mood;
  const say = flash ? flashLine(flash, s) : opts.say;

  const art = petArt({
    species: s.species,
    skin: s.skin,
    stage: s.stage,
    mood,
    hat: s.hat,
    action,
    art: s.art,
    label: t('art_label', { pet: s.name, stage: t(`stage.${STAGES[s.stage]}`), mood: t(`mood_name.${mood}`) }),
  });

  const inner = [
    say ? (
      <p className="PetBubble" role="status" key={flash ? `f${flash.kind}${flash.line}${flash.evolved}` : 'say'}>
        {say}
      </p>
    ) : null,
    <div className="PetScene-pet" key="pet">
      {art}
    </div>,
  ].filter(Boolean);

  const className = classList('PetScene', `PetScene--${mood}`, opts.big && 'PetScene--big');

  return opts.href ? (
    <Link className={className} href={opts.href} aria-label={t('visit', { pet: s.name })}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

/** What the pet is up to, in a sentence. */
export function moodLine(s: any): Mithril.Children {
  const c = s.celebrate;
  if (c && c.kind === 'milestone') return t('mood.milestone', { pet: s.name, count: Number(c.count).toLocaleString() });
  if (c) return t(`mood.evolved_${STAGES[c.stage]}`, { pet: s.name });
  return t(`mood.${s.stage === 0 ? 'egg_' : ''}${s.mood}`, { pet: s.name });
}

/** Care toward the next stage: done, needed, and the stage it leads to. */
export function growth(s: any): { done: number; need: number; next: string | null; share: number } {
  const steps: number[] = s.growth || [15, 75, 300];
  if (s.stage >= 3) return { done: s.careTotal, need: steps[2], next: null, share: 1 };
  const from = s.stage === 0 ? 0 : steps[s.stage - 1];
  const need = steps[s.stage];
  return { done: s.careTotal, need, next: STAGES[s.stage + 1], share: Math.max(0, Math.min(1, (s.careTotal - from) / Math.max(1, need - from))) };
}

export function growthBar(s: any): Mithril.Children {
  const g = growth(s);
  return (
    <div className="PetGrowth">
      <div className="PetGrowth-label">
        <span>{g.next ? t(`grow.to_${g.next}`, { pet: s.name }) : t('grow.complete', { pet: s.name })}</span>
        {g.next ? <span className="PetGrowth-count">{t('grow.count', { done: g.done, need: g.need })}</span> : null}
      </div>
      <div
        className="PetGrowth-track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(g.share * 100)}
        aria-label={t('grow.aria', { pet: s.name })}
      >
        <span className="PetGrowth-fill" style={{ width: `${Math.round(g.share * 100)}%` }} />
      </div>
    </div>
  );
}

/** Feed and Play. Guests are asked to log in; members who have done both see it ticked. */
export function careButtons(s: any, big = false): Mithril.Children {
  if (!s.canCare && app.session.user) return null;

  const button = (kind: Kind, icon: string) => {
    const done = !!s.mine?.[kind];
    return (
      <Button
        className={classList('Button', 'PetCare', `PetCare--${kind}`, done ? 'PetCare--done' : 'Button--primary', big && 'PetCare--big')}
        icon={done ? 'fas fa-check' : icon}
        disabled={done || (ui.busy !== null && ui.busy !== kind)}
        loading={ui.busy === kind}
        onclick={(e: MouseEvent) => {
          const from = e.currentTarget as Element;
          care(kind, () => confetti(from));
        }}
      >
        {t(done ? `done.${kind}` : `care.${kind}`)}
      </Button>
    );
  };

  return (
    <div className="PetCareRow">
      {button('feed', 'fas fa-cookie-bite')}
      {button('play', 'fas fa-baseball')}
    </div>
  );
}

/** A member's avatar from the plain object the pet's state carries. */
export function face(p: any, size = ''): Mithril.Children {
  return p.avatar ? (
    <img className={classList('Avatar', size)} src={p.avatar} alt="" loading="lazy" />
  ) : (
    <span className={classList('Avatar', size)} style={{ '--avatar-bg': `#${stringToColor(p.name || '?')}` }} aria-hidden="true">
      {(p.name || '?').charAt(0).toUpperCase()}
    </span>
  );
}

export function profile(p: any): string {
  return app.route('user', { username: p.slug });
}

/** Little marks for what a caretaker did today. */
export function kinds(p: any): Mithril.Children {
  return (
    <span className="PetKinds">
      {(p.kinds || []).map((k: string) => (
        <i className={`fas ${k === 'feed' ? 'fa-cookie-bite' : 'fa-baseball'} PetKinds-${k}`} title={t(`did.${k}`)} aria-label={t(`did.${k}`)} />
      ))}
    </span>
  );
}

/** One of the pet's needs, as a labelled bar. */
export function meter(name: 'energy' | 'fullness' | 'fun', value: number, hint: Mithril.Children): Mithril.Children {
  return (
    <div className={`PetMeter PetMeter--${name}`}>
      <div className="PetMeter-head">
        <span className="PetMeter-name">{t(`meter.${name}`)}</span>
        <span className="PetMeter-hint">{hint}</span>
      </div>
      <div className="PetMeter-track" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow={value} aria-label={t(`meter.${name}`)}>
        <span className="PetMeter-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
