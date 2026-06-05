'use client';
import { useState, useEffect } from 'react';
import {
  CalendarState, CalendarEvent,
  getCalendarDef, getMonthDays, dateString,
  loadCalendarState, saveCalendarState, advanceDate,
  loadEvents, addEvent, deleteEvent, getEventsForDate,
  listCalendars, getSeason, isLeapYear,
} from '../../../utils/calendarEngine';

const styles = {
  page: { padding: '2rem', color: '#e8dcc8', fontFamily: '"MedievalSharp", "Palatino Linotype", "Book Antiqua", Palatino, serif', maxWidth: '1000px', margin: '0 auto' } as const,
  header: { fontSize: '2rem', color: '#c9a84c', marginBottom: '4px' } as const,
  sub: { color: '#8a7e6a', fontSize: '0.85rem', marginBottom: '1.5rem' } as const,
  nav: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' } as const,
  navBtn: {
    padding: '6px 14px', background: '#3d3528', border: 'none', color: '#e8dcc8',
    borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
  } as const,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' } as const,
  dayHeader: { textAlign: 'center', fontSize: '0.65rem', color: '#5a5248', padding: '4px' } as const,
  dayCell: (isToday: boolean, isExtra: boolean): React.CSSProperties => ({
    padding: '6px', background: isToday ? '#c9a84c' : isExtra ? 'rgba(246,224,94,0.1)' : '#1a1714',
    borderRadius: '4px', minHeight: '50px', cursor: 'pointer', fontSize: '0.75rem',
    border: isToday ? '2px solid #c9a84c' : '1px solid #3d3528', position: 'relative' as const,
  }),
  dayNum: (isExtra: boolean): React.CSSProperties => ({
    fontSize: '0.7rem', fontWeight: 'bold', color: isExtra ? '#c9a84c' : 'white', marginBottom: '2px',
  }),
  eventDot: { width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block', marginRight: '2px' } as const,
  eventTypeColor: (t: string): string => {
    switch (t) {
      case 'session': return '#16a34a';
      case 'quest': return '#c9a84c';
      case 'lore': return '#8a7e6a';
      case 'note': return '#8a7e6a';
      default: return '#5a5248';
    }
  },
  panel: {
    background: '#0c0e14', border: '1px solid #3d3528', borderRadius: '8px', padding: '1rem',
  } as const,
  input: {
    width: '100%', padding: '8px', background: '#1a1714', border: '1px solid #3d3528',
    borderRadius: '4px', color: '#e8dcc8', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const,
  },
};

const TYPE_OPTIONS: { value: CalendarEvent['type']; label: string }[] = [
  { value: 'session', label: 'Session' },
  { value: 'quest', label: 'Quest' },
  { value: 'lore', label: 'Lore' },
  { value: 'note', label: 'Note' },
];

export default function CalendarPage() {
  const [calState, setCalState] = useState<CalendarState>(() => loadCalendarState());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<CalendarEvent['type']>('note');
  const [selectedDay, setSelectedDay] = useState<{ month: number; day: number } | null>(null);

  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  const def = getCalendarDef(calState.definitionId);
  const days = getMonthDays(def, calState.currentMonth);
  const firstDayOfWeek = 0;
  const blanks = Array(firstDayOfWeek).fill(null);
  const allEvents = events.filter(e => e.year === calState.currentYear && e.month === calState.currentMonth);

  const setAndSave = (update: Partial<CalendarState>) => {
    const next = { ...calState, ...update };
    setCalState(next);
    saveCalendarState(next);
  };

  const handleAdvance = (days: number) => {
    setAndSave(advanceDate(calState, days));
  };

  const handleAddEvent = () => {
    if (!newTitle.trim() || !selectedDay) return;
    addEvent({ year: calState.currentYear, month: selectedDay.month, day: selectedDay.day, title: newTitle.trim(), description: newDesc.trim(), type: newType });
    setEvents(loadEvents());
    setNewTitle('');
    setNewDesc('');
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent(id);
    setEvents(loadEvents());
  };

  const today = calState.currentDay;

  return (
    <div style={styles.page}>
      <h1 style={styles.header}>World Calendar</h1>
      <p style={styles.sub}>{dateString(calState)}</p>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 650px' }}>
          <div style={styles.panel}>
            <div style={styles.nav}>
              <select value={calState.definitionId} onChange={e => setAndSave({ definitionId: e.target.value, currentMonth: 0, currentDay: 1 })}
                style={{ background: '#1a1714', color: '#e8dcc8', border: '1px solid #3d3528', borderRadius: '4px', padding: '6px 10px', fontSize: '0.8rem' }}>
                {listCalendars().map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button onClick={() => handleAdvance(-1)} style={styles.navBtn}>◀ Prev Day</button>
              <button onClick={() => handleAdvance(1)} style={styles.navBtn}>Next Day ▶</button>
              <button onClick={() => handleAdvance(7)} style={styles.navBtn}>+1 Week</button>
              <button onClick={() => handleAdvance(30)} style={styles.navBtn}>+1 Month</button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: '0.8rem', color: '#c9a84c', fontWeight: 'bold' }}>
                {def.months[calState.currentMonth]?.name || '?'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <button onClick={() => {
                const prevMonth = calState.currentMonth - 1;
                if (prevMonth < 0) setAndSave({ currentMonth: def.months.length - 1, currentYear: calState.currentYear - 1, currentDay: 1 });
                else setAndSave({ currentMonth: prevMonth, currentDay: 1 });
              }} style={{ ...styles.navBtn, padding: '4px 10px', fontSize: '0.7rem' }}>◀</button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#e8dcc8' }}>
                  {def.months[calState.currentMonth]?.name} {calState.currentYear}
                </span>
                {getSeason(def, calState.currentMonth + 1) && (
                  <span style={{ fontSize: '0.65rem', color: '#16a34a', marginLeft: '8px', display: 'inline-block' }}>
                    {getSeason(def, calState.currentMonth + 1)}
                    {isLeapYear(def, calState.currentYear) && <span style={{ color: '#c9a84c', marginLeft: '4px' }}>· Leap Year</span>}
                  </span>
                )}
              </div>
              <button onClick={() => {
                const nextMonth = calState.currentMonth + 1;
                if (nextMonth >= def.months.length) setAndSave({ currentMonth: 0, currentYear: calState.currentYear + 1, currentDay: 1 });
                else setAndSave({ currentMonth: nextMonth, currentDay: 1 });
              }} style={{ ...styles.navBtn, padding: '4px 10px', fontSize: '0.7rem' }}>▶</button>
            </div>

            <div style={styles.grid}>
              {(def.dayNames || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map(d => (
                <div key={d} style={styles.dayHeader}>{d}</div>
              ))}
              {blanks.map((_, i) => <div key={`blank-${i}`} />)}
              {days.map((d, i) => {
                const dayEvents = allEvents.filter(e => e.day === d.day);
                const isExtra = d.isExtra;
                const isToday = d.day === today && !isExtra;
                const isSelected = selectedDay?.month === calState.currentMonth && selectedDay?.day === d.day;
                return (
                  <div key={i} style={{
                    ...styles.dayCell(isToday, isExtra),
                    border: isSelected ? '2px solid #c9a84c' : undefined,
                  }} onClick={() => setSelectedDay({ month: calState.currentMonth, day: d.day })}>
                    <div style={styles.dayNum(isExtra)}>
                      {d.day}
                      {isExtra && <span style={{ fontSize: '0.5rem', display: 'block' }}>{d.name}</span>}
                    </div>
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} style={{ fontSize: '0.55rem', color: styles.eventTypeColor(ev.type), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ ...styles.eventDot, background: styles.eventTypeColor(ev.type) }} />
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '0.5rem', color: '#5a5248' }}>+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedDay && (
            <div style={{ ...styles.panel, marginTop: '1rem' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#c9a84c' }}>
                {def.months[selectedDay.month]?.name} {selectedDay.day}
              </h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input style={{ ...styles.input, flex: 1 }} placeholder="Event title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <select value={newType} onChange={e => setNewType(e.target.value as CalendarEvent['type'])}
                  style={{ background: '#1a1714', color: '#e8dcc8', border: '1px solid #3d3528', borderRadius: '4px', padding: '6px', fontSize: '0.75rem' }}>
                  {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button onClick={handleAddEvent} disabled={!newTitle.trim()}
                  style={{ padding: '6px 14px', background: '#c9a84c', border: 'none', color: '#e8dcc8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                  Add
                </button>
              </div>
              <input style={styles.input} placeholder="Description (optional)..." value={newDesc} onChange={e => setNewDesc(e.target.value)} />

              {allEvents.filter(e => e.day === selectedDay.day).length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#5a5248', marginBottom: '4px' }}>EVENTS</div>
                  {allEvents.filter(e => e.day === selectedDay.day).map(ev => (
                    <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', background: '#1a1714', borderRadius: '4px', marginBottom: '3px', fontSize: '0.75rem' }}>
                      <div>
                        <span style={{ color: styles.eventTypeColor(ev.type), fontWeight: 'bold' }}>[{ev.type.toUpperCase()}]</span>
                        {' '}{ev.title}
                        {ev.description && <span style={{ color: '#8a7e6a' }}> — {ev.description}</span>}
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} style={{ background: 'none', border: 'none', color: '#a83232', cursor: 'pointer', fontSize: '0.7rem' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ ...styles.panel, flex: '0 0 280px', maxHeight: '400px', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#c9a84c' }}>All Events</h3>
          {events.length === 0 && <p style={{ fontSize: '0.75rem', color: '#5a5248' }}>No events logged.</p>}
          {[...events].sort((a, b) => b.year - a.year || b.month - a.month || b.day - a.day).slice(0, 50).map(ev => (
            <div key={ev.id} style={{ padding: '4px 6px', background: '#1a1714', borderRadius: '4px', marginBottom: '3px', fontSize: '0.7rem' }}>
              <div style={{ color: '#5a5248', fontSize: '0.6rem' }}>
                {def.months[ev.month]?.name || '?'} {ev.day}, {ev.year}
              </div>
              <div>
                <span style={{ color: styles.eventTypeColor(ev.type) }}>[{ev.type.toUpperCase()}]</span>
                {' '}{ev.title}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
