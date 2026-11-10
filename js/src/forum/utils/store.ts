import app from 'flarum/forum/app';
import type Mithril from 'mithril';

/*
 * The pet as this visitor sees it, shared by the sidebar card, the corner
 * widget, the banner and the page: it arrives with the forum's payload, and
 * is replaced by whatever a feed, a play or the page's own load returns.
 */

export type Kind = 'feed' | 'play';

export interface Flash {
  kind: Kind;
  /** Which of the thank-you lines to say. */
  line: number;
  evolved: number | null;
  already: boolean;
}

export const t = (key: string, params: Record<string, any> = {}): any => app.translator.trans(`ernestdefoe-forum-pet.forum.${key}`, params);

let state: any = undefined;

export function petState(): any {
  if (state === undefined) state = app.forum.attribute('forumPet') || null;
  return state;
}

export function setPetState(next: any): void {
  if (next) state = next;
}

export const ui: { busy: Kind | null; flash: Flash | null; sidebar: boolean } = { busy: null, flash: null, sidebar: false };

let clear = 0;

export const STAGES = ['egg', 'baby', 'adult', 'special'];

/** Feed or play: once a day each, the server decides. */
export function care(kind: Kind, onEvolve?: (stage: number) => void): Promise<void> {
  if (ui.busy) return Promise.resolve();

  if (!app.session.user) {
    app.modal.show(() => flarum.reg.asyncModuleImport('flarum/forum/components/LogInModal'));
    return Promise.resolve();
  }

  ui.busy = kind;
  m.redraw();
  return app
    .request<any>({ method: 'POST', url: `${app.forum.attribute('apiUrl')}/forum-pet/care`, body: { kind } })
    .then((res) => {
      setPetState(res.state);
      ui.flash = { kind, line: Math.floor(Math.random() * 4) + 1, evolved: res.evolved ?? null, already: !res.done };
      window.clearTimeout(clear);
      clear = window.setTimeout(
        () => {
          ui.flash = null;
          m.redraw();
        },
        res.evolved ? 6000 : 3600
      );
      if (res.evolved && onEvolve) onEvolve(res.evolved);
    })
    .catch(() => {})
    .finally(() => {
      ui.busy = null;
      m.redraw();
    });
}

/** The thank-you line for what just happened. */
export function flashLine(flash: Flash, s: any): Mithril.Children {
  const params = { pet: s.name, member: app.session.user?.displayName() || '' };
  if (flash.evolved) return t(`evolved.${STAGES[flash.evolved]}`, params);
  if (flash.already) return t(`already.${flash.kind}`, params);
  return t(`thanks.${s.stage === 0 ? 'egg_' : ''}${flash.kind}.${flash.line}`, params);
}

/** The pet's celebration, if it is having one today: what it is and when it started. */
export function celebration(s: any): { key: string; text: Mithril.Children } | null {
  const c = s?.celebrate;
  if (!c) return null;
  if (c.kind === 'evolved') return { key: `e${c.stage}-${c.at}`, text: t(`banner.${STAGES[c.stage]}`, { pet: s.name }) };
  return { key: `m${c.count}-${c.at}`, text: t('banner.milestone', { pet: s.name, count: Number(c.count).toLocaleString() }) };
}

// So other extensions (and tests) can reach the pet's state through flarum.reg.
export default { petState, setPetState, ui };
