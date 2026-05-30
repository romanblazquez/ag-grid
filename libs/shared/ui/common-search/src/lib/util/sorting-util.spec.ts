/*
 * Copyright (c) 2025 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on May 12, 2025
 */

import { bestMatchSortFn } from './sorting-util';

describe('Sorting by best match', () => {
  it('should sort by best match first and then by alphabetical', () => {
    // arrange
    interface RandomObject {
      shortname: string;
    }

    const query = 'ca';
    const objectLists: RandomObject[] = [
      { shortname: 'CANC' },
      { shortname: 'CANT' },
      { shortname: 'CAPL' },
      { shortname: 'BCAPE' },
      { shortname: 'DAIN' },
      { shortname: 'CCHC' },
    ];
    const expectedResult: RandomObject[] = [
      { shortname: 'CANC' },
      { shortname: 'CANT' },
      { shortname: 'CAPL' },
      { shortname: 'BCAPE' },
      { shortname: 'CCHC' },
      { shortname: 'DAIN' },
    ];

    // act
    const result = objectLists.sort(
      bestMatchSortFn(query, (item) => item.shortname),
    );

    // assert
    expect(result).toEqual(expectedResult);
  });
  it('should fallback to alphabetical when no matches', () => {
    // arrange
    interface RandomObject {
      shortname: string;
    }

    const query = 'x';
    const objectLists: RandomObject[] = [
      { shortname: 'ZULU' },
      { shortname: 'CANT' },
      { shortname: 'APPLE' },
    ];
    const expectedResult: RandomObject[] = [
      { shortname: 'APPLE' },
      { shortname: 'CANT' },
      { shortname: 'ZULU' },
    ];

    // act
    const result = objectLists.sort(
      bestMatchSortFn(query, (item) => item.shortname),
    );

    // assert
    expect(result).toEqual(expectedResult);
  });
});
