import { useMemo } from 'preact/hooks';
import type { Track } from '@yasq/shared';

interface FilterSidebarProps {
  selectedTags: Record<string, string[]>;
  setSelectedTags: (
    update: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)
  ) => void;
  activeTagCategories: [string, string[]][];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  availableTagsByCategory: Record<string, string[]>;
  baseTracks: { track: Track; originalIndex: number }[];
  isTracksActive: boolean;
}

export function FilterSidebar({
  selectedTags,
  setSelectedTags,
  activeTagCategories,
  searchQuery,
  setSearchQuery,
  availableTagsByCategory,
  baseTracks,
  isTracksActive,
}: FilterSidebarProps) {
  const toggleTagSelection = (type: string, value: string) => {
    setSelectedTags(prev => {
      const currentVals = prev[type] || [];
      const updatedVals = currentVals.includes(value) ? currentVals.filter(v => v !== value) : [...currentVals, value];

      const nextState = { ...prev, [type]: updatedVals };
      if (updatedVals.length === 0) delete nextState[type];
      return nextState;
    });
  };

  const clearAllTags = () => setSelectedTags({});

  const reachableTagsMap = useMemo(() => {
    const validTags = new Map<string, number>();
    const categories = Object.keys(availableTagsByCategory);

    categories.forEach(catToSkip => {
      // Get all active category filters EXCEPT the category currently being checked
      const otherFilters = Object.entries(selectedTags).filter(([type, vals]) => type !== catToSkip && vals.length > 0);

      // Filter base tracks against all OTHER active categories (AND logic across types, OR within type)
      const reachableInCat = baseTracks.filter(({ track }) =>
        otherFilters.every(([type, selectedVals]) =>
          track.tags?.some(t => t.type === type && selectedVals.includes(t.value))
        )
      );

      // Count occurrences of tags for the current category
      reachableInCat.forEach(({ track }) => {
        track.tags?.forEach(tag => {
          if (tag.type === catToSkip) {
            validTags.set(tag.value, (validTags.get(tag.value) || 0) + 1);
          }
        });
      });
    });

    return validTags;
  }, [baseTracks, selectedTags, availableTagsByCategory]);

  const searchPlaceholder = isTracksActive ? 'Search title, game...' : 'Search playlist name...';

  return (
    <>
      <div className="search-box">
        <label htmlFor="search-input">Search</label>
        <div className="search-input-wrapper">
          <input
            id="search-input"
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onInput={e => setSearchQuery((e.target as HTMLInputElement).value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="secondary-btn clear-search-btn"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {isTracksActive && Object.keys(availableTagsByCategory).length > 0 && (
        <div className="tag-filter-section">
          <div className="tag-filter-header">
            <label>Filter by Tag</label>
            {activeTagCategories.length > 0 && (
              <button
                onClick={clearAllTags}
                className="secondary-btn"
              >
                Clear All
              </button>
            )}
          </div>

          {Object.entries(availableTagsByCategory).map(([category, tagValues]) => (
            <div
              key={category}
              className="tag-category-group"
            >
              <span className="tag-category-title">{category}</span>
              <div className="tag-checkboxes-list">
                {tagValues.map(val => {
                  const isChecked = selectedTags[category]?.includes(val) ?? false;
                  const count = reachableTagsMap.get(val) || 0;
                  const isDisabled = !isChecked && count === 0;

                  return (
                    <label
                      key={val}
                      className={`tag-checkbox-label ${isDisabled ? 'disabled' : ''}`}
                    >
                      <div className="tag-checkbox-content">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={() => toggleTagSelection(category, val)}
                        />
                        <span>{val}</span>
                      </div>
                      <span className="tag-badge">{count}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
