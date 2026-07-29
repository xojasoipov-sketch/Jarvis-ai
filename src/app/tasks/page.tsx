"use client";
import { useState } from "react";

type Task = {
  id: number;
  title: string;
  desc: string;
  status: "todo" | "progress" | "done";
  priority: "high" | "medium" | "low";
  agent?: string;
  date: string;
};

const INIT_TASKS: Task[] = [
  { id: 1, title: "Pari AI marketing strategiyasi", desc: "Q3 uchun to'liq marketing rejasini tuzish", status: "progress", priority: "high", agent: "Marketing Agent", date: "2026-07-29" },
  { id: 2, title: "Raqobatchilar tahlili", desc: "Top 5 raqobatchi mahsulotlarini o'rganish", status: "todo", priority: "high", agent: "Research Agent", date: "2026-07-30" },
  { id: 3, title: "API dokumentatsiyasi", desc: "REST API uchun to'liq docs yozish", status: "todo", priority: "medium", agent: "Coding Agent", date: "2026-07-31" },
  { id: 4, title: "MVP taqdimot", desc: "Investor uchun pitch deck tayyorlash", status: "done", priority: "high", agent: "CEO Agent", date: "2026-07-28" },
  { id: 5, title: "Database optimizatsiya", desc: "So'rovlarni 3x tezlashtirish", status: "progress", priority: "medium", agent: "DevOps Agent", date: "2026-07-29" },
];

const PRIORITY_COLORS = { high: "text-red-600 bg-red-50", medium: "text-yellow-600 bg-yellow-50", low: "text-green-600 bg-green-50" };
const STATUS_LABELS = { todo: "Kutmoqda", progress: "Jarayonda", done: "Bajarildi" };
const STATUS_COLORS = { todo: "bg-gray-100 text-gray-600", progress: "bg-blue-100 text-blue-600", done: "bg-green-100 text-green-600" };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(INIT_TASKS);
  const [filter, setFilter] = useState<"all" | Task["status"]>("all");
  const [showNew, setShowNew] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", desc: "", priority: "medium" as Task["priority"] });

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  function addTask() {
    if (!newTask.title.trim()) return;
    setTasks(prev => [...prev, {
      id: Date.now(), title: newTask.title, desc: newTask.desc,
      status: "todo", priority: newTask.priority, date: new Date().toISOString().slice(0, 10)
    }]);
    setNewTask({ title: "", desc: "", priority: "medium" });
    setShowNew(false);
  }

  function moveTask(id: number, status: Task["status"]) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }

  function deleteTask(id: number) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const counts = { all: tasks.length, todo: tasks.filter(t => t.status === "todo").length, progress: tasks.filter(t => t.status === "progress").length, done: tasks.filter(t => t.status === "done").length };

  return (
    <div className="fade-in max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Barcha vazifalar va ularning holati</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all">
          <span>+</span> Yangi vazifa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {(["all", "todo", "progress", "done"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${filter === s ? "border-indigo-500 bg-indigo-50" : "border-gray-100 bg-white hover:border-gray-200"}`}>
            <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s === "all" ? "Hammasi" : STATUS_LABELS[s]}</p>
          </button>
        ))}
      </div>

      {/* New task form */}
      {showNew && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Yangi vazifa</p>
          <input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
            placeholder="Vazifa nomi..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <textarea value={newTask.desc} onChange={e => setNewTask(p => ({ ...p, desc: e.target.value }))}
            placeholder="Tavsif (ixtiyoriy)..." rows={2}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <div className="flex items-center gap-3">
            <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as Task["priority"] }))}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none">
              <option value="high">Yuqori ustuvorlik</option>
              <option value="medium">O'rta ustuvorlik</option>
              <option value="low">Past ustuvorlik</option>
            </select>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Bekor</button>
              <button onClick={addTask} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all">Qo'shish</button>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map(task => (
          <div key={task.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4 hover:border-gray-200 transition-all">
            <button onClick={() => moveTask(task.id, task.status === "done" ? "todo" : "done")}
              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${task.status === "done" ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-indigo-400"}`}>
              {task.status === "done" && <span className="text-white text-xs flex items-center justify-center w-full h-full">✓</span>}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-medium text-gray-900 ${task.status === "done" ? "line-through text-gray-400" : ""}`}>{task.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
              </div>
              {task.desc && <p className="text-xs text-gray-500 mt-1">{task.desc}</p>}
              <div className="flex items-center gap-3 mt-2">
                {task.agent && <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">🤖 {task.agent}</span>}
                <span className="text-xs text-gray-400">{task.date}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {task.status !== "progress" && task.status !== "done" && (
                <button onClick={() => moveTask(task.id, "progress")} className="p-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-all">▶</button>
              )}
              {task.status === "progress" && (
                <button onClick={() => moveTask(task.id, "done")} className="p-1.5 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-all">✓</button>
              )}
              <button onClick={() => deleteTask(task.id)} className="p-1.5 text-xs text-red-400 hover:bg-red-50 rounded-lg transition-all">✕</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-sm">Vazifalar yo'q</p>
          </div>
        )}
      </div>
    </div>
  );
}
