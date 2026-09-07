import type { Translations } from '../en';

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
import { countries } from './countries';
import { errors } from './errors';
import { format } from './format';


/** Russian. Typed against English, so a missing key is a compile error. */
const catalogue: Translations = { common, language, auth, onboarding, feed, profile,
  score, challenges, teams, views, progress, discover, opportunities, messaging, settings,
  safety, sports, countries, errors, format };

export const ru = catalogue as Translations;
