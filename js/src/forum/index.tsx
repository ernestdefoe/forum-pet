import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import type ItemList from 'flarum/common/utils/ItemList';
import LinkButton from 'flarum/common/components/LinkButton';
import type Mithril from 'mithril';
import { petState } from './utils/store';
import PetShell from './components/PetShell';
import Corner from './components/Corner';
import Banner from './components/Banner';

/*
 * forum.js is loaded on every page, so it only wires things up: the /pet
 * route, the nav link, the sidebar card, the corner widget and the
 * celebration banner. The art, the card's insides and the page are one
 * chunk (pet), fetched once the browser is idle after the page is drawn.
 */

app.initializers.add('ernestdefoe/forum-pet', () => {
  app.routes['forumPet'] = { path: '/pet', component: () => import('./pet').then(async (pet) => (await pet.loadCore(), { default: pet.PetPage })) };

  // String form: IndexSidebar is in a lazy chunk, and extending an imported copy patches one core never renders.
  extend('flarum/forum/components/IndexSidebar', 'navItems', function (items: ItemList<Mithril.Children>) {
    const s = petState();
    if (!s || !app.forum.attribute('forumPetNav')) return;
    items.add('forumPet', LinkButton.component({ href: app.route('forumPet'), icon: 'fas fa-paw' }, s.name), 78);
  });

  extend('flarum/forum/components/IndexSidebar', 'items', function (items: ItemList<Mithril.Children>) {
    // Not on the pet's own page: the pet is right there.
    if (!petState() || !app.forum.attribute('forumPetSidebar') || app.current.get('routeName') === 'forumPet') return;
    items.add('forumPetCard', <PetShell variant="sidebar" />, -100);
  });

  override('flarum/forum/components/IndexPage', 'hero', function (original: () => Mithril.Children) {
    return [original(), <Banner />];
  });

  // The corner widget lives outside the page. Initializers run before the forum's data is
  // loaded and the app mounted (in the same task), so it is mounted just after.
  window.setTimeout(() => {
    if (!app.forum || !petState() || !app.forum.attribute('forumPetCorner')) return;
    const root = document.createElement('div');
    root.className = 'PetCorner-root';
    document.body.appendChild(root);
    m.mount(root, { view: () => <Corner /> });
  });
});
