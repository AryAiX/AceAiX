import type { Translations } from '../en';

import { common } from './common';
import { language } from './language';
import { auth } from './auth';
import { onboarding } from './onboarding';
import { feed } from './feed';
import { profile } from './profile';
import { score } from './score';
import { challenges } from './challenges';
import { meetups } from './meetups';
import { intelligence } from './intelligence';
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
import { stories } from './stories';
import { reels } from './reels';
import { explore } from './explore';


/** العربية. مُقيَّدة بأنواع الإنجليزية، فأي مفتاح ناقص خطأ في الترجمة البرمجية. */
export const ar: Translations = { common, language, auth, onboarding, feed, profile,
  score, challenges, meetups, intelligence, teams, views, progress, discover, opportunities, messaging, settings,
  safety, sports, countries, errors, format, stories, reels, explore };
