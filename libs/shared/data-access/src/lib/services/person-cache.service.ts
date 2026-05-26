import { Injectable } from '@angular/core';

export interface PersonRecord {
  sourceId: string;
  fullName: string;
  initials: string;
}

/**
 * Cache service for looking up person names and initials by source ID.
 * Used by column definitions that display trader / cancelled-by information.
 */
@Injectable({ providedIn: 'root' })
export class PersonCacheService {
  private readonly cache = new Map<string, PersonRecord>();

  public setPersons(persons: PersonRecord[]): void {
    persons.forEach((p) => this.cache.set(p.sourceId, p));
  }

  public clear(): void {
    this.cache.clear();
  }

  /**
   * Returns initials for the given source ID, or the sourceId itself as fallback.
   */
  public getPersonInitials(sourceId: string): string {
    return this.cache.get(sourceId)?.initials ?? sourceId;
  }

  /**
   * Returns initials suitable for use in filter value getters.
   * Falls back to the sourceId when no record is found.
   */
  public getPersonInitialsFiltering(sourceId: string): string {
    return this.cache.get(sourceId)?.initials ?? sourceId;
  }

  /**
   * Returns the full name for a given source ID.
   */
  public getPersonFullName(sourceId: string): string {
    return this.cache.get(sourceId)?.fullName ?? sourceId;
  }

  /**
   * Looks up a full name given a set of initials.
   * Scans all cached records; returns empty string when not found.
   */
  public getFullNameFromInitial(initials: string): string {
    for (const record of this.cache.values()) {
      if (record.initials === initials) {
        return record.fullName;
      }
    }
    return initials;
  }
}
