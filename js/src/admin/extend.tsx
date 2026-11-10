import app from 'flarum/admin/app';
import Extend from 'flarum/common/extenders';
import { ArtSettings, GrowthSettings, LookPicker } from './settings';

const t = (key: string) => app.translator.trans(`ernestdefoe-forum-pet.admin.${key}`, {}, true);
const setting = (key: string) => `ernestdefoe-forum-pet.${key}`;

export default [
  new Extend.Admin()
    .setting(() => ({ setting: setting('name'), type: 'text', label: t('settings.name'), help: t('settings.name_help'), maxlength: 40 }), 100)
    .customSetting(function (this: any) {
      return <LookPicker page={this} />;
    }, 90)
    .customSetting(function (this: any) {
      return <GrowthSettings page={this} />;
    }, 80)
    .setting(
      () => ({ setting: setting('timezone'), type: 'text', label: t('settings.timezone'), help: t('settings.timezone_help'), placeholder: 'UTC' }),
      70
    )
    .setting(() => ({ setting: setting('sidebar'), type: 'boolean', label: t('settings.sidebar') }), 60)
    .setting(() => ({ setting: setting('corner'), type: 'boolean', label: t('settings.corner'), help: t('settings.corner_help') }), 50)
    .setting(() => ({ setting: setting('nav'), type: 'boolean', label: t('settings.nav') }), 40)
    .customSetting(() => <ArtSettings />, 30)
    .permission(() => ({ permission: 'forumPet.view', icon: 'fas fa-paw', label: t('permissions.view'), allowGuest: true }), 'view', 60)
    .permission(() => ({ permission: 'forumPet.care', icon: 'fas fa-cookie-bite', label: t('permissions.care') }), 'reply', 60),
];
