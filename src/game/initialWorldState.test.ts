import { describe, expect, it } from 'vitest';

import { initialFactions } from './data';
import { createInitialWorldState } from './simulation';

describe('createInitialWorldState', () => {
  it('includes explicit from/to region endpoints for each trade route', () => {
    const world = createInitialWorldState(initialFactions);
    const regionIds = new Set(Object.keys(world.regions));

    for (const route of Object.values(world.tradeRoutes)) {
      expect(route.fromRegionId).toBeTruthy();
      expect(route.toRegionId).toBeTruthy();
      expect(regionIds.has(route.fromRegionId!)).toBe(true);
      expect(regionIds.has(route.toRegionId!)).toBe(true);
      expect(route.fromRegionId).not.toBe(route.toRegionId);
    }
  });
});
