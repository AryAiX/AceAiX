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

/**
 * 中文只有一种复数形式。
 *
 * 英文写 `x_one` 和 `x_other` 的地方，这份目录只写 `x_other` ——
 * `Intl.PluralRules('zh')` 永远只会选中 `other`，写出来的 `_one` 是一条
 * 谁也读不到的死文案。`Translations` 就是 `typeof en`，把 `_one` 列成了
 * 必填，所以这里把它从要求里去掉，其余每一个键仍然照常检查。
 *
 * Chinese has a single plural category. Where English writes `x_one` and
 * `x_other`, this catalogue writes only `x_other`: `Intl.PluralRules('zh')`
 * never selects anything else, so a `_one` form would be dead copy nobody can
 * reach. `Translations` is `typeof en` and lists those keys as required, so
 * they are dropped from the requirement here — every other key is still
 * checked, and `tests/unit/i18n.test.ts` is stricter still: it fails if a
 * `_one` form is present.
 */
type SingleFormPlurals<T> = {
  [K in keyof T as K extends `${string}_one` ? never : K]: T[K] extends string
    ? T[K]
    : SingleFormPlurals<T[K]>;
};

/** 简体中文。以英文为类型基准，少一个键就是编译错误。 */
const catalogue: SingleFormPlurals<Translations> = { common, language, auth, onboarding,
  feed, profile, score, challenges, teams, views, progress, discover, opportunities, messaging,
  settings, safety, sports, countries, errors, format };

export const zh = catalogue as Translations;
