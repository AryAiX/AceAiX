import { common } from './common';
import { language } from './language';
import { auth } from './auth';
import { onboarding } from './onboarding';
import { feed } from './feed';
import { profile } from './profile';
import { score } from './score';
import { challenges } from './challenges';
import { teams } from './teams';
import { views } from './views';
import { progress } from './progress';
import { discover } from './discover';
import { opportunities } from './opportunities';
import { messaging } from './messaging';
import { settings } from './settings';
import { safety } from './safety';
import { sports } from './sports';
import { errors } from './errors';
import { format } from './format';
import { countries } from './countries';

/**
 * English — the source of truth.
 *
 * Every other language is typed as `Translations`, so a key that exists here
 * and nowhere else is a compile error, not a blank label in production.
 */
export const en = {
  common,
  language,
  auth,
  onboarding,
  feed,
  profile,
  score,
  challenges,
  teams,
  views,
  progress,
  discover,
  opportunities,
  messaging,
  settings,
  safety,
  sports,
  errors,
  format,
  countries,
};

export type Translations = typeof en;
