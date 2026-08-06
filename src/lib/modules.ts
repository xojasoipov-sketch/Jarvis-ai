/**
 * Pari AI — Business Factory OS
 * Central module registry.
 * Architecture patterns only (not copies): ERPNext, Odoo, n8n, Twenty, Plane,
 * Chatwoot, AppFlowy, AFFiNE, Flowise, OpenHands, Medusa, Metabase, Supabase, Cal.com
 * Full map: docs/BUSINESS_OS_SOURCES.md
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Brain,
  Bot,
  Users,
  UserCircle,
  ShoppingCart,
  Store,
  Zap,
  GitBranch,
  Radio,
  Clapperboard,
  BookOpen,
  BarChart3,
  Wallet,
  Calendar,
  Bell,
  UsersRound,
  Settings,
  Plug,
  Code2,
  MessageSquare,
  History,
  Sparkles,
  Briefcase,
  CheckSquare,
  FolderKanban,
  ShieldCheck,
  ScrollText,
  Wrench,
  Database,
  FolderOpen,
  Flame,
} from "lucide-react";

export type ModuleId =
  | "dashboard"
  | "ai_brain"
  | "ai_employees"
  | "crm"
  | "client_portal"
  | "orders"
  | "marketplace"
  | "automation"
  | "workflow_builder"
  | "content_factory"
  | "media_studio"
  | "knowledge_hub"
  | "analytics"
  | "finance"
  | "calendar"
  | "personal"
  | "notifications"
  | "team"
  | "settings"
  | "integrations"
  | "api_center";

export type ModuleDef = {
  id: ModuleId;
  name: string;
  nameUz: string;
  description: string;
  href: string;
  icon: LucideIcon;
  group: "core" | "business" | "create" | "ops" | "system";
  permission: string;
  routes?: { label: string; href: string; icon?: LucideIcon }[];
  aiConnected: boolean;
  /** OSS pattern reference (docs only) */
  inspiredBy?: string[];
  /** Phase A|B|C */
  phase?: "A" | "B" | "C";
};

export const MODULES: ModuleDef[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    nameUz: "Boshqaruv paneli",
    description: "Command center — KPIs, AI recommendations, system health",
    href: "/",
    icon: LayoutDashboard,
    group: "core",
    permission: "dashboard:read",
    aiConnected: true,
    inspiredBy: ["Metabase", "ERPNext"],
    phase: "A",
  },
  {
    id: "ai_brain",
    name: "AI Brain",
    nameUz: "AI Miya",
    description: "Central intelligence — chat, skills, tools, memory",
    href: "/chat",
    icon: Brain,
    group: "core",
    permission: "ai:use",
    aiConnected: true,
    inspiredBy: ["OpenHands", "Flowise", "LibreChat"],
    phase: "A",
    routes: [
      { label: "Chat", href: "/chat", icon: MessageSquare },
      { label: "History", href: "/history", icon: History },
      { label: "Pari Graph", href: "/pari", icon: Sparkles },
      { label: "Skill Tree", href: "/skilltree", icon: Brain },
    ],
  },
  {
    id: "ai_employees",
    name: "AI Employees",
    nameUz: "AI Xodimlar",
    description: "Specialized agents — digital team",
    href: "/agents",
    icon: Bot,
    group: "core",
    permission: "agents:manage",
    aiConnected: true,
    inspiredBy: ["CrewAI", "AutoGen", "OpenHands"],
    phase: "A",
    routes: [
      { label: "Agents", href: "/agents", icon: Bot },
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Sessions", href: "/sessions", icon: History },
    ],
  },
  {
    id: "crm",
    name: "Business CRM",
    nameUz: "CRM",
    description: "Clients, pipeline, relationships",
    href: "/clients",
    icon: Users,
    group: "business",
    permission: "crm:manage",
    aiConnected: true,
    inspiredBy: ["Twenty", "EspoCRM"],
    phase: "B",
    routes: [
      { label: "Clients", href: "/clients", icon: Users },
      { label: "Services", href: "/services", icon: Briefcase },
    ],
  },
  {
    id: "client_portal",
    name: "Client Portal",
    nameUz: "Mijoz portali",
    description: "External status, invoices, requests",
    href: "/clients",
    icon: UserCircle,
    group: "business",
    permission: "portal:read",
    aiConnected: true,
    inspiredBy: ["Odoo", "ERPNext"],
    phase: "C",
  },
  {
    id: "orders",
    name: "Orders",
    nameUz: "Buyurtmalar",
    description: "Order lifecycle and fulfillment",
    href: "/orders",
    icon: ShoppingCart,
    group: "business",
    permission: "orders:manage",
    aiConnected: true,
    inspiredBy: ["Medusa", "ERPNext"],
    phase: "C",
  },
  {
    id: "marketplace",
    name: "Services Marketplace",
    nameUz: "Marketplace",
    description: "Sellable services and packages",
    href: "/marketplace",
    icon: Store,
    group: "business",
    permission: "marketplace:manage",
    aiConnected: true,
    inspiredBy: ["Medusa", "Saleor"],
    phase: "B",
  },
  {
    id: "automation",
    name: "Automation Center",
    nameUz: "Avtomatlashtirish",
    description: "Triggers, schedules, bots",
    href: "/automation",
    icon: Zap,
    group: "ops",
    permission: "automation:manage",
    aiConnected: true,
    inspiredBy: ["n8n", "Activepieces"],
    phase: "B",
  },
  {
    id: "workflow_builder",
    name: "Workflow Builder",
    nameUz: "Workflow",
    description: "Multi-step workflows",
    href: "/automation",
    icon: GitBranch,
    group: "ops",
    permission: "workflows:manage",
    aiConnected: true,
    inspiredBy: ["n8n", "Langflow"],
    phase: "C",
  },
  {
    id: "content_factory",
    name: "Content Factory",
    nameUz: "Kontent fabrika",
    description: "SMM, posts, campaigns",
    href: "/smm",
    icon: Radio,
    group: "create",
    permission: "content:manage",
    aiConnected: true,
    phase: "A",
    routes: [
      { label: "SMM", href: "/smm", icon: Radio },
      { label: "Business Ideas", href: "/business", icon: Briefcase },
    ],
  },
  {
    id: "media_studio",
    name: "Media Studio",
    nameUz: "Media studio",
    description: "Assets, clips, creative pipeline",
    href: "/media",
    icon: Clapperboard,
    group: "create",
    permission: "media:manage",
    aiConnected: true,
    phase: "B",
  },
  {
    id: "knowledge_hub",
    name: "Knowledge Hub",
    nameUz: "Bilim markazi",
    description: "Docs, vault, RAG memory",
    href: "/knowledge",
    icon: BookOpen,
    group: "ops",
    permission: "knowledge:manage",
    aiConnected: true,
    inspiredBy: ["AppFlowy", "AFFiNE", "Mem0"],
    phase: "A",
    routes: [
      { label: "Knowledge", href: "/knowledge", icon: BookOpen },
      { label: "Files", href: "/files", icon: FolderOpen },
    ],
  },
  {
    id: "analytics",
    name: "Analytics",
    nameUz: "Analitika",
    description: "Metrics, funnels, AI insights",
    href: "/analytics",
    icon: BarChart3,
    group: "ops",
    permission: "analytics:read",
    aiConnected: true,
    inspiredBy: ["Metabase", "PostHog"],
    phase: "B",
  },
  {
    id: "finance",
    name: "Finance",
    nameUz: "Moliya",
    description: "Billing, invoices, revenue",
    href: "/billing",
    icon: Wallet,
    group: "business",
    permission: "finance:manage",
    aiConnected: true,
    inspiredBy: ["Invoice Ninja", "Lago"],
    phase: "C",
  },
  {
    id: "calendar",
    name: "Calendar",
    nameUz: "Kalendar",
    description: "Scheduling and bookings",
    href: "/calendar",
    icon: Calendar,
    group: "ops",
    permission: "calendar:manage",
    aiConnected: true,
    inspiredBy: ["Cal.com"],
    phase: "C",
  },
  {
    id: "personal",
    name: "Personal Assistant",
    nameUz: "Shaxsiy yordamchi",
    description: "Long-term memory, habits, and reminders",
    href: "/personal",
    icon: Flame,
    group: "core",
    permission: "personal:manage",
    aiConnected: true,
    phase: "A",
  },
  {
    id: "notifications",
    name: "Notifications",
    nameUz: "Bildirishnomalar",
    description: "Smart alerts and digests",
    href: "/",
    icon: Bell,
    group: "ops",
    permission: "notifications:read",
    aiConnected: true,
    phase: "B",
  },
  {
    id: "team",
    name: "Team Workspace",
    nameUz: "Jamoa",
    description: "Members, roles, collaboration",
    href: "/settings",
    icon: UsersRound,
    group: "system",
    permission: "team:manage",
    aiConnected: false,
    phase: "C",
  },
  {
    id: "settings",
    name: "Settings",
    nameUz: "Sozlamalar",
    description: "Workspace, security, preferences",
    href: "/settings",
    icon: Settings,
    group: "system",
    permission: "settings:manage",
    aiConnected: false,
    phase: "A",
    routes: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Security", href: "/security", icon: ShieldCheck },
      { label: "Logs", href: "/logs", icon: ScrollText },
      { label: "DevTools", href: "/devtools", icon: Wrench },
    ],
  },
  {
    id: "integrations",
    name: "Integrations",
    nameUz: "Integratsiyalar",
    description: "Connectors, MCP, third-party APIs",
    href: "/apis",
    icon: Plug,
    group: "system",
    permission: "integrations:manage",
    aiConnected: true,
    inspiredBy: ["n8n", "Activepieces"],
    phase: "B",
    routes: [
      { label: "APIs / Connectors", href: "/apis", icon: Plug },
      { label: "Databases", href: "/databases", icon: Database },
    ],
  },
  {
    id: "api_center",
    name: "API Center",
    nameUz: "API markaz",
    description: "Keys, webhooks, developer console",
    href: "/apis",
    icon: Code2,
    group: "system",
    permission: "api:manage",
    aiConnected: true,
    phase: "B",
  },
];

export const MODULE_GROUPS: {
  id: ModuleDef["group"];
  label: string;
  labelUz: string;
}[] = [
  { id: "core", label: "Core", labelUz: "Asos" },
  { id: "business", label: "Business", labelUz: "Biznes" },
  { id: "create", label: "Create", labelUz: "Yaratish" },
  { id: "ops", label: "Operations", labelUz: "Operatsiyalar" },
  { id: "system", label: "System", labelUz: "Tizim" },
];

export function getCommandItems() {
  const items: { id: string; label: string; href: string; group: string; keywords: string }[] = [];
  for (const m of MODULES) {
    items.push({
      id: m.id,
      label: m.name,
      href: m.href,
      group: m.group,
      keywords: `${m.name} ${m.nameUz} ${m.description}`.toLowerCase(),
    });
    for (const r of m.routes || []) {
      items.push({
        id: `${m.id}:${r.href}`,
        label: r.label,
        href: r.href,
        group: m.group,
        keywords: `${r.label} ${m.name} ${m.nameUz}`.toLowerCase(),
      });
    }
  }
  return items;
}

export function getModule(id: ModuleId) {
  return MODULES.find((m) => m.id === id);
}

export function modulesByPhase(phase: "A" | "B" | "C") {
  return MODULES.filter((m) => m.phase === phase);
}
