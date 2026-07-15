import { describe, expect, it } from 'vitest';

import { getSensitiveDataAccess } from './sensitiveDataAccess';

describe('getSensitiveDataAccess', () => {
  it.each(['sport_school', 'arena'] as const)(
    'enforces sensitive dataset reads for %s',
    (businessType) => {
      expect(getSensitiveDataAccess('owner', businessType)).toEqual({
        payments: true,
        sales: true,
        expenses: true,
        products: true,
      });
      expect(getSensitiveDataAccess('manager', businessType)).toEqual({
        payments: true,
        sales: true,
        expenses: true,
        products: true,
      });
      expect(getSensitiveDataAccess('receptionist', businessType)).toEqual({
        payments: true,
        sales: true,
        expenses: false,
        products: true,
      });
      expect(getSensitiveDataAccess('finance', businessType)).toEqual({
        payments: true,
        sales: true,
        expenses: true,
        products: false,
      });
      expect(getSensitiveDataAccess('instructor', businessType)).toEqual({
        payments: false,
        sales: false,
        expenses: false,
        products: false,
      });
    },
  );
});
