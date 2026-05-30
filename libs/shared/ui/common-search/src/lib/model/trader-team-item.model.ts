/* eslint-disable */
/**
 * Unified interface for combining trader and team data in a single search component.

 */
export interface TraderTeamItem {
  /**
   * Unique identifier for the item
   */
  readonly id: string | number;

  /**
   * Display name for the item (initials for traders, shortName for teams)
   */
  readonly displayName: string;

  /**
   * Full name for the item (reportingName for traders, longName for teams)
   */
  readonly fullName: string;

  /**
   * Type indicator to distinguish between traders and teams
   */
  readonly itemType: 'trader' | 'team';

  /**
   * The original data object (Person or Team)
   */
  readonly originalData: unknown;

  readonly corpId?: string;

  readonly traderInitials?: string;
}

/**
 * Adapter for converting Person objects to TraderTeamItem interface.

 */
export class PersonTraderTeamAdapter implements TraderTeamItem {
  public constructor(private readonly person: any) {}

  public get id(): number {
    return this.person.personId;
  }

  public get corpId(): string {
    return this.person.corpId || '';
  }

  public get traderInitials(): string {
    return this.person.initials || '';
  }

  public get displayName(): string {
    return this.person.initials || '';
  }

  public get fullName(): string {
    return this.person.reportingName || '';
  }

  public get itemType(): 'trader' | 'team' {
    return 'trader';
  }

  public get originalData(): unknown {
    return this.person;
  }
}

/**
 * Adapter for converting Team objects to TraderTeamItem interface.
 * This follows the Adapter Pattern to make existing Team objects
 * compatible with the unified interface.
 */
export class TeamTraderTeamAdapter implements TraderTeamItem {
  public constructor(private readonly team: any) {}

  public get id(): string {
    return this.team.shortName;
  }

  public get displayName(): string {
    return this.team.shortName || '';
  }

  public get fullName(): string {
    return this.team.longName || '';
  }

  public get itemType(): 'trader' | 'team' {
    return 'team';
  }

  public get originalData(): unknown {
    return this.team;
  }
}
