import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import {
  Building2,
  CalendarDays,
  Facebook,
  Ghost,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Music2,
  Navigation,
  Phone,
  Trophy,
  Twitter,
  UserRound,
  Youtube,
  type LucideIcon,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, SectionHeader, Text } from '@/components/ui';
import { countryLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import type { ClubLocation, ClubPage } from '@/lib/api.club';
import { SOCIAL_KEYS, type SocialKey } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { metaLine } from '@/lib/format';

const SOCIAL_ICON: Record<SocialKey, LucideIcon> = {
  instagram: Instagram,
  x: Twitter,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music2,
  linkedin: Linkedin,
  snapchat: Ghost,
};

const SOCIAL_BASE: Record<SocialKey, string> = {
  instagram: 'https://instagram.com/',
  x: 'https://x.com/',
  facebook: 'https://facebook.com/',
  youtube: 'https://youtube.com/@',
  tiktok: 'https://tiktok.com/@',
  linkedin: 'https://linkedin.com/company/',
  snapchat: 'https://snapchat.com/add/',
};

/** A stored handle ("@alnasr", "alnasr") or URL → a link that opens the profile. */
export function socialUrl(key: SocialKey, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+\//.test(v)) return `https://${v}`;
  const handle = v.replace(/^@+/, '').replace(/\s+/g, '');
  return handle ? `${SOCIAL_BASE[key]}${encodeURIComponent(handle)}` : null;
}

function websiteUrl(value: string): string {
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function mapsUrl(loc: { latitude: number | null; longitude: number | null; address: string | null; city: string | null; country: string | null }): string | null {
  if (loc.latitude != null && loc.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
  }
  const q = [loc.address, loc.city, loc.country].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

function open(url: string | null) {
  if (url) Linking.openURL(url).catch(() => {});
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 40 }}>
      <Icon size={16} color={colors.textMuted} />
      <Text variant="caption" tone="muted" style={{ width: 96 }}>
        {label}
      </Text>
      <Text variant="captionStrong" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

/** A tappable row: icon, text, opens something outside the app. */
function LinkRow({
  icon: Icon,
  label,
  onPress,
  a11y,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  a11y?: string;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={a11y ?? label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: theme.hit.min,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon size={18} color={colors.primary} />
      <Text variant="captionStrong" tone="primary" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Prose({ title, text }: { title: string; text: string | null }) {
  const body = text?.trim();
  if (!body) return null;
  return (
    <View>
      <SectionHeader title={title} />
      <Text variant="body" tone="secondary">
        {body}
      </Text>
    </View>
  );
}

function LocationRow({ loc }: { loc: ClubLocation }) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const url = mapsUrl(loc);
  const title = loc.label?.trim() || (loc.is_primary ? t('club.about.mainBase') : loc.city) || '';
  const line = metaLine(loc.address, loc.city, countryLabel(t, loc.country));
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
      <MapPin size={18} color={loc.is_primary ? colors.primary : colors.textMuted} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {title ? <Text variant="captionStrong">{title}</Text> : null}
          {loc.is_primary ? <Badge label={t('club.about.mainBase')} tone="primary" /> : null}
        </View>
        {line ? (
          <Text variant="caption" tone="secondary">
            {line}
          </Text>
        ) : null}
        {url ? (
          <Pressable
            onPress={() => open(url)}
            accessibilityRole="link"
            hitSlop={10}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 32 }}
          >
            <Navigation size={14} color={colors.primary} />
            <Text variant="captionStrong" tone="primary">
              {t('club.about.openMaps')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** The club in its own words, then the facts, places and ways to reach it. */
export function ClubAboutTab({ page }: { page: ClubPage }) {
  const t = useT();
  const { spacing } = useTheme();
  const org = page.organization;

  /* The primary base: the stored locations if it is there, else the page's own address. */
  const locations = [...page.locations].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  if (!locations.some((l) => l.is_primary) && (org.address || org.city || org.latitude != null)) {
    locations.unshift({
      id: 'primary',
      label: null,
      address: org.address,
      city: org.city,
      country: org.country,
      latitude: org.latitude,
      longitude: org.longitude,
      is_primary: true,
    });
  }

  const socials = SOCIAL_KEYS.map((key) => ({ key, url: socialUrl(key, org.socials?.[key] ?? '') })).filter(
    (s): s is { key: SocialKey; url: string } => !!s.url,
  );
  const hasContact = !!(org.contact_email || org.contact_phone || org.website);

  return (
    <View style={{ gap: spacing.xl }}>
      {org.description?.trim() ? (
        <Text variant="body" tone="secondary">
          {org.description.trim()}
        </Text>
      ) : !org.about_story ? (
        <Text variant="body" tone="muted">
          {t('opportunities.org.noIntro')}
        </Text>
      ) : null}

      <Prose title={t('club.about.story')} text={org.about_story} />
      <Prose title={t('club.about.mission')} text={org.mission} />
      <Prose title={t('club.about.philosophy')} text={org.philosophy} />

      <View>
        <SectionHeader title={t('club.about.facts')} />
        <Card tone="alt" style={{ gap: spacing.xs }}>
          <Fact icon={Building2} label={t('club.about.type')} value={clubLabel(t, 'type', org.type)} />
          {org.founded_year ? (
            <Fact icon={CalendarDays} label={t('club.about.founded')} value={String(org.founded_year)} />
          ) : null}
          {org.ceo_name ? <Fact icon={UserRound} label={t('club.about.director')} value={org.ceo_name} /> : null}
          {org.league ? <Fact icon={Trophy} label={t('club.about.league')} value={org.league} /> : null}
        </Card>
        {!org.is_verified ? (
          <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
            {t('opportunities.org.unverified')}
          </Text>
        ) : null}
      </View>

      {page.sports.length > 0 ? (
        <View>
          <SectionHeader title={t('club.about.sports')} />
          <View style={{ gap: spacing.md }}>
            {page.sports.map((s) => (
              <View key={s.sport} style={{ gap: spacing.xs }}>
                <Text variant="bodyStrong">{sportLabel(t, s.sport)}</Text>
                {s.categories.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                    {s.categories.map((c) => (
                      <Badge key={c} label={clubLabel(t, 'category', c)} size="md" />
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {locations.length > 0 ? (
        <View>
          <SectionHeader title={t('club.about.locations')} />
          <Card tone="alt" style={{ gap: spacing.lg }}>
            {locations.map((loc) => (
              <LocationRow key={loc.id} loc={loc} />
            ))}
          </Card>
        </View>
      ) : null}

      {hasContact ? (
        <View>
          <SectionHeader title={t('club.about.contact')} />
          <Card tone="alt" style={{ gap: 0 }}>
            {org.contact_email ? (
              <LinkRow
                icon={Mail}
                label={org.contact_email}
                a11y={t('club.about.emailA11y', { value: org.contact_email })}
                onPress={() => open(`mailto:${org.contact_email}`)}
              />
            ) : null}
            {org.contact_phone ? (
              <LinkRow
                icon={Phone}
                label={org.contact_phone}
                a11y={t('club.about.callA11y', { value: org.contact_phone })}
                onPress={() => open(`tel:${org.contact_phone!.replace(/[^\d+]/g, '')}`)}
              />
            ) : null}
            {org.website ? (
              <LinkRow
                icon={Globe}
                label={org.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                onPress={() => open(websiteUrl(org.website!))}
              />
            ) : null}
          </Card>
        </View>
      ) : null}

      {socials.length > 0 ? (
        <View>
          <SectionHeader title={t('club.about.socials')} />
          <Card tone="alt" style={{ gap: 0 }}>
            {socials.map((s) => (
              <LinkRow
                key={s.key}
                icon={SOCIAL_ICON[s.key]}
                label={clubLabel(t, 'social', s.key)}
                onPress={() => open(s.url)}
              />
            ))}
          </Card>
        </View>
      ) : null}

      {org.facilities.length > 0 ? (
        <View>
          <SectionHeader title={t('club.about.facilities')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {org.facilities.map((f) => (
              <Badge key={f} label={clubLabel(t, 'facility', f)} tone="info" size="md" />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
