import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, errorMessage } from '@/api/client';
import { qk, useCampaignList, useFeatured, type ListParams } from '@/api/hooks';
import { CampaignCard } from '@/components/campaign/CampaignCard';
import { CampaignCardSkeleton } from '@/components/campaign/CampaignCardSkeleton';
import { Button, Chip, EmptyState, ErrorState, Sheet, Text } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { fonts, layout, radius, space, useTheme } from '@/theme';

type Sort = NonNullable<ListParams['sort']>;

const sorts: { value: Sort; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'mostFunded', label: 'Most funded' },
  { value: 'endingSoon', label: 'Ending soon' },
];

const fundedSteps = [
  { value: 0, label: 'Any' },
  { value: 25, label: '25%+' },
  { value: 50, label: '50%+' },
  { value: 75, label: '75%+' },
];

export function ExploreScreen() {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('recommended');
  const [minPercent, setMinPercent] = useState(0);
  const [endingSoon, setEndingSoon] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const q = useDebounce(text, 300);

  const params = useMemo<ListParams>(
    () => ({ q, categories: category ? [category] : undefined, sort, minPercent: minPercent || undefined, endingSoon: endingSoon || undefined }),
    [q, category, sort, minPercent, endingSoon],
  );

  const categories = useQuery({ queryKey: qk.categories, queryFn: () => api<{ items: { name: string; count: number }[] }>('/campaigns/categories') });
  const list = useCampaignList(params);
  const featured = useFeatured();

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;
  const activeFilters = (minPercent ? 1 : 0) + (endingSoon ? 1 : 0);
  const searching = Boolean(q.trim() || category || activeFilters);
  const sortLabel = sorts.find((s) => s.value === sort)!.label;

  const clearAll = () => {
    setText('');
    setCategory(null);
    setMinPercent(0);
    setEndingSoon(false);
    setSort('recommended');
  };

  const chips = useMemo(() => {
    const all = categories.data?.items ?? [];
    return [...all].sort((a, b) => b.count - a.count).filter((c) => c.count > 0);
  }, [categories.data]);

  const header = (
    <View style={styles.header}>
      <Text variant="display">Explore</Text>

      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.rule }]}>
        <Search size={20} color={colors.inkMuted} strokeWidth={1.75} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search campaigns"
          placeholderTextColor={colors.inkMuted}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search campaigns"
          style={[styles.searchInput, { color: colors.ink }]}
        />
        {text ? (
          <Pressable onPress={() => setText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
            <X size={18} color={colors.inkMuted} strokeWidth={1.75} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" selected={!category} onPress={() => setCategory(null)} />
        {chips.map((c) => (
          <Chip key={c.name} label={c.name} selected={category === c.name} onPress={() => setCategory(category === c.name ? null : c.name)} />
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <Pressable onPress={() => setSortOpen(true)} accessibilityRole="button" accessibilityLabel={`Sort by ${sortLabel}`} style={styles.control}>
          <Text variant="label">{sortLabel}</Text>
          <ChevronDown size={16} color={colors.ink} strokeWidth={1.75} />
        </Pressable>
        <Pressable onPress={() => setFilterOpen(true)} accessibilityRole="button" accessibilityLabel="Filters" style={styles.control}>
          <SlidersHorizontal size={16} color={colors.ink} strokeWidth={1.75} />
          <Text variant="label">Filters{activeFilters ? ` · ${activeFilters}` : ''}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {searching ? (
          <Pressable onPress={clearAll} hitSlop={8} accessibilityRole="button">
            <Text variant="label" tone="action">
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!searching && featured.data?.items[0] ? (
        <View style={{ gap: space.sm }}>
          <Text variant="kicker" tone="muted">
            Featured
          </Text>
          <CampaignCard campaign={featured.data.items[0]} />
        </View>
      ) : null}

      {!list.isLoading && !list.isError ? (
        <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
          {total === 1 ? '1 campaign' : `${total} campaigns`}
          {searching ? ' match' : ''}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.bg }]}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <CampaignCard campaign={item} />
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.isLoading ? (
            <View style={[styles.row, { gap: space.lg }]}>
              <CampaignCardSkeleton />
              <CampaignCardSkeleton />
            </View>
          ) : list.isError ? (
            <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState
              title="No campaigns match"
              message={q.trim() ? `Nothing found for “${q.trim()}”. Try a shorter word or clear the filters.` : 'Try a different category or loosen the filters.'}
              actionLabel="Clear search and filters"
              onAction={clearAll}
            />
          )
        }
        ListFooterComponent={
          <>
            {list.isFetchingNextPage ? <ActivityIndicator style={{ padding: space.xl }} color={colors.ink} /> : null}
            {!list.isFetchingNextPage && list.hasNextPage ? (
              <View style={styles.row}>
                <Button label="Load more" variant="secondary" onPress={() => list.fetchNextPage()} />
              </View>
            ) : null}
          </>
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => list.refetch()}
        ItemSeparatorComponent={() => <View style={{ height: space.lg }} />}
      />

      <Sheet visible={sortOpen} title="Sort by" onClose={() => setSortOpen(false)}>
        {sorts.map((s) => (
          <Pressable
            key={s.value}
            onPress={() => {
              setSort(s.value);
              setSortOpen(false);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: sort === s.value }}
            style={[styles.option, { borderColor: colors.rule }]}
          >
            <Text variant="body" style={{ fontFamily: sort === s.value ? fonts.sansSemi : fonts.sans }}>
              {s.label}
            </Text>
            {sort === s.value ? <View style={[styles.dot, { backgroundColor: colors.action }]} /> : null}
          </Pressable>
        ))}
      </Sheet>

      <Sheet visible={filterOpen} title="Filters" onClose={() => setFilterOpen(false)}>
        <View style={{ gap: space.sm }}>
          <Text variant="label">Funded so far</Text>
          <View style={styles.wrap}>
            {fundedSteps.map((f) => (
              <Chip key={f.value} label={f.label} selected={minPercent === f.value} onPress={() => setMinPercent(f.value)} />
            ))}
          </View>
        </View>
        <View style={[styles.switchRow, { borderColor: colors.rule }]}>
          <View style={{ flex: 1 }}>
            <Text variant="label">Ending soon</Text>
            <Text variant="caption" tone="muted">
              Open campaigns with 14 days or fewer left
            </Text>
          </View>
          <Switch value={endingSoon} onValueChange={setEndingSoon} trackColor={{ true: colors.positive, false: colors.rule }} thumbColor="#FFFFFF" accessibilityLabel="Ending soon" />
        </View>
        <Button label="Show results" onPress={() => setFilterOpen(false)} />
        {activeFilters ? (
          <Button
            label="Reset filters"
            variant="ghost"
            onPress={() => {
              setMinPercent(0);
              setEndingSoon(false);
            }}
          />
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: space.x5, width: '100%', maxWidth: layout.maxContent, alignSelf: 'center' },
  header: { paddingHorizontal: layout.gutter, paddingTop: space.lg, gap: space.lg, paddingBottom: space.lg },
  row: { paddingHorizontal: layout.gutter },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.lg, minHeight: 52 },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 16, minHeight: 48 },
  chips: { gap: space.sm, paddingRight: layout.gutter },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  control: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, borderBottomWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md, borderTopWidth: 1, borderBottomWidth: 1 },
});
