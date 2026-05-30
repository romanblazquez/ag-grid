import { BehaviorSubject, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { Context } from '../../model/context.model';

@Injectable()
export abstract class SearchService<T> {
  /**
   * It is used for storing data from "loadInitialData()" function. You should subscribe to this one
   * if you want data loaded on init.
   */
  public persistedData$: BehaviorSubject<T[]> = new BehaviorSubject<T[]>([]);

  /**
   * It searches a query, defined by the service implementation.
   * @param query
   * @param serviceContext
   */
  public abstract search(
    query: string,
    serviceContext?: Context,
  ): Observable<T[]>;

  /**
   * Performs a search with '' query and saves result to persistedData$.
   */
  public abstract loadInitialData(context?: Context): Observable<any>;

  /**
   * It returns initial data defined by the service implementation.
   * @param serviceContext
   */
  public abstract getInitialData(serviceContext: Context): Observable<T[]>;

  /**
   * Method that filters entities trying to match query. Query can be comma separated values.
   *
   * @param entities Group of entities, object source for the filter.
   * @param query Query for filtering, can be single or multiple separated by comma, it removes empty spaces.
   * @param fieldGetters Array of getters that are going to be used for comparing object to query.
   * @protected
   */
  public filterByQueryMultiselect<T>(
    entities: T[],
    query: string,
    fieldGetters: Array<(entity: T) => string>,
  ): T[] {
    if (!query) return entities;
    const terms = query
      .split(',')
      .map((q) => q.trim().toLowerCase())
      .filter(Boolean);
    return entities.filter((entity) =>
      terms.some((term) =>
        fieldGetters.some((getter) => {
          const fieldValue = getter(entity);
          if (!fieldValue) return false;
          const termToCompare = term.toLowerCase();
          const fieldToCompare = fieldValue.toLowerCase();
          const isCommaSeparatedInput = terms.length > 1;
          return isCommaSeparatedInput
            ? fieldToCompare === termToCompare
            : fieldToCompare.includes(termToCompare);
        }),
      ),
    );
  }

  /**
   * Method that filters entities trying to match query.
   * @param entities Group of entities, object source for the filter.
   * @param query Query for filtering, it assumes it is an only query.
   * @param fieldGetters Array of getters that are going to be used for comparing object to query.
   * @protected
   */
  public filterByQuerySingleSelect<T>(
    entities: T[],
    query: string,
    fieldGetters: Array<(entity: T) => string>,
  ): T[] {
    if (!query) return entities;
    return entities.filter((entity) =>
      fieldGetters.some((getter) => {
        const fieldValue = getter(entity);
        if (!fieldValue) return false;
        const termToCompare = query.toLowerCase();
        const fieldToCompare = fieldValue.toLowerCase();
        return fieldToCompare.includes(termToCompare);
      }),
    );
  }
}
