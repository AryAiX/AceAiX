import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import {
  Calendar, MapPin, Clock, ChevronRight, Plus, Trash2,
} from 'lucide-react-native';
import { AppHeader } from '@/components/AppHeader';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { CreateEventSheet, TYPE_COLORS } from '@/components/events/CreateEventSheet';
import {
  fetchMyEvents, deleteEvent, formatEventDate, type AthleteEvent,
} from '@/lib/eventsService';

const PLATFORM_EVENTS: Array<{ id: string; title: string; type: string; date: string; time: string; location: string; color: string }> = [];

export default function Events() {
  const [myEvents, setMyEvents] = useState<AthleteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [platformAttending, setPlatformAttending] = useState(new Set<string>());

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await fetchMyEvents();
    setMyEvents(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteEvent(id);
    setMyEvents(prev => prev.filter(e => e.id !== id));
    setDeletingId(null);
  }

  const totalUpcoming = PLATFORM_EVENTS.length + myEvents.length;
  const totalConfirmed = platformAttending.size + myEvents.length;

  return (
    <View style={s.root}>
      <AppHeader title="Events" />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={s.summaryRow}>
          {[
            { label: 'Upcoming', value: String(totalUpcoming) },
            { label: 'Confirmed', value: String(totalConfirmed) },
            { label: 'My Events', value: String(myEvents.length) },
          ].map((st, i) => (
            <View key={st.label} style={[s.summaryItem, i < 2 && s.summaryBorder]}>
              <Text style={s.summaryVal}>{st.value}</Text>
              <Text style={s.summaryLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Create button */}
        <TouchableOpacity style={s.createBanner} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
          <View style={s.createBannerLeft}>
            <View style={s.createIcon}>
              <Plus color={Colors.primary} size={18} />
            </View>
            <View>
              <Text style={s.createBannerTitle}>Create an Event</Text>
              <Text style={s.createBannerSub}>Schedule a match, training, or showcase</Text>
            </View>
          </View>
          <ChevronRight color={Colors.textMuted} size={18} />
        </TouchableOpacity>

        {/* My Events */}
        {(loading || myEvents.length > 0) && (
          <View>
            <Text style={s.sectionTitle}>My Events</Text>
            {loading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
            ) : (
              myEvents.map(ev => {
                const col = ev.color;
                const isDeleting = deletingId === ev.id;
                return (
                  <View key={ev.id} style={[s.card, { borderLeftWidth: 4, borderLeftColor: col }]}>
                    <View style={s.cardHeader}>
                      <View style={[s.typeBadge, { backgroundColor: `${col}18` }]}>
                        <Text style={[s.typeTxt, { color: col }]}>{ev.type}</Text>
                      </View>
                      {ev.is_public && (
                        <View style={s.publicBadge}>
                          <Text style={s.publicTxt}>Public</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={s.deleteBtn}
                        onPress={() => handleDelete(ev.id)}
                        disabled={isDeleting}
                        hitSlop={8}
                      >
                        {isDeleting
                          ? <ActivityIndicator color={Colors.error} size="small" />
                          : <Trash2 color={Colors.error} size={14} />
                        }
                      </TouchableOpacity>
                    </View>
                    <Text style={s.eventTitle}>{ev.title}</Text>
                    <View style={s.metaRow}>
                      <View style={s.metaItem}>
                        <Calendar color={Colors.textDisabled} size={12} />
                        <Text style={s.metaTxt}>{formatEventDate(ev.event_date)}</Text>
                      </View>
                      {ev.event_time ? (
                        <View style={s.metaItem}>
                          <Clock color={Colors.textDisabled} size={12} />
                          <Text style={s.metaTxt}>{ev.event_time}</Text>
                        </View>
                      ) : null}
                    </View>
                    {ev.location ? (
                      <View style={s.metaItem}>
                        <MapPin color={Colors.textDisabled} size={12} />
                        <Text style={s.metaTxt}>{ev.location}</Text>
                      </View>
                    ) : null}
                    {ev.description ? (
                      <Text style={s.description} numberOfLines={2}>{ev.description}</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Platform Events */}
        <Text style={s.sectionTitle}>Platform Events</Text>
        {PLATFORM_EVENTS.map(ev => {
          const isAttending = platformAttending.has(ev.id);
          return (
            <View key={ev.id} style={[s.card, { borderLeftWidth: 4, borderLeftColor: ev.color }]}>
              <View style={s.cardHeader}>
                <View style={[s.typeBadge, { backgroundColor: `${ev.color}18` }]}>
                  <Text style={[s.typeTxt, { color: ev.color }]}>{ev.type}</Text>
                </View>
                {isAttending && (
                  <View style={s.confirmedBadge}>
                    <Text style={s.confirmedTxt}>Confirmed</Text>
                  </View>
                )}
              </View>
              <Text style={s.eventTitle}>{ev.title}</Text>
              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Calendar color={Colors.textDisabled} size={12} />
                  <Text style={s.metaTxt}>{ev.date}</Text>
                </View>
                <View style={s.metaItem}>
                  <Clock color={Colors.textDisabled} size={12} />
                  <Text style={s.metaTxt}>{ev.time}</Text>
                </View>
              </View>
              <View style={s.metaItem}>
                <MapPin color={Colors.textDisabled} size={12} />
                <Text style={s.metaTxt}>{ev.location}</Text>
              </View>
              <View style={s.cardFooter}>
                <TouchableOpacity
                  style={[s.rsvpBtn, isAttending && s.rsvpBtnActive]}
                  onPress={() => setPlatformAttending(prev => {
                    const next = new Set(prev);
                    isAttending ? next.delete(ev.id) : next.add(ev.id);
                    return next;
                  })}
                >
                  <Text style={[s.rsvpTxt, isAttending && s.rsvpTxtActive]}>
                    {isAttending ? 'Attending' : 'RSVP'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.detailsBtn}>
                  <Text style={s.detailsTxt}>Details</Text>
                  <ChevronRight color={Colors.textMuted} size={14} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>

      <CreateEventSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          load();
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  summaryBorder: { borderRightWidth: 1, borderRightColor: Colors.border },
  summaryVal: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.textPrimary },
  summaryLbl: { fontFamily: Typography.family.regular, fontSize: 10, color: Colors.textMuted },
  createBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  createBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  createIcon: {
    width: 40, height: 40,
    borderRadius: Radii.md,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBannerTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  createBannerSub: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xs,
    color: Colors.textDisabled,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  typeBadge: { borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 3 },
  typeTxt: { fontFamily: Typography.family.bold, fontSize: 11 },
  confirmedBadge: {
    backgroundColor: `${Colors.success}18`,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${Colors.success}35`,
  },
  confirmedTxt: { fontFamily: Typography.family.bold, fontSize: 11, color: Colors.success },
  publicBadge: {
    backgroundColor: `${Colors.primary}18`,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${Colors.primary}35`,
  },
  publicTxt: { fontFamily: Typography.family.bold, fontSize: 11, color: Colors.primary },
  deleteBtn: { marginLeft: 'auto' as any },
  eventTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  metaRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  metaTxt: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textMuted },
  cardFooter: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  rsvpBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: Colors.elevated,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rsvpBtnActive: { backgroundColor: `${Colors.success}18`, borderColor: `${Colors.success}35` },
  rsvpTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.textMuted },
  rsvpTxtActive: { color: Colors.success },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: Spacing.md },
  detailsTxt: { fontFamily: Typography.family.medium, fontSize: Typography.size.sm, color: Colors.textMuted },
});
