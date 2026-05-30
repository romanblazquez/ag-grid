import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SuggestibleSearchResponse } from '@fmr-pr000539/shared/data';
import { SuggestibleSearchSuggestion } from './suggestible-search-bar.model';

@Injectable()
export abstract class SuggestibleServiceAbstract {
  public abstract search(
    query: string,
  ): Observable<SuggestibleSearchResponse<SuggestibleSearchSuggestion>>;
}
