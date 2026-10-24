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
import { parentApproval } from './parentApproval';
import { sports } from './sports';
import { countries } from './countries';
import { sportFit } from './sportFit';
import { invites } from './invites';
import { errors } from './errors';
import { format } from './format';
import { stories } from './stories';
import { reels } from './reels';
import { explore } from './explore';
import { coaching } from './coaching';
import { sponsorship } from './sponsorship';
import { club } from './club';
import { clubSetup } from './clubSetup';
import { clubManage } from './clubManage';
import { clubMatch } from './clubMatch';
import { whatsNew } from './whatsNew';


/** German. Typed against English, so a missing key is a compile error. */
const catalogue: Translations = { common, language, auth, onboarding, feed, profile,
  score, challenges, meetups, intelligence, teams, views, progress, discover, opportunities, messaging, settings,
  safety, parentApproval, sports, countries, errors, format, stories, reels, explore, sponsorship, coaching,
  club, clubSetup, clubManage, clubMatch, sportFit, invites, whatsNew };

export const de = catalogue as Translations;
