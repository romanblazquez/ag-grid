/**
 * Generic suggestion type for suggestible search results.
 * Extend or replace this union with domain-specific suggestion interfaces as needed.
 */
export type SuggestibleSearchSuggestion = Record<string, unknown>;

/**
 * Generic response envelope returned by the search API.
 */
export interface SuggestibleSearchResponse<T> {
  suggestions: Array<T>;
}
