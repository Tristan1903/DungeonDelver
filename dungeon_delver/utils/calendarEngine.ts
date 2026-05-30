export interface CalendarMonth {
  name: string;
  days: number;
  festival?: boolean;
}

export interface CalendarDefinition {
  id: string;
  name: string;
  months: CalendarMonth[];
  dayNames?: string[];
  yearLabel?: string;
  extraDays?: { name: string; afterMonth: number }[];
  leapYearRule?: { month: number; addDay: boolean; every: number; skip?: number[] };
  seasons?: { name: string; months: number[] }[];
}

export interface CalendarState {
  definitionId: string;
  currentYear: number;
  currentMonth: number;
  currentDay: number;
}

export interface CalendarEvent {
  id: string;
  year: number;
  month: number;
  day: number;
  title: string;
  description: string;
  type: 'session' | 'quest' | 'lore' | 'note';
}

import { campaignKey } from './campaignStorage';
const STORAGE_CONFIG = 'calendar-config';
const STORAGE_EVENTS = 'calendar-events';
function sk(key: string) { return campaignKey(key); }

export const HARPTOS: CalendarDefinition = {
  id: 'harptos',
  name: 'Calendar of Harptos',
  yearLabel: 'DR',
  months: [
    { name: 'Hammer', days: 30 },
    { name: 'Alturiak', days: 30 },
    { name: 'Ches', days: 30 },
    { name: 'Tarsakh', days: 30 },
    { name: 'Mirtul', days: 30 },
    { name: 'Kythorn', days: 30 },
    { name: 'Flamerule', days: 30 },
    { name: 'Eleasis', days: 30 },
    { name: 'Eleint', days: 30 },
    { name: 'Marpenoth', days: 30 },
    { name: 'Uktar', days: 30 },
    { name: 'Nightal', days: 30 },
  ],
  extraDays: [
    { name: 'Midwinter', afterMonth: 1 },
    { name: 'Greengrass', afterMonth: 3 },
    { name: 'Midsummer', afterMonth: 6 },
    { name: 'Highsun', afterMonth: 6 },
    { name: 'Feast of the Moon', afterMonth: 10 },
  ],
  seasons: [
    { name: 'Deep Winter', months: [1, 2] },
    { name: 'Spring', months: [3, 4] },
    { name: 'Summer', months: [5, 6, 7] },
    { name: 'Autumn', months: [8, 9, 10] },
    { name: 'Deep Winter', months: [11, 12] },
  ],
};

export const GREGORIAN: CalendarDefinition = {
  id: 'gregorian',
  name: 'Gregorian',
  months: [
    { name: 'January', days: 31 },
    { name: 'February', days: 28 },
    { name: 'March', days: 31 },
    { name: 'April', days: 30 },
    { name: 'May', days: 31 },
    { name: 'June', days: 30 },
    { name: 'July', days: 31 },
    { name: 'August', days: 31 },
    { name: 'September', days: 30 },
    { name: 'October', days: 31 },
    { name: 'November', days: 30 },
    { name: 'December', days: 31 },
  ],
  dayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  leapYearRule: { month: 2, addDay: true, every: 4, skip: [1900, 2100, 2200, 2300, 2500, 2600] },
  seasons: [
    { name: 'Spring', months: [3, 4, 5] },
    { name: 'Summer', months: [6, 7, 8] },
    { name: 'Autumn', months: [9, 10, 11] },
    { name: 'Winter', months: [12, 1, 2] },
  ],
};

export const EXANDRIA: CalendarDefinition = {
  id: 'exandria',
  name: 'Exandrian (Critical Role)',
  yearLabel: 'PD',
  months: [
    { name: 'Horisal', days: 30 },
    { name: 'Misuthar', days: 31 },
    { name: 'Dualahei', days: 32 },
    { name: 'Thunsheer', days: 31 },
    { name: 'Vordo', days: 28 },
    { name: 'Sunsmere', days: 30 },
    { name: 'Brussendar', days: 31 },
    { name: 'Yukai', days: 32 },
    { name: 'Quen\'pillar', days: 29 },
    { name: 'Cuersaar', days: 29 },
    { name: 'Duscar', days: 25 },
  ],
  dayNames: ['Miresen', 'Grissen', 'Whelsen', 'Conthsen', 'Folsen', 'Yulsen', 'Da\'leysen'],
  seasons: [
    { name: 'Winter', months: [11, 12, 1] },
    { name: 'Spring', months: [2, 3, 4] },
    { name: 'Summer', months: [5, 6, 7] },
    { name: 'Autumn', months: [8, 9, 10] },
  ],
};

export const EBERRON: CalendarDefinition = {
  id: 'eberron',
  name: 'Eberron (Khorvaire)',
  yearLabel: 'YK',
  months: [
    { name: 'Zarantyr', days: 28 },
    { name: 'Olarune', days: 28 },
    { name: 'Therendor', days: 28 },
    { name: 'Eyre', days: 28 },
    { name: 'Dravago', days: 28 },
    { name: 'Nymm', days: 28 },
    { name: 'Lharvion', days: 28 },
    { name: 'Barrakas', days: 28 },
    { name: 'Rhaan', days: 28 },
    { name: 'Sypheros', days: 28 },
    { name: 'Aryth', days: 28 },
    { name: 'Vult', days: 28 },
  ],
  extraDays: [
    { name: 'Sun\'s Dawn', afterMonth: 1 },
    { name: 'Aureon\'s Crown', afterMonth: 2 },
    { name: 'The Hunt', afterMonth: 4 },
    { name: 'The Revelation', afterMonth: 6 },
    { name: 'The Ascension', afterMonth: 8 },
    { name: 'The Mockery', afterMonth: 10 },
    { name: 'The Shadow', afterMonth: 12 },
  ],
  dayNames: ['Sul', 'Mol', 'Zol', 'Wir', 'Zor', 'Far', 'Sar'],
  seasons: [
    { name: 'Winter', months: [12, 1, 2] },
    { name: 'Spring', months: [3, 4, 5] },
    { name: 'Summer', months: [6, 7, 8] },
    { name: 'Autumn', months: [9, 10, 11] },
  ],
};

export const GREYHAWK: CalendarDefinition = {
  id: 'greyhawk',
  name: 'Greyhawk (Oerth)',
  yearLabel: 'CY',
  months: [
    { name: 'Needfest', days: 7 },
    { name: 'Fireseek', days: 28 },
    { name: 'Readying', days: 28 },
    { name: 'Coldeven', days: 28 },
    { name: 'Growfest', days: 7 },
    { name: 'Planting', days: 28 },
    { name: 'Flocktime', days: 28 },
    { name: 'Wealsun', days: 28 },
    { name: 'Richfest', days: 7 },
    { name: 'Reaping', days: 28 },
    { name: 'Goodmonth', days: 28 },
    { name: 'Harvester', days: 28 },
    { name: 'Brewfest', days: 7 },
    { name: 'Patchwall', days: 28 },
    { name: 'Readying', days: 28 },
    { name: 'Sunsebb', days: 28 },
  ],
  dayNames: ['Starday', 'Sunday', 'Moonday', 'Godsday', 'Waterday', 'Woodday', 'Clayday'],
};

export const DRAGONLANCE: CalendarDefinition = {
  id: 'dragonlance',
  name: 'Dragonlance (Krynn)',
  yearLabel: 'AC',
  months: [
    { name: 'New Year Tide', days: 30 },
    { name: 'Deep Green', days: 30 },
    { name: 'Snow Bloom', days: 30 },
    { name: 'Bright Sun', days: 30 },
    { name: 'Bloomtide', days: 30 },
    { name: 'High Sun', days: 30 },
    { name: 'Sun Return', days: 30 },
    { name: 'Dark Watch', days: 30 },
    { name: 'Low Sun', days: 30 },
    { name: 'Leaves Fall', days: 30 },
    { name: 'First Ice', days: 30 },
    { name: 'Deep Cold', days: 30 },
  ],
  extraDays: [
    { name: 'Yule', afterMonth: 12 },
  ],
  dayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

export const DARK_SUN: CalendarDefinition = {
  id: 'darksun',
  name: 'Dark Sun (Athas)',
  yearLabel: 'K',
  months: [
    { name: 'Urik', days: 25 },
    { name: 'Raam', days: 25 },
    { name: 'Gulg', days: 25 },
    { name: 'Draaj', days: 25 },
    { name: 'Balic', days: 25 },
    { name: 'Tyr', days: 25 },
    { name: 'Nibenay', days: 25 },
    { name: 'Kled', days: 25 },
    { name: 'Yaramuke', days: 25 },
    { name: 'Giustenal', days: 25 },
    { name: 'Bodach', days: 25 },
    { name: 'Ogo', days: 25 },
    { name: 'Kalith', days: 25 },
    { name: 'Eryth', days: 25 },
    { name: 'Rkard', days: 25 },
  ],
  dayNames: ['Waterday', 'Earthday', 'Fireday', 'Airday', 'Voidday'],
};

export const GOLARION: CalendarDefinition = {
  id: 'golarion',
  name: 'Golarion (Pathfinder)',
  yearLabel: 'AR',
  months: [
    { name: 'Abadius', days: 31 },
    { name: 'Calistril', days: 28 },
    { name: 'Pharast', days: 31 },
    { name: 'Gozran', days: 30 },
    { name: 'Desnus', days: 31 },
    { name: 'Sarenith', days: 30 },
    { name: 'Erastus', days: 31 },
    { name: 'Arodus', days: 31 },
    { name: 'Rova', days: 30 },
    { name: 'Lamashan', days: 31 },
    { name: 'Neth', days: 30 },
    { name: 'Kuthona', days: 31 },
  ],
  dayNames: ['Moonday', 'Toilday', 'Wealday', 'Oathday', 'Fireday', 'Starday', 'Sunday'],
};

export const MIDDLE_EARTH: CalendarDefinition = {
  id: 'middleearth',
  name: 'Middle-earth (Shire Reckoning)',
  yearLabel: 'SR',
  months: [
    { name: 'Afteryule', days: 30 },
    { name: 'Solmath', days: 30 },
    { name: 'Rethe', days: 30 },
    { name: 'Astron', days: 30 },
    { name: 'Thrimidge', days: 30 },
    { name: 'Forelithe', days: 30 },
    { name: 'Afterlithe', days: 30 },
    { name: 'Wedmath', days: 30 },
    { name: 'Halimath', days: 30 },
    { name: 'Winterfilth', days: 30 },
    { name: 'Blotmath', days: 30 },
    { name: 'Foreyule', days: 30 },
  ],
  extraDays: [
    { name: 'Yule 1', afterMonth: 12 },
    { name: 'Yule 2', afterMonth: 1 },
    { name: 'Midyear\'s Day', afterMonth: 6 },
    { name: 'Midyear\'s Overlithe', afterMonth: 6 },
    { name: 'Lithedays', afterMonth: 6 },
  ],
  dayNames: ['Sterday', 'Sunday', 'Monday', 'Trewsday', 'Hevensday', 'Mersday', 'Highday'],
};

export const CALENDARS: Record<string, CalendarDefinition> = {
  harptos: HARPTOS,
  gregorian: GREGORIAN,
  exandria: EXANDRIA,
  eberron: EBERRON,
  greyhawk: GREYHAWK,
  dragonlance: DRAGONLANCE,
  darksun: DARK_SUN,
  golarion: GOLARION,
  middleearth: MIDDLE_EARTH,
};

export function getCalendarDef(id: string): CalendarDefinition {
  return CALENDARS[id] || HARPTOS;
}

export function listCalendars(): { id: string; name: string }[] {
  return Object.values(CALENDARS).map(c => ({ id: c.id, name: c.name }));
}

export function getSeason(def: CalendarDefinition, month: number): string | undefined {
  if (!def.seasons) return undefined;
  for (const s of def.seasons) {
    if (s.months.includes(month)) return s.name;
  }
  return undefined;
}

export function isLeapYear(def: CalendarDefinition, year: number): boolean {
  if (!def.leapYearRule) return false;
  const { every, skip = [] } = def.leapYearRule;
  if (skip.includes(year)) return false;
  return year % every === 0;
}

export function getDaysInMonth(def: CalendarDefinition, month: number, year?: number): number {
  const m = def.months[month];
  if (!m) return 0;
  let days = m.days;
  if (def.extraDays) {
    days += def.extraDays.filter(e => e.afterMonth === month + 1).length;
  }
  if (year !== undefined && def.leapYearRule && def.leapYearRule.month === month + 1) {
    if (isLeapYear(def, year)) days++;
  }
  return days;
}

export function getTotalDaysInYear(def: CalendarDefinition, year?: number): number {
  let total = def.months.reduce((sum, m) => sum + m.days, 0) + (def.extraDays?.length || 0);
  if (year !== undefined && def.leapYearRule && isLeapYear(def, year)) total++;
  return total;
}

export function getMonthDays(def: CalendarDefinition, month: number, year?: number): { day: number; name: string; isExtra: boolean }[] {
  const base = def.months[month];
  if (!base) return [];
  const totalDays = getDaysInMonth(def, month, year);
  const baseDays = base.days + (def.leapYearRule && def.leapYearRule.month === month + 1 && year !== undefined && isLeapYear(def, year) ? 1 : 0);
  const result: { day: number; name: string; isExtra: boolean }[] = [];
  for (let d = 1; d <= baseDays; d++) {
    result.push({ day: d, name: `${base.name} ${d}`, isExtra: false });
  }
  if (def.extraDays) {
    for (const ed of def.extraDays) {
      if (ed.afterMonth === month + 1) {
        result.push({ day: base.days + 1, name: ed.name, isExtra: true });
      }
    }
  }
  return result;
}

export function loadCalendarState(): CalendarState {
  try {
    const raw = localStorage.getItem(sk(STORAGE_CONFIG));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { definitionId: 'harptos', currentYear: 1495, currentMonth: 0, currentDay: 1 };
}

export function saveCalendarState(state: CalendarState): void {
  localStorage.setItem(sk(STORAGE_CONFIG), JSON.stringify(state));
}

export function advanceDate(state: CalendarState, days: number): CalendarState {
  const def = getCalendarDef(state.definitionId);
  let { currentYear, currentMonth, currentDay } = state;
  let remaining = days;
  while (remaining > 0) {
    const daysInMonth = getDaysInMonth(def, currentMonth, currentYear);
    const canAdvance = daysInMonth - currentDay + 1;
    if (remaining >= canAdvance) {
      remaining -= canAdvance;
      currentDay = 1;
      currentMonth++;
      if (currentMonth >= def.months.length) {
        currentMonth = 0;
        currentYear++;
      }
    } else {
      currentDay += remaining;
      remaining = 0;
    }
  }
  return { ...state, currentYear, currentMonth, currentDay };
}

export function dateString(state: CalendarState): string {
  const def = getCalendarDef(state.definitionId);
  const month = def.months[state.currentMonth];
  const label = def.yearLabel ? `${state.currentYear} ${def.yearLabel}` : `${state.currentYear}`;
  if (month) return `${month.name} ${state.currentDay}, ${label}`;
  return `${state.currentMonth + 1}/${state.currentDay}/${state.currentYear}`;
}

export function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(sk(STORAGE_EVENTS));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveEvents(events: CalendarEvent[]): void {
  localStorage.setItem(sk(STORAGE_EVENTS), JSON.stringify(events));
}

export function addEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
  const events = loadEvents();
  const newEvent: CalendarEvent = { ...event, id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}` };
  events.push(newEvent);
  saveEvents(events);
  return newEvent;
}

export function deleteEvent(id: string): void {
  const events = loadEvents().filter(e => e.id !== id);
  saveEvents(events);
}

export function getEventsForDate(state: CalendarState, month?: number, day?: number): CalendarEvent[] {
  const events = loadEvents();
  return events.filter(e =>
    e.year === state.currentYear &&
    (month === undefined || e.month === month) &&
    (day === undefined || e.day === day)
  );
}
