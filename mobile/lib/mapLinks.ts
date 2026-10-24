/**
 * Same allow-list as meetups (`20261015000006_meetup_map_link.sql`) and
 * `set_club_map_url` (`20261022000001_club_map_url.sql`). Case-insensitive, prefix match,
 * at most 500 characters. A blank field is optional and is not passed here.
 */
const MAP_URL =
  /^https:\/\/((www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?\/maps|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?\/|maps\.app\.goo\.gl\/|goo\.gl\/maps\/|maps\.apple\.com\/|((www|ul)\.)?waze\.com\/)/i;

export function isAllowedMapUrl(url: string): boolean {
  return url.length <= 500 && MAP_URL.test(url);
}
