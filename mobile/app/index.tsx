import { useCallback, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  SectionList,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { MenuItem } from "../lib/types";
import { Hero } from "../components/Hero";
import { CategoryTabs } from "../components/CategoryTabs";
import { FilterBar } from "../components/FilterBar";
import { MenuItemCard } from "../components/MenuItemCard";
import { MenuItemCardSkeleton } from "../components/MenuItemCardSkeleton";
import { SectionHeader } from "../components/SectionHeader";
import { MiniCart } from "../components/MiniCart";
import { SearchBar } from "../components/SearchBar";
import { applyFilters, type FilterId } from "../lib/filters";
import { searchItems } from "../lib/search";
import { useFavoritesStore } from "../store/favoritesStore";

interface Section {
  id: string;
  title: string;
  data: MenuItem[];
}

export default function MenuScreen() {
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["menu"],
    queryFn: api.getMenu,
  });

  const [filters, setFilters] = useState<FilterId[]>([]);
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("");
  const listRef = useRef<SectionList<MenuItem, Section>>(null);
  const programmaticScrolling = useRef(false);
  const favoriteIds = useFavoritesStore((s) => s.ids);

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const isSearching = query.trim().length > 0;

  const sections: Section[] = useMemo(() => {
    if (!data) return [];
    if (isSearching) {
      const results = searchItems(applyFilters(data.items, filters, favoriteIdSet), query);
      return results.length
        ? [{ id: "results", title: `Results · ${results.length}`, data: results }]
        : [];
    }
    return data.categories
      .map((cat) => ({
        id: cat.id,
        title: cat.name,
        data: applyFilters(
          data.items.filter((i) => i.category === cat.id),
          filters,
          favoriteIdSet,
        ),
      }))
      .filter((s) => s.data.length > 0);
  }, [data, filters, favoriteIdSet, isSearching, query]);

  const visibleCategories = useMemo(
    () => sections.map((s) => ({ id: s.id, name: s.title })),
    [sections],
  );

  const currentActive = activeSection || sections[0]?.id || "";

  const onTabPress = useCallback(
    (id: string) => {
      const idx = sections.findIndex((s) => s.id === id);
      if (idx < 0) return;
      programmaticScrolling.current = true;
      setActiveSection(id);
      listRef.current?.scrollToLocation({
        sectionIndex: idx,
        itemIndex: 0,
        viewOffset: 12,
        animated: true,
      });
      // Re-enable scrollspy after the auto-scroll has settled, so the user's
      // tap doesn't get overridden by intermediate sections briefly visible
      // during the animation.
      setTimeout(() => {
        programmaticScrolling.current = false;
      }, 800);
    },
    [sections],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (programmaticScrolling.current) return;
      // Find the topmost viewable token that belongs to a real Section.
      for (const vt of viewableItems) {
        const section = (vt?.section as Section | undefined)?.id;
        if (section) {
          setActiveSection(section);
          return;
        }
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 10,
    minimumViewTime: 0,
  }).current;

  const toggleFilter = (id: FilterId) =>
    setFilters((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <SafeAreaView className="flex-1 bg-cream-100" edges={["top"]}>
      <Hero
        name={data?.restaurant.name ?? "The Intelligent Bistro"}
        tagline={data?.restaurant.tagline ?? "Modern American · Open Kitchen"}
      />

      <SearchBar value={query} onChangeText={setQuery} />

      {data && !isSearching && (
        <View>
          <CategoryTabs
            categories={visibleCategories}
            active={currentActive}
            onChange={onTabPress}
          />
        </View>
      )}

      {data && (
        <View>
          <FilterBar active={filters} onToggle={toggleFilter} />
          <View className="h-px bg-cream-200/70 mt-1" />
        </View>
      )}

      {isLoading && (
        <View className="flex-1 px-5 pt-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <MenuItemCardSkeleton key={i} index={i} />
          ))}
        </View>
      )}

      {error && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-serif text-ink-900 text-xl text-center">Kitchen is offline</Text>
          <Text className="font-sans text-ink-500 text-sm text-center mt-2">
            Can't reach {api.baseUrl}. Make sure the backend is running.
          </Text>
        </View>
      )}

      {!isLoading && !error && (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <SectionHeader label={section.title} count={section.data.length} />
          )}
          renderItem={({ item, index }) => <MenuItemCard item={item} index={index} />}
          stickySectionHeadersEnabled={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor="#3F5F3C"
              colors={["#3F5F3C"]}
            />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            data ? (
              <View className="items-center pt-20 px-8">
                <Text style={{ fontSize: 38, lineHeight: 46 }}>
                  {isSearching ? "🔎" : "🍽️"}
                </Text>
                <Text className="font-serif text-ink-900 text-xl text-center mt-3">
                  {isSearching ? `Nothing matches "${query}"` : "Nothing matches those filters"}
                </Text>
                <Text className="font-sans text-ink-500 text-sm text-center mt-1.5">
                  {isSearching
                    ? "Try a different word, or ask the assistant for a recommendation."
                    : "Try clearing a tag, or ask the assistant for a recommendation."}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <MiniCart />
    </SafeAreaView>
  );
}
