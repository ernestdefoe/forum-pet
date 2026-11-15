import Extend from 'flarum/common/extenders';

export default [
  // The page is in the lazy chunk; loadCore() fetches the core pieces it builds on first.
  new Extend.Routes().add('forumPet', '/pet', () => import('./pet').then(async (pet) => (await pet.loadCore(), { default: pet.PetPage }))),
];
