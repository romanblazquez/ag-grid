import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  SuggestibleSearchResponse,
  SuggestibleSearchSuggestion,
} from './suggestible-search-bar.model';

/**
 * Abstract base for injectable search services consumed by SuggestibleSearchComponent.
 * Implement this class and provide it via the suggestibleServiceOverride input to override
 * the default search behaviour with a domain-specific data source.
 */
@Injectable()
export abstract class SuggestibleServiceAbstract {
  public abstract search(
    query: string,
  ): Observable<SuggestibleSearchResponse<SuggestibleSearchSuggestion>>;
}
