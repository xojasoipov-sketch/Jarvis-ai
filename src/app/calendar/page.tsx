"use client";
import { useState } from "react";
import { Plus, Clock, X } from "lucide-react";

type Event = { id: number; title: string; time: string; type: "meeting" | "task" | "reminder" | "agent"; color: string; day: number };

const COLORS = { meeting: "bg-blue-500", task: "bg-indigo-600", reminder: "bg-yellow-500", agent: "bg-purple-500" };
const TYPE_LABELS = { meeting: "Uchrashuv", task: "Vazifa", reminder: "Eslatma", agent: "Agent vazifa" };

const TODAY = new Date();
const MONTH_NAMES = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
const DAY_NAMES = ["Du","Se","Ch","Pa","Ju","Sh","Ya"];

const INIT_EVENTS: Event[] = [
  { id: 1, title: "Investor meeting", time: "10:00", type: "meeting", color: COLORS.meeting, day: TODAY.getDate() },
  { id: 2, title: "Pari AI MVP taqdimot", time: "14:00", type: "task", color: COLORS.task, day: TODAY.getDate() },
  { id: 3, title: "CEO Agent: haftalik hisobot", time: "09:00", type: "agent", color: COLORS.agent, day: TODAY.getDate() + 1 },
  { id: 4, title: "Team sync", time: "11:30", type: "meeting", color: COLORS.meeting, day: TODAY.getDate() + 2 },
  { id: 5, title: "Marketing kampaniya boshlash", time: "08:00", type: "reminder", color: COLORS.reminder, day: TODAY.getDate() + 3 },
];

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>(INIT_EVENTS);
  const [selectedDay, setSelectedDay] = useState(TODAY.getDate());
  const [showNew, setShowNew] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", time: "09:00", type: "task" as Event["type"] });

  const year = TODAY.getFullYear();
  const month = TODAY.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const dayEvents = events.filter(e => e.day === selectedDay).sort((a, b) => a.time.localeCompare(b.time));

  function addEvent() {
    if (!newEvent.title.trim()) return;
    setEvents(p => [...p, { id: Date.now(), ...newEvent, color: COLORS[newEvent.type], day: selectedDay }]);
    setNewEvent({ title: "", time: "09:00", type: "task" });
    setShowNew(false);
  }

  return (
    <div className="fade-in max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">{MONTH_NAMES[month]} {year}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all">
          <Plus size={15} strokeWidth={2} /> Yangi voqea
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Calendar grid */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {/* Day names */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-xs text-gray-400 font-medium text-center py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array(offset).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              const isToday = day === TODAY.getDate();
              const isSelected = day === selectedDay;
              const hasEvents = events.some(e => e.day === day);
              return (
                <button key={day} onClick={() => setSelectedDay(day)}
                  className={`relative aspect-square rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5
                    ${isSelected ? "bg-indigo-600 text-white" : isToday ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-50 text-gray-700"}`}>
                  {day}
                  {hasEvents && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-indigo-600"}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${COLORS[type as Event["type"]]}`} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day events */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {selectedDay === TODAY.getDate() ? "Bugun" : `${selectedDay}-${MONTH_NAMES[month].slice(0, 3)}`}
            </p>
            <p className="text-xs text-gray-500">{dayEvents.length} ta voqea</p>
          </div>

          {showNew && (
            <div className="bg-white rounded-2xl border border-indigo-200 p-4 space-y-2">
              <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                placeholder="Voqea nomi..." className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              <div className="flex gap-2">
                <input type="time" value={newEvent.time} onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                <select value={newEvent.type} onChange={e => setNewEvent(p => ({ ...p, type: e.target.value as Event["type"] }))}
                  className="flex-1 px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Bekor</button>
                <button onClick={addEvent} className="flex-1 py-2 bg-indigo-600 text-white text-xs rounded-lg">Qo'shish</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {dayEvents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                <p className="text-gray-400 text-sm">Voqealar yo'q</p>
              </div>
            ) : (
              dayEvents.map(ev => (
                <div key={ev.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                  <div className={`w-1 h-10 rounded-full ${ev.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={11} strokeWidth={1.75} /> {ev.time}</span>
                      <span className="text-xs text-gray-400">{TYPE_LABELS[ev.type]}</span>
                    </div>
                  </div>
                  <button onClick={() => setEvents(p => p.filter(e => e.id !== ev.id))}
                    className="p-1 text-gray-300 hover:text-red-400 transition-all"><X size={13} strokeWidth={1.75} /></button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
