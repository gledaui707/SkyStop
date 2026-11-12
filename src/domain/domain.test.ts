import { describe, it, expect } from 'vitest';
import { validateLayover, localToInstant, type LayoverInput } from './time';
import {
  computeBudget, filterActivities, addActivity, removeActivity, copyTemplate, MAX_PLAN_ACTIVITIES,
  type Activity,
} from './plan';

const NOW = new Date('2026-11-11T12:00:00Z');
const base = (o: Partial<LayoverInput>): LayoverInput => ({
  timezone: 'Europe/Lisbon', arrivalDate: '2026-11-17', arrivalTime: '10:00',
  departureDate: '2026-11-17', departureTime: '15:00', bufferMinutes: 90,
  now: NOW, isNew: true, ...o,
});
const ok = (i: LayoverInput) => {
  const r = validateLayover(i);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value;
};
const errs = (i: LayoverInput) => {
  const r = validateLayover(i);
  if (r.ok) throw new Error('expected failure');
  return r.errors;
};

describe('U1 basic', () => {
  it('LIS 10:00-15:00 buffer 90', () => {
    const v = ok(base({}));
    expect(v.totalMinutes).toBe(300);
    expect(v.usableMinutes).toBe(210);
    expect(v.nextDay).toBe(false);
    expect(v.arrivalAt).toBe('2026-11-17T10:00:00Z'); // Lisbon is UTC in November
  });
});

describe('U2 overnight', () => {
  it('crosses midnight', () => {
    const v = ok(base({ arrivalTime: '23:30', departureDate: '2026-11-18', departureTime: '02:00', bufferMinutes: 60 }));
    expect(v.totalMinutes).toBe(150);
    expect(v.usableMinutes).toBe(90);
    expect(v.nextDay).toBe(true);
  });
});

describe('U3 browser-zone independence', () => {
  it('SIN instants are fixed UTC regardless of process TZ', () => {
    const run = () => ok(base({ timezone: 'Asia/Singapore' }));
    const before = run();
    const orig = process.env.TZ;
    for (const tz of ['Europe/Lisbon', 'America/New_York', 'Pacific/Auckland']) {
      process.env.TZ = tz;
      const v = run();
      expect(v).toEqual(before);
    }
    if (orig === undefined) delete process.env.TZ; else process.env.TZ = orig;
    expect(before.totalMinutes).toBe(300);
    expect(before.arrivalAt).toBe('2026-11-17T02:00:00Z'); // UTC+8
    expect(before.departureAt).toBe('2026-11-17T07:00:00Z');
  });
});

describe('U4 rejection', () => {
  it('missing', () => expect(errs(base({ arrivalDate: '' })).arrival).toBeDefined());
  it('missing departure time', () => expect(errs(base({ departureTime: '' })).departure).toBeDefined());
  it('impossible date', () => expect(errs(base({ arrivalDate: '2026-02-30' })).arrival).toMatch(/does not exist/));
  it('bad time', () => expect(errs(base({ arrivalTime: '25:00' })).arrival).toBeDefined());
  it('seconds rejected (whole minutes)', () => expect(errs(base({ arrivalTime: '10:00:30' })).arrival).toBeDefined());
  it('equal', () => expect(errs(base({ departureTime: '10:00' })).departure).toBeDefined());
  it('reversed', () => expect(errs(base({ departureTime: '09:00' })).departure).toBeDefined());
  it('>48h', () => expect(errs(base({ departureDate: '2026-11-19', departureTime: '10:01' })).duration).toBeDefined());
  it('exactly 48h accepted', () => {
    expect(ok(base({ departureDate: '2026-11-19', departureTime: '10:00' })).totalMinutes).toBe(2880);
  });
  it('negative buffer', () => expect(errs(base({ bufferMinutes: -1 })).buffer).toBeDefined());
  it('fractional buffer', () => expect(errs(base({ bufferMinutes: 1.5 })).buffer).toBeDefined());
  it('NaN buffer', () => expect(errs(base({ bufferMinutes: NaN })).buffer).toBeDefined());
  it('buffer 1440 ok, 1441 rejected', () => {
    expect(ok(base({ bufferMinutes: 1440 })).usableMinutes).toBe(0);
    expect(errs(base({ bufferMinutes: 1441 })).buffer).toBeDefined();
  });
  it('new arrival in past rejected; existing plan allowed', () => {
    const past = { arrivalDate: '2026-11-01', departureDate: '2026-11-01' };
    expect(errs(base({ ...past })).arrival).toMatch(/future/);
    expect(ok(base({ ...past, isNew: false })).totalMinutes).toBe(300);
  });
  it('unknown timezone', () => expect(errs(base({ timezone: 'Mars/Base' })).timezone).toBeDefined());
});

describe('U5 DST gap/overlap', () => {
  it('Lisbon 2027-03-28 01:30 (gap) rejected', () => {
    expect(() => localToInstant('2027-03-28', '01:30', 'Europe/Lisbon')).toThrow(RangeError);
    const e = errs(base({ arrivalDate: '2027-03-28', arrivalTime: '01:30', departureDate: '2027-03-28', departureTime: '12:00' }));
    expect(e.arrival).toMatch(/clock change/);
  });
  it('Lisbon 2027-10-31 01:30 (overlap) rejected', () => {
    expect(() => localToInstant('2027-10-31', '01:30', 'Europe/Lisbon')).toThrow(RangeError);
    const e = errs(base({ arrivalDate: '2027-10-31', arrivalTime: '00:30', departureDate: '2027-10-31', departureTime: '01:30' }));
    expect(e.departure).toMatch(/clock change/);
  });
  it('layover spanning the spring gap uses real elapsed time', () => {
    // 00:30 -> 03:30 local on gap night is 2h elapsed, not 3h.
    const v = ok(base({ arrivalDate: '2027-03-28', arrivalTime: '00:30', departureDate: '2027-03-28', departureTime: '03:30', isNew: false }));
    expect(v.totalMinutes).toBe(120);
  });
});

describe('U6 zero usable time', () => {
  it.each([60, 90])('60-min layover, buffer %i', (buffer) => {
    const v = ok(base({ departureTime: '11:00', bufferMinutes: buffer }));
    expect(v.usableMinutes).toBe(0);
    expect(v.noUsableTime).toBe(true);
  });
  it('buffer just under total leaves usable minutes', () => {
    const v = ok(base({ departureTime: '11:00', bufferMinutes: 59 }));
    expect(v.usableMinutes).toBe(1);
    expect(v.noUsableTime).toBe(false);
  });
});

const act = (id: string, minutes: number, category: Activity['category'] = 'food', airportId = 'LIS'): Activity =>
  ({ id, airportId, category, durationMinutes: minutes });

describe('U7 filters', () => {
  const list = [act('a', 40), act('b', 50), act('c', 45, 'rest')];
  it('food + fits 45 includes 40, excludes 50', () => {
    expect(filterActivities(list, { category: 'food', fitsMinutes: 45 }).map((a) => a.id)).toEqual(['a']);
  });
  it('equal duration fits', () => {
    expect(filterActivities(list, { fitsMinutes: 45 }).map((a) => a.id)).toEqual(['a', 'c']);
  });
  it('clearing filters restores all', () => {
    expect(filterActivities(list, { category: null, fitsMinutes: null })).toHaveLength(3);
    expect(filterActivities(list)).toHaveLength(3);
  });
});

describe('U8 templates', () => {
  it('ordered total 100; copy/remove leave template unchanged', () => {
    const template = [act('t1', 40), act('t2', 60)];
    const snapshot = JSON.stringify(template);
    let plan = copyTemplate(template);
    expect(computeBudget(210, plan.map((a) => a.durationMinutes)).activityMinutes).toBe(100);
    plan = removeActivity(plan, 't1');
    plan[0]!.durationMinutes = 1;
    expect(JSON.stringify(template)).toBe(snapshot);
    expect(copyTemplate(template).map((a) => a.id)).toEqual(['t1', 't2']);
  });
});

describe('U9 budget and draft ops', () => {
  const [a, b, c] = [act('a', 40), act('b', 60), act('c', 180)];
  it('over budget then removal', () => {
    let plan: Activity[] = [];
    for (const x of [a, b, c]) plan = addActivity(plan, x, 'LIS');
    let bud = computeBudget(210, plan.map((p) => p.durationMinutes));
    expect(bud).toEqual({ activityMinutes: 280, remainingMinutes: -70, overBudget: true });
    plan = removeActivity(plan, 'c');
    bud = computeBudget(210, plan.map((p) => p.durationMinutes));
    expect(bud).toEqual({ activityMinutes: 100, remainingMinutes: 110, overBudget: false });
  });
  it('exact fit is not over budget', () => {
    expect(computeBudget(210, [150, 60]).overBudget).toBe(false);
    expect(computeBudget(210, [150, 61]).overBudget).toBe(true);
  });
  it('empty plan under zero usable time is valid, not over', () => {
    expect(computeBudget(0, []).overBudget).toBe(false);
  });
  it('duplicate add ignored; order preserved', () => {
    let plan = addActivity([], a, 'LIS');
    plan = addActivity(plan, b, 'LIS');
    plan = addActivity(plan, a, 'LIS');
    expect(plan.map((p) => p.id)).toEqual(['a', 'b']);
  });
  it('cross-airport add ignored', () => {
    expect(addActivity([], act('s', 30, 'food', 'SIN'), 'LIS')).toEqual([]);
  });
  it('max 20 activities', () => {
    let plan: Activity[] = [];
    for (let i = 0; i < 25; i++) plan = addActivity(plan, act(`x${i}`, 1), 'LIS');
    expect(plan).toHaveLength(MAX_PLAN_ACTIVITIES);
  });
  it('does not mutate input', () => {
    const plan = Object.freeze([a]) as readonly Activity[];
    expect(() => addActivity(plan, b, 'LIS')).not.toThrow();
    expect(plan).toHaveLength(1);
  });
});
