import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  CheckSquare, 
  BarChart3, 
  UserCircle, 
  LogOut, 
  Plus, 
  Edit,
  Search, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  MapPin,
  Utensils,
  Palmtree,
  ChevronRight,
  Bell,
  Settings,
  X,
  Trash2,
  Check,
  Pencil,
  Activity as ActivityIcon,
  Database,
  User,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { supabase } from './lib/supabase';
import { ClientBoard } from './components/ClientBoard';
import { EducazenDashboard } from './components/EducazenDashboard';
import { cn } from './lib/utils';

// --- Types ---

type Role = 'superadmin' | 'admin' | 'client';
type Page = 'dashboard' | 'guests' | 'bookings' | 'tasks' | 'revenue' | 'leads' | 'organizations' | 'users' | 'client-overview' | 'client-booking' | 'client-dining' | 'client-activities' | 'calendar';

interface Organization {
  id: string;
  name: string;
  slug: string;
  email?: string;
  password?: string;
  branding?: {
    primaryColor: string;
    logoUrl?: string;
  };
}

interface Lead {
  id: string;
  orgId: string;
  name: string;
  source: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  stage: string;
  value: number;
  date: string;
  location?: string;
  decision_maker?: string;
  email?: string;
  mobile?: string;
  pain_point?: string;
  notes?: string;
}

interface Guest {
  id: string;
  orgId: string;
  name: string;
  email: string;
  type: 'VIP' | 'Regular' | 'New';
  stays: number;
  lastVisit: string;
  spend: number;
  status: 'In-house' | 'Arriving' | 'Past';
  initials: string;
  phone?: string;
  company?: string;
  notes?: string;
}

interface Booking {
  id: string;
  orgId: string;
  ref: string;
  guestName: string;
  type: 'Stay' | 'Dining' | 'Event';
  checkIn: string;
  checkOut: string;
  amount: number;
  status: 'Active' | 'Pending' | 'Confirmed' | 'Reserved' | 'Arriving';
}

interface Task {
  id: string;
  orgId: string;
  name: string;
  department: 'Housekeeping' | 'F&B' | 'Concierge' | 'Maintenance';
  due: string;
  date: string;
  assignee: string;
  done: boolean;
  urgent?: boolean;
  notes?: string;
}

interface Activity {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetName: string;
  timestamp: string;
}

const PIPELINE_STAGES = [
  { id: 'D0', label: 'New Lead', color: 'bg-gray-100' },
  { id: 'D1', label: 'Call+Email', color: 'bg-blue-50' },
  { id: 'D2', label: 'SMS', color: 'bg-indigo-50' },
  { id: 'D3', label: 'Call+VM', color: 'bg-purple-50' },
  { id: 'D5', label: 'Insight Email', color: 'bg-pink-50' },
  { id: 'D7', label: 'Call+SMS', color: 'bg-orange-50' },
  { id: 'D10', label: 'Final Call', color: 'bg-red-50' },
  { id: 'D12', label: 'Call Back', color: 'bg-amber-50' },
  { id: 'Won', label: 'Won', color: 'bg-keppel/10' },
  { id: 'Lost', label: 'Lost', color: 'bg-coral/10' },
];

// --- Components ---

const StatCard = ({ title, value, change, trend, onClick }: { title: string, value: string, change: string, trend: 'up' | 'down' | 'neutral', onClick?: () => void }) => (
  <div className={cn("card flex flex-col justify-between transition-all duration-150", onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5")} onClick={onClick}>
    <div>
      <div className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1">{title}</div>
      <div className="text-lg sm:text-2xl font-bold text-ink leading-tight">{value}</div>
    </div>
    <div className={cn(
      "text-[10px] font-bold mt-2 px-2 py-0.5 rounded-full w-fit",
      trend === 'up' ? "bg-brand-primary/15 text-brand-primary" : trend === 'down' ? "bg-brand-secondary/15 text-brand-secondary" : "bg-amber/15 text-amber-700"
    )}>
      {change}
    </div>
  </div>
);

const Badge = ({ status }: { status?: string }) => {
  if (!status) return null;
  const lower = status.toLowerCase();
  if (lower === 'won' || lower.includes('active') || lower.includes('in-house') || lower.includes('checked in') || lower.includes('confirmed')) 
    return <span className="badge bg-brand-primary/15 text-brand-primary">{status}</span>;
  if (lower.includes('pending') || lower.includes('arriving') || lower.includes('reserved') || lower.startsWith('d12')) 
    return <span className="badge badge-amber">{status}</span>;
  if (lower === 'lost' || lower.includes('urgent') || lower.includes('overdue')) 
    return <span className="badge bg-brand-secondary/15 text-brand-secondary">{status}</span>;
  if (lower.startsWith('d'))
    return <span className="badge bg-blue-50 text-blue-600 border-blue-100">{status}</span>;
  return <span className="badge badge-gray">{status}</span>;
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-lg text-sm transition-all duration-150",
      active 
        ? "bg-brand-primary/10 text-brand-primary font-semibold" 
        : "text-gray-500 hover:bg-gray-50 hover:text-ink"
    )}
  >
    <Icon size={18} />
    <span className="truncate">{label}</span>
  </button>
);

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [role, setRole] = useState<Role>('admin');
  const [page, setPage] = useState<Page>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginType, setLoginType] = useState<'superadmin' | 'admin' | 'client'>('superadmin');
  const [loginPortal, setLoginPortal] = useState<'eiden' | 'lunja' | 'educazen' | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/lunja-village')) return 'lunja';
    if (path.startsWith('/educazenkids')) return 'educazen';
    return 'eiden'; // root → Eiden Group login
  });

  // Multi-tenancy states
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // EducaZen aggregate stats (for superadmin overview)
  const [ezStats, setEzStats] = useState({ students: 0, staff: 0, paidThisMonth: 0, unpaidCount: 0, totalRevenue: 0 });

  // Real-time data states
  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [myGuestProfile, setMyGuestProfile] = useState<Guest | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [taskFilter, setTaskFilter] = useState<'all' | 'me' | 'today' | 'urgent'>('all');

  // New Guest Form State
  const [showNewGuestForm, setShowNewGuestForm] = useState(false);
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
    type: 'New' as Guest['type'],
    status: 'Arriving' as Guest['status']
  });
  const [isSavingGuest, setIsSavingGuest] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // Lead Form State
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    source: 'Website',
    value: 0,
    stage: 'D0' as Lead['stage'],
    status: 'New' as Lead['status'],
    notes: ''
  });
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Booking Form State
  const [showNewBookingForm, setShowNewBookingForm] = useState(false);
  const [newBooking, setNewBooking] = useState({
    guestName: '',
    type: 'Stay' as Booking['type'],
    checkIn: '',
    checkOut: '',
    amount: 0,
    status: 'Pending' as Booking['status']
  });
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isSavingBooking, setIsSavingBooking] = useState(false);

  // Task Form State
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    department: 'Housekeeping' as Task['department'],
    due: '',
    assignee: '',
    urgent: false,
    notes: ''
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Organization Form State
  const [showNewOrgForm, setShowNewOrgForm] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '',
    slug: '',
    email: '',
    password: ''
  });
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Auth Listener — restore session from localStorage
  React.useEffect(() => {
    const savedUser = localStorage.getItem('eiden_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setUserRole(userData.role);
      setRole(userData.role);
      setUserOrgId(userData.orgId);
      setCurrentOrgId(userData.orgId);
      setPage(userData.role === 'client' ? 'client-overview' : 'dashboard');
    }
    setIsAuthReady(true);
  }, []);

  // Branding Effect
  React.useEffect(() => {
    const root = document.documentElement;
    const isEducazen = !!user && userOrgId === 'educazen';
    const isLunja = (role === 'client' || role === 'admin') && !!user && !isEducazen;

    if (isEducazen) {
      root.style.setProperty('--brand-primary', '#C2185B'); // EducaZen Magenta
      root.style.setProperty('--brand-secondary', '#7B1FA2'); // EducaZen Violet
      root.style.setProperty('--brand-bg', '#FFF0F5'); // Rose pastel
      root.style.setProperty('--brand-font-head', '"Nunito", sans-serif');
      root.style.setProperty('--brand-font-body', '"Quicksand", sans-serif');
    } else if (isLunja) {
      root.style.setProperty('--brand-primary', '#2BBAA5'); // Keppel
      root.style.setProperty('--brand-secondary', '#F96635'); // Coral
      root.style.setProperty('--brand-bg', '#FDF8EE'); // Cream
      root.style.setProperty('--brand-font-head', '"Pacifico", cursive');
      root.style.setProperty('--brand-font-body', '"DM Sans", sans-serif');
    } else {
      root.style.setProperty('--brand-primary', '#0C5752'); // Eiden Teal
      root.style.setProperty('--brand-secondary', '#d7bb93'); // Eiden Gold
      root.style.setProperty('--brand-bg', '#FEFDFB'); // Eiden Canvas
      root.style.setProperty('--brand-font-head', '"Outfit", sans-serif');
      root.style.setProperty('--brand-font-body', '"Inter", sans-serif');
    }
  }, [role, userOrgId, user]);

  // ── Notifications ──
  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;
    let q = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30);
    if (userRole !== 'superadmin' && userOrgId) q = q.eq('org_id', userOrgId);
    const { data } = await q;
    if (data) setNotifications(data);
  }, [user, userRole, userOrgId]);

  const createNotification = React.useCallback(async (orgId: string, title: string, message: string, type = 'info') => {
    const id = `notif-${Date.now()}`;
    await supabase.from('notifications').insert({ id, org_id: orgId, title, message, type, read: false });
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = React.useCallback(async () => {
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    fetchNotifications();
  }, [fetchNotifications]);

  React.useEffect(() => { if (user) fetchNotifications(); }, [user, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch EducaZen aggregate stats for superadmin global view
  React.useEffect(() => {
    if (userRole !== 'superadmin') return;
    (async () => {
      const [{ data: students }, { data: staff }, { data: payments }] = await Promise.all([
        supabase.from('ez_students').select('id,statut'),
        supabase.from('ez_staff').select('id'),
        supabase.from('ez_payments').select('montant,statut,date_paiement'),
      ]);
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const paidThisMonth = (payments || []).filter((p: any) => p.statut === 'payé' && p.date_paiement?.startsWith(thisMonth));
      const unpaidCount = (payments || []).filter((p: any) => p.statut === 'non_payé').length;
      const totalRevenue = (payments || []).filter((p: any) => p.statut === 'payé').reduce((acc: number, p: any) => acc + (p.montant || 0), 0);
      setEzStats({
        students: (students || []).length,
        staff: (staff || []).length,
        paidThisMonth: paidThisMonth.length,
        unpaidCount,
        totalRevenue,
      });
    })();
  }, [userRole]);

  // Centralized fetch helpers
  const fetchOrgs = React.useCallback(async () => {
    const { data } = await supabase.from('organizations').select('*');
    if (data) setOrganizations(data);
  }, []);

  // Fetch with correct column names per table
  const fetchTableData = React.useCallback(async (table: string, setter: any, orgFilter: string | null) => {
    let q = supabase.from(table).select('*');
    // clients uses org_id (snake_case), all others use orgId (camelCase quoted)
    if (orgFilter) {
      if (table === 'clients') {
        q = q.eq('org_id', orgFilter);
      } else {
        q = q.eq('orgId', orgFilter);
      }
    }
    const { data, error } = await q;
    if (error) { console.error(`Error fetching ${table}:`, error.message); return; }
    if (data) {
      if (table === 'activities') {
        setter(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } else {
        setter(data);
      }
    }
  }, []);

  const refetchAll = React.useCallback(async (orgFilter: string | null, role: string) => {
    await Promise.all([
      fetchTableData('guests', setGuests, orgFilter),
      fetchTableData('bookings', setBookings, orgFilter),
      fetchTableData('tasks', setTasks, orgFilter),
      fetchTableData('leads', setLeads, orgFilter),
      fetchTableData('activities', setActivities, orgFilter),
    ]);
    if (role === 'superadmin' || role === 'admin') {
      fetchTableData('users', setUsers, orgFilter);
    }
  }, [fetchTableData]);

  // Organizations Fetch (for SuperAdmin)
  React.useEffect(() => {
    if (userRole !== 'superadmin') return;
    fetchOrgs();
  }, [userRole, fetchOrgs]);

  // Main data fetch on login / org change
  React.useEffect(() => {
    if (!isAuthReady || !user) return;
    const orgFilter = userRole === 'superadmin' ? currentOrgId : userOrgId;
    refetchAll(orgFilter, userRole || 'admin').finally(() => setIsLoadingData(false));
  }, [isAuthReady, user, userRole, currentOrgId, userOrgId, refetchAll]);

  const revenueData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data: { [key: string]: number } = {};
    
    // Initialize last 7 months
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      data[months[d.getMonth()]] = 0;
    }

    bookings.forEach(b => {
      const date = new Date(b.checkIn);
      const month = months[date.getMonth()];
      if (data[month] !== undefined) {
        data[month] += b.amount;
      }
    });

    return Object.entries(data).map(([month, value]) => ({ month, value }));
  }, [bookings]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const doLogin = (userData: any, targetPage: Page) => {
      setUser(userData);
      setUserRole(userData.role);
      setRole(userData.role);
      setUserOrgId(userData.orgId);
      setCurrentOrgId(userData.orgId);
      setPage(targetPage);
      localStorage.setItem('eiden_user', JSON.stringify(userData));
    };

    // ── EIDEN portal (root /) — SUPERADMIN ONLY ──────────────────────
    if (loginPortal === 'eiden') {
      if (loginEmail === 'admin@eiden-group.com' && loginPassword === 'superadmin123') {
        doLogin({ uid: 'superadmin', email: loginEmail, displayName: 'Super Admin', role: 'superadmin', orgId: null }, 'dashboard');
      } else {
        // Security: any non-superadmin credentials are rejected with a clear message
        setLoginError('No Access — this portal is restricted to EIDEN Group administrators only.');
      }
      return;
    }

    // ── LUNJA VILLAGE portal (/lunja-village) — ADMIN ONLY ──────────
    if (loginPortal === 'lunja') {
      // Hardcoded fallback (always works)
      if (loginEmail === 'admin@lunja.com' && loginPassword === 'lunja123') {
        doLogin({ uid: 'lunja-admin', email: loginEmail, displayName: 'Lunja Village Admin', role: 'admin', orgId: 'lunja' }, 'dashboard');
        return;
      }
      // Also check Supabase orgs table (for custom org credentials)
      try {
        const { data } = await supabase.from('organizations').select('*').eq('email', loginEmail).eq('id', 'lunja').limit(1);
        if (data && data.length > 0 && data[0].password === loginPassword) {
          doLogin({ uid: data[0].id, email: loginEmail, displayName: `${data[0].name} Admin`, role: 'admin', orgId: 'lunja' }, 'dashboard');
          return;
        }
      } catch (err) { console.error(err); }
      setLoginError('Invalid credentials.');
      return;
    }

    // ── EDUCAZEN portal (/educazenkids) — ADMIN ONLY ─────────────────
    if (loginPortal === 'educazen') {
      if (loginEmail === 'admin@educazenkids.com' && loginPassword === 'educazen123') {
        doLogin({ uid: 'educazen-admin', email: loginEmail, displayName: 'EducaZen Admin', role: 'admin', orgId: 'educazen' }, 'dashboard');
        return;
      }
      setLoginError('Identifiants incorrects.');
      return;
    }
  };

  const logActivity = async (action: string, targetType: string, targetName: string, orgId: string) => {
    if (!user) return;
    try {
      const activityId = `act-${Date.now()}`;
      const activity: Activity = {
        id: activityId,
        orgId,
        userId: user.uid,
        userName: user.displayName || 'Unknown',
        action,
        targetType,
        targetName,
        timestamp: new Date().toISOString()
      };
      await supabase.from('activities').upsert({ id: activityId, ...activity });
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  };

  const handleLogout = async () => {
    setUser(null);
    setUserRole(null);
    setUserOrgId(null);
    setCurrentOrgId(null);
    localStorage.removeItem('eiden_user');
  };

  const seedData = async () => {
    if (!user || userRole !== 'superadmin') return;
    
    const orgs = [
      { id: 'lunja', name: 'Lunja Village', slug: 'lunja', email: 'lunja@eiden-group.com', password: 'password123' },
      { id: 'eiden', name: 'Eiden Group', slug: 'eiden', email: 'eiden@eiden-group.com', password: 'password123' },
      { id: 'educazen', name: 'EducazenKids', slug: 'educazen', email: 'admin@educazenkids.com', password: 'educazen123' }
    ];

    for (const org of orgs) {
      await supabase.from('organizations').upsert({ id: org.id, ...org });
    }

    const sampleLeads: Lead[] = [
      { id: 'l1', orgId: 'lunja', name: 'John Smith', source: 'Website', status: 'New', stage: 'D0', value: 1200, date: '2026-04-10' },
      { id: 'l2', orgId: 'lunja', name: 'Sarah Connor', source: 'Referral', status: 'Qualified', stage: 'D2', value: 3500, date: '2026-04-12' },
      { id: 'l3', orgId: 'eiden', name: 'Bruce Wayne', source: 'Direct', status: 'Contacted', stage: 'D1', value: 15000, date: '2026-04-11' }
    ];

    for (const lead of sampleLeads) {
      await supabase.from('leads').upsert({ id: lead.id, ...lead });
    }

    const sampleTasks: Task[] = [
      { id: 't1', orgId: 'lunja', name: 'Check pool PH', department: 'Maintenance', due: '10:00 AM', date: '2026-04-14', assignee: 'Ahmed', done: false, urgent: true },
      { id: 't2', orgId: 'lunja', name: 'Prepare VIP welcome', department: 'Concierge', due: '02:00 PM', date: '2026-04-14', assignee: 'Fatima', done: false },
      { id: 't3', orgId: 'eiden', name: 'Review Q2 budget', department: 'Maintenance', due: '09:00 AM', date: '2026-04-15', assignee: 'Super Admin', done: false }
    ];

    for (const task of sampleTasks) {
      await supabase.from('tasks').upsert({ id: task.id, ...task });
    }

    const sampleGuests: Guest[] = [
      { id: 'g1', orgId: 'lunja', name: 'Alice Wonderland', email: 'alice@example.com', type: 'VIP', stays: 5, lastVisit: '2026-03-20', spend: 4500, status: 'In-house', initials: 'AW' },
      { id: 'g2', orgId: 'lunja', name: 'Bob Builder', email: 'bob@example.com', type: 'Regular', stays: 2, lastVisit: '2026-01-15', spend: 1200, status: 'Arriving', initials: 'BB' }
    ];

    for (const guest of sampleGuests) {
      await supabase.from('guests').upsert({ id: guest.id, ...guest });
    }

    const sampleBookings: Booking[] = [
      { id: 'b1', orgId: 'lunja', ref: '#BK-1234', guestName: 'Alice Wonderland', type: 'Stay', checkIn: '2026-04-12', checkOut: '2026-04-16', amount: 3200, status: 'Active' },
      { id: 'b2', orgId: 'lunja', ref: '#BK-5678', guestName: 'Bob Builder', type: 'Stay', checkIn: '2026-04-14', checkOut: '2026-04-18', amount: 1800, status: 'Pending' }
    ];

    for (const booking of sampleBookings) {
      await supabase.from('bookings').upsert({ id: booking.id, ...booking });
    }

    const sampleActivities: Activity[] = [
      { id: 'a1', orgId: 'lunja', userId: 'superadmin', userName: 'Super Admin', action: 'Created', targetType: 'Lead', targetName: 'John Smith', timestamp: new Date().toISOString() },
      { id: 'a2', orgId: 'lunja', userId: 'superadmin', userName: 'Super Admin', action: 'Updated', targetType: 'Task', targetName: 'Check pool PH', timestamp: new Date().toISOString() }
    ];

    for (const activity of sampleActivities) {
      await supabase.from('activities').upsert({ id: activity.id, ...activity });
    }

    alert('Fake data seeded successfully!');
  };

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingGuest(true);
    try {
      const guestId = `g-${Date.now()}`;
      const initials = newGuest.name.split(' ').map(n => n[0]).join('').toUpperCase();
      const orgId = currentOrgId || userOrgId || 'default';
      const guestData = {
        id: guestId,
        orgId,
        name: newGuest.name,
        email: newGuest.email,
        phone: newGuest.phone,
        company: newGuest.company,
        notes: newGuest.notes,
        type: newGuest.type,
        stays: 0,
        lastVisit: 'New Guest',
        spend: 0,
        status: newGuest.status,
        initials
      };
      const { error } = await supabase.from('guests').insert([guestData]);
      if (error) { alert('Error saving guest: ' + error.message); return; }
      await logActivity('Created', 'Guest', guestData.name, orgId);
      setShowNewGuestForm(false);
      setNewGuest({ name: '', email: '', phone: '', company: '', notes: '', type: 'New', status: 'Arriving' });
      // Immediately refresh
      await refetchAll(currentOrgId || userOrgId, userRole || 'admin');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingGuest(false);
    }
  };

  const handleUpdateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingGuest) return;
    setIsSavingGuest(true);
    try {
      const initials = editingGuest.name.split(' ').map(n => n[0]).join('').toUpperCase();
      const updatedGuest = { ...editingGuest, initials };
      const { error } = await supabase.from('guests').update(updatedGuest).eq('id', editingGuest.id);
      if (error) { alert('Error updating guest: ' + error.message); return; }
      await logActivity('Updated', 'Guest', updatedGuest.name, updatedGuest.orgId);
      setEditingGuest(null);
      await refetchAll(currentOrgId || userOrgId, userRole || 'admin');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingGuest(false);
    }
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const leadId = `l-${Date.now()}`;
      const leadData: Lead = {
        id: leadId,
        orgId: currentOrgId || 'lunja',
        name: newLead.name,
        source: newLead.source,
        status: newLead.status,
        stage: newLead.stage,
        value: Number(newLead.value),
        date: new Date().toISOString().split('T')[0],
        notes: newLead.notes
      };
      await supabase.from('leads').upsert({ id: leadId, ...leadData });
      await logActivity('Created', 'Deal', leadData.name, leadData.orgId);
      setShowNewLeadForm(false);
      setNewLead({ name: '', source: 'Website', value: '', stage: 'D0', status: 'New', notes: '' });
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateLead = async (leadId: string, updates: Partial<Lead>) => {
    if (!user) return;
    try {
      await supabase.from('leads').update(updates).eq('id', leadId);
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        await logActivity('Updated', 'Deal', lead.name, lead.orgId);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingBooking(true);
    try {
      const bookingId = `b-${Date.now()}`;
      const orgId = currentOrgId || userOrgId || 'default';
      const bookingData = {
        id: bookingId,
        orgId,
        ref: `#BK-${Math.floor(1000 + Math.random() * 9000)}`,
        guestName: newBooking.guestName,
        type: newBooking.type,
        checkIn: newBooking.checkIn,
        checkOut: newBooking.checkOut,
        amount: Number(newBooking.amount),
        status: newBooking.status
      };
      const { error } = await supabase.from('bookings').insert([bookingData]);
      if (error) { alert('Error saving booking: ' + error.message); return; }
      await logActivity('Created', 'Booking', bookingData.ref, orgId);
      setShowNewBookingForm(false);
      setNewBooking({ guestName: '', type: 'Stay', checkIn: '', checkOut: '', amount: 0, status: 'Pending' });
      await refetchAll(currentOrgId || userOrgId, userRole || 'admin');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingBooking(false);
    }
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingBooking) return;
    setIsSavingBooking(true);
    try {
      const { error } = await supabase.from('bookings').update({
        guestName: editingBooking.guestName,
        type: editingBooking.type,
        checkIn: editingBooking.checkIn,
        checkOut: editingBooking.checkOut,
        amount: Number(editingBooking.amount),
        status: editingBooking.status
      }).eq('id', editingBooking.id);
      if (error) { alert('Error updating booking: ' + error.message); return; }
      await logActivity('Updated', 'Booking', editingBooking.ref, editingBooking.orgId);
      setEditingBooking(null);
      await refetchAll(currentOrgId || userOrgId, userRole || 'admin');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingBooking(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!user) return;
    try {
      const booking = bookings.find(b => b.id === bookingId);
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) { alert('Error deleting booking: ' + error.message); return; }
      if (booking) await logActivity('Deleted', 'Booking', booking.ref, booking.orgId);
      await refetchAll(currentOrgId || userOrgId, userRole || 'admin');
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingTask(true);
    try {
      const taskId = `t-${Date.now()}`;
      const orgId = currentOrgId || userOrgId || 'default';
      const taskData = {
        id: taskId,
        orgId,
        name: newTask.name,
        department: newTask.department,
        due: newTask.due,
        date: new Date().toISOString().split('T')[0],
        assignee: newTask.assignee,
        done: false,
        urgent: newTask.urgent,
        notes: newTask.notes
      };
      const { error } = await supabase.from('tasks').insert([taskData]);
      if (error) { alert('Error saving task: ' + error.message); return; }
      await logActivity('Created', 'Task', taskData.name, orgId);
      setShowNewTaskForm(false);
      setNewTask({ name: '', department: 'Housekeeping', due: '', assignee: '', urgent: false, notes: '' });
      await refetchAll(currentOrgId || userOrgId, userRole || 'admin');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTask) return;
    setIsSavingTask(true);
    try {
      const { error } = await supabase.from('tasks').update({
        name: editingTask.name,
        department: editingTask.department,
        due: editingTask.due,
        assignee: editingTask.assignee,
        urgent: editingTask.urgent
      }).eq('id', editingTask.id);
      if (error) { alert('Error updating task: ' + error.message); return; }
      setEditingTask(null);
      await refetchAll(currentOrgId || userOrgId, userRole || 'admin');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) { alert('Error deleting task: ' + error.message); return; }
      await refetchAll(currentOrgId || userOrgId, userRole || 'admin');
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleTask = async (taskId: string, done: boolean) => {
    if (!user) return;
    try {
      await supabase.from('tasks').update({ done }).eq('id', taskId);
      const task = tasks.find(t => t.id === taskId);
      if (task) await logActivity(done ? 'Completed' : 'Unchecked', 'Task', task.name, task.orgId);
      await refetchAll(currentOrgId || userOrgId, userRole || 'admin');
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!user) return;
    try {
      const guest = guests.find(g => g.id === guestId);
      const { error } = await supabase.from('guests').delete().eq('id', guestId);
      if (error) { alert('Error deleting guest: ' + error.message); return; }
      if (guest) await logActivity('Deleted', 'Guest', guest.name, guest.orgId);
      await refetchAll(currentOrgId || userOrgId, userRole || 'admin');
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!user) return;
    try {
      const lead = leads.find(l => l.id === leadId);
      const { error } = await supabase.from('leads').delete().eq('id', leadId);
      if (error) { alert('Error deleting lead: ' + error.message); return; }
      if (lead) await logActivity('Deleted', 'Deal', lead.name, lead.orgId);
      await refetchAll(currentOrgId || userOrgId, userRole || 'admin');
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendReminder = async (guestName: string) => {
    if (!user) return;
    try {
      const reminderId = `rem-${Date.now()}`;
      await supabase.from('reminders').insert([{
        id: reminderId,
        guestName,
        timestamp: new Date().toISOString(),
        orgId: currentOrgId || userOrgId,
        sentBy: user.uid
      }]);
      // In a real app, this would trigger a cloud function to send an actual email/SMS
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || userRole !== 'superadmin') return;
    setIsSavingOrg(true);
    try {
      const orgId = newOrg.slug || newOrg.name.toLowerCase().replace(/\s+/g, '-');
      const orgData = {
        id: orgId,
        name: newOrg.name,
        slug: orgId,
        email: newOrg.email || `${orgId}@eiden-group.com`,
        password: newOrg.password || 'password123'
      };
      const { error } = await supabase.from('organizations').insert([orgData]);
      if (error) { alert('Error saving org: ' + error.message); return; }
      await logActivity('Created', 'Organization', orgData.name, 'system');
      setShowNewOrgForm(false);
      setNewOrg({ name: '', slug: '', email: '', password: '' });
      await fetchOrgs(); // Refresh org list
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || userRole !== 'superadmin' || !editingOrg) return;
    setIsSavingOrg(true);
    try {
      const { error } = await supabase.from('organizations').update({
        name: editingOrg.name,
        slug: editingOrg.slug,
        email: editingOrg.email,
        password: editingOrg.password
      }).eq('id', editingOrg.id);
      if (error) { alert('Error updating org: ' + error.message); return; }
      await logActivity('Updated', 'Organization', editingOrg.name, 'system');
      setEditingOrg(null);
      await fetchOrgs();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    if (!user || userRole !== 'superadmin') return;
    try {
      const org = organizations.find(o => o.id === orgId);
      const { error } = await supabase.from('organizations').delete().eq('id', orgId);
      if (error) { alert('Error deleting org: ' + error.message); return; }
      if (org) await logActivity('Deleted', 'Organization', org.name, 'system');
      await fetchOrgs();
    } catch (error) {
      console.error(error);
    }
  };

  // Close notification dropdown on outside click
  React.useEffect(() => {
    if (!showNotifDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notif]')) setShowNotifDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifDropdown]);

  const filteredGuests = useMemo(() => {
    return guests.filter(g => 
      (g.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
      (g.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, guests]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-eiden-deep flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-eiden-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-eiden-gold font-montserrat text-sm tracking-widest uppercase">Initializing Eiden CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top Bar */}
      {(() => {
        const isEz = userOrgId === 'educazen';
        const hBg = isEz ? 'bg-white border-b border-gray-200 shadow-sm' : 'bg-brand-primary border-b border-brand-secondary/20 shadow-md';
        const hMenuBtn = isEz ? 'text-gray-600 hover:text-gray-900' : 'text-brand-secondary/80 hover:text-brand-secondary';
        const hSep = isEz ? 'bg-gray-200' : 'bg-brand-secondary/30';
        const hSub = isEz ? 'text-gray-400' : 'text-brand-secondary/60';
        const hBell = isEz ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-100' : 'text-white/60 hover:text-white hover:bg-white/10';
        const hAvatar = isEz ? 'bg-[#FFF0F5] text-[#C2185B] border-[#C2185B]/20' : 'bg-brand-secondary/20 text-brand-secondary border-brand-secondary/30';
        return (
      <header className={`h-16 ${hBg} flex items-center justify-between px-4 md:px-6 sticky top-0 z-50`}>
        <div className="flex items-center gap-2 md:gap-4">
          <button className={`md:hidden p-2 transition-colors ${hMenuBtn}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            {isEz ? (
              <img src="/educazen.png" alt="EducazenKids" className="h-9 w-auto" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="text-2xl font-brand-head text-brand-secondary">
                {role === 'superadmin' ? 'Eiden Solutions' : (organizations.find(o => o.id === userOrgId)?.name || 'Lunja Village')}
              </div>
            )}
            <div className={`h-4 w-[1px] mx-2 ${hSep}`} />
            <div className={`hidden sm:block text-[10px] font-brand-body uppercase tracking-[0.2em] ${hSub}`} style={isEz ? { fontFamily: 'Cormorant Garamond, serif' } : {}}>
              {role === 'superadmin' ? 'SuperAdmin Portal' : role === 'admin' ? isEz ? 'Espace Administrateur' : 'Manager Portal' : isEz ? 'Espace Parent' : 'Guest Portal'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {user && userRole === 'superadmin' && (
            <div className="hidden sm:flex items-center gap-3">
              <button onClick={seedData} className="btn btn-brand text-[10px] py-1 flex items-center gap-2">
                <Database size={12} /> Seed Data
              </button>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isEz ? 'bg-gray-50 border-gray-200' : 'bg-white/10 border-brand-secondary/20'}`}>
                <Palmtree size={14} className={isEz ? 'text-gray-400' : 'text-brand-secondary'} />
                <select className={`bg-transparent text-xs font-brand-body focus:outline-none cursor-pointer ${isEz ? 'text-gray-700' : 'text-white'}`}
                  value={currentOrgId || ''} onChange={e => {
                    const id = e.target.value || null;
                    setCurrentOrgId(id);
                    setPage('dashboard');
                  }}>
                  <option value="" className="text-ink">All Organizations</option>
                  {organizations.map(org => <option key={org.id} value={org.id} className="text-ink">{org.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!user ? (
              <button onClick={() => setPage('dashboard')} className="btn btn-coral">Sign In</button>
            ) : (
              <>
                {/* Notification Bell */}
                <div className="relative" data-notif="true">
                  <button onClick={() => setShowNotifDropdown(v => !v)}
                    className={`p-2 rounded-lg transition-colors relative ${hBell}`}>
                    <Bell size={19} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <span className="font-bold text-sm text-gray-800">Notifications</span>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-brand-primary hover:underline">Tout lire</button>
                          )}
                          <button onClick={() => setShowNotifDropdown(false)} className="text-gray-400 hover:text-gray-600 p-1">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                          <p className="p-5 text-center text-xs text-gray-400">Aucune notification.</p>
                        ) : notifications.map(n => (
                          <div key={n.id} className={`px-4 py-3 flex items-start gap-3 ${!n.read ? 'bg-brand-primary/5' : ''}`}>
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'success' ? 'bg-teal-400' : n.type === 'warning' ? 'bg-amber-400' : n.type === 'error' ? 'bg-rose-400' : 'bg-blue-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                              <p className="text-[10px] text-gray-300 mt-1">{new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border overflow-hidden ${hAvatar}`}>
                  {user.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} referrerPolicy="no-referrer" /> : role === 'superadmin' ? 'SA' : role === 'admin' ? 'AD' : 'GS'}
                </div>
              </>
            )}
          </div>
        </div>
      </header>
        );
      })()}

      <div className="flex flex-1 overflow-hidden">
        {!user ? (
          /* ── Full-screen portal overlay (covers header) ── */
          <div style={{position:'fixed',inset:0,zIndex:100,overflowY:'auto'}}>
            {loginPortal === 'eiden' ? (

              /* ════════════════════════════════════════
                 EIDEN LOGIN — Dark forest, sharp edges
              ════════════════════════════════════════ */
              <div style={{background:'#0A0F0C',minHeight:'100vh',fontFamily:'"Inter",sans-serif',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
                {/* Marquee bar */}
                <div style={{position:'fixed',top:0,left:0,right:0,background:'#0C5752',padding:'8px 0',overflow:'hidden',zIndex:10,flexShrink:0}}>
                  <div style={{display:'flex',whiteSpace:'nowrap',animation:'marqueeScroll 22s linear infinite'}}>
                    {['EIDEN Group','Workspace','v2.0','Secure Access','Private','EIDEN Group','Workspace','v2.0','Secure Access','Private'].map((txt,i)=>(
                      <span key={i} style={{fontFamily:'"Cormorant Garamond",serif',fontSize:'10px',letterSpacing:'4px',textTransform:'uppercase',color:'rgba(207,194,146,.65)',padding:'0 36px'}}>{txt}</span>
                    ))}
                  </div>
                </div>
                {/* Bottom bar */}
                <div style={{position:'fixed',bottom:0,left:0,right:0,height:'3px',background:'#0C5752',zIndex:10}} />
                {/* Blobs */}
                <div style={{position:'fixed',width:'40vw',height:'40vw',top:'-15%',right:'-10%',background:'rgba(12,87,82,.28)',filter:'blur(100px)',borderRadius:'50%',pointerEvents:'none',zIndex:0}} />
                <div style={{position:'fixed',width:'26vw',height:'26vw',bottom:'-10%',left:'-5%',background:'rgba(12,87,82,.14)',filter:'blur(80px)',borderRadius:'50%',pointerEvents:'none',zIndex:0}} />
                {/* Watermark */}
                <div style={{position:'fixed',bottom:'-30px',right:'30px',fontFamily:'"Outfit",sans-serif',fontWeight:800,fontSize:'clamp(160px,22vw,300px)',color:'rgba(207,194,146,.03)',pointerEvents:'none',lineHeight:1,userSelect:'none',letterSpacing:'-6px',zIndex:0}}>EIDEN</div>

                <div style={{position:'relative',zIndex:2,flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 24px 60px',minHeight:'100vh'}}>
                  <div style={{background:'#FEFDFB',borderRadius:'2px',padding:'clamp(36px,5vw,56px) clamp(26px,5vw,52px)',width:'100%',maxWidth:'440px',boxShadow:'0 2px 4px rgba(0,0,0,.2),0 12px 40px rgba(0,0,0,.38),0 32px 80px rgba(0,0,0,.25)',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:'#0C5752'}} />
                    <div style={{fontFamily:'"Outfit",sans-serif',fontWeight:700,fontSize:'28px',color:'#122620',letterSpacing:'6px',textTransform:'uppercase',marginBottom:'4px'}}>EIDEN</div>
                    <div style={{fontFamily:'"Cormorant Garamond",serif',fontStyle:'italic',fontSize:'13px',color:'rgba(10,15,12,.38)',marginBottom:'36px'}}>Workspace · Private Access</div>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',fontFamily:'"Cormorant Garamond",serif',fontSize:'10px',fontWeight:600,letterSpacing:'5px',textTransform:'uppercase',color:'#0C5752',marginBottom:'16px'}}>
                      <span style={{display:'block',width:'22px',height:'1px',background:'#0C5752',flexShrink:0}} />Secure Access
                    </div>
                    <h2 style={{fontFamily:'"Outfit",sans-serif',fontWeight:600,fontSize:'clamp(20px,3.5vw,27px)',color:'#0A0F0C',marginBottom:'6px',letterSpacing:'-.5px'}}>Private <span style={{color:'#0E7A73'}}>Space</span></h2>
                    <p style={{fontFamily:'"DM Serif Display",serif',fontStyle:'italic',fontSize:'14px',color:'rgba(10,15,12,.42)',marginBottom:'32px',lineHeight:'1.65'}}>Enter your credentials to access the EIDEN workspace.</p>
                    <form onSubmit={handleLogin}>
                      <div style={{marginBottom:'20px'}}>
                        <label style={{display:'block',fontFamily:'"Cormorant Garamond",serif',fontSize:'10px',fontWeight:600,letterSpacing:'4px',textTransform:'uppercase',color:'rgba(10,15,12,.38)',marginBottom:'8px'}}>Email</label>
                        <input type="email" placeholder="admin@eiden-group.com" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required
                          style={{width:'100%',padding:'14px 18px',fontFamily:'"Inter",sans-serif',fontSize:'14px',color:'#0A0F0C',background:'#F4EBD0',border:'1px solid rgba(12,87,82,.15)',borderRadius:'2px',outline:'none',transition:'all .25s'}}
                          onFocus={e=>{e.currentTarget.style.borderColor='#0C5752';e.currentTarget.style.background='#F8F3E8';e.currentTarget.style.boxShadow='0 0 0 3px rgba(12,87,82,.1)';}}
                          onBlur={e=>{e.currentTarget.style.borderColor='rgba(12,87,82,.15)';e.currentTarget.style.background='#F4EBD0';e.currentTarget.style.boxShadow='none';}}
                        />
                      </div>
                      <div style={{marginBottom:'24px'}}>
                        <label style={{display:'block',fontFamily:'"Cormorant Garamond",serif',fontSize:'10px',fontWeight:600,letterSpacing:'4px',textTransform:'uppercase',color:'rgba(10,15,12,.38)',marginBottom:'8px'}}>Password</label>
                        <input type="password" placeholder="Enter your password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required
                          style={{width:'100%',padding:'14px 18px',fontFamily:'"Inter",sans-serif',fontSize:'14px',letterSpacing:'3px',color:'#0A0F0C',background:'#F4EBD0',border:'1px solid rgba(12,87,82,.15)',borderRadius:'2px',outline:'none',transition:'all .25s'}}
                          onFocus={e=>{e.currentTarget.style.borderColor='#0C5752';e.currentTarget.style.background='#F8F3E8';e.currentTarget.style.boxShadow='0 0 0 3px rgba(12,87,82,.1)';}}
                          onBlur={e=>{e.currentTarget.style.borderColor='rgba(12,87,82,.15)';e.currentTarget.style.background='#F4EBD0';e.currentTarget.style.boxShadow='none';}}
                        />
                      </div>
                      {loginError && <p style={{fontFamily:'"Cormorant Garamond",serif',fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#EF4444',marginBottom:'12px'}}>{loginError}</p>}
                      <button type="submit" style={{width:'100%',padding:'15px 24px',fontFamily:'"Outfit",sans-serif',fontWeight:600,fontSize:'14px',letterSpacing:'3px',textTransform:'uppercase',color:'#FEFDFB',background:'#122620',border:'none',borderRadius:'2px',cursor:'pointer',transition:'all .25s',boxShadow:'0 4px 18px rgba(0,0,0,.22)',marginTop:'8px'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='#0C5752';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 26px rgba(12,87,82,.32)';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='#122620';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 18px rgba(0,0,0,.22)';}}
                      >Access →</button>
                    </form>
                  </div>
                </div>
              </div>

            ) : loginPortal === 'lunja' ? (

              /* ════════════════════════════════════════
                 LUNJA LOGIN — Warm cream, rounded
              ════════════════════════════════════════ */
              <div style={{background:'#FDF8EE',minHeight:'100vh',fontFamily:'"DM Sans",sans-serif',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
                {/* Bottom bar */}
                <div style={{position:'fixed',bottom:0,left:0,right:0,height:'3px',background:'linear-gradient(90deg,#2BBAA5,#F9A822,#F96635,#2BBAA5)',zIndex:10}} />
                {/* Blobs */}
                <div style={{position:'fixed',width:'45vw',height:'45vw',top:'-15%',right:'-10%',background:'rgba(43,186,165,.1)',filter:'blur(90px)',borderRadius:'50%',pointerEvents:'none',zIndex:0}} />
                <div style={{position:'fixed',width:'32vw',height:'32vw',bottom:'-10%',left:'-6%',background:'rgba(249,168,34,.09)',filter:'blur(80px)',borderRadius:'50%',pointerEvents:'none',zIndex:0}} />
                <div style={{position:'fixed',width:'20vw',height:'20vw',top:'40%',left:'5%',background:'rgba(249,102,53,.06)',filter:'blur(70px)',borderRadius:'50%',pointerEvents:'none',zIndex:0}} />
                {/* Watermark */}
                <div style={{position:'fixed',bottom:'-40px',right:'-10px',fontFamily:'"Great Vibes",cursive',fontSize:'clamp(180px,24vw,320px)',color:'#2BBAA5',opacity:.04,pointerEvents:'none',lineHeight:1,userSelect:'none',zIndex:0}}>Lunja</div>

                <div style={{position:'relative',zIndex:2,flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 24px 60px',minHeight:'100vh'}}>
                  <div style={{background:'#FFFDF7',borderRadius:'24px',padding:'clamp(36px,5vw,56px) clamp(26px,5vw,52px)',width:'100%',maxWidth:'440px',boxShadow:'0 2px 4px rgba(43,186,165,.04),0 8px 28px rgba(43,186,165,.09),0 24px 56px rgba(26,18,8,.06)',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:'linear-gradient(90deg,#2BBAA5,#F9A822,#F96635,#2BBAA5)'}} />
                    <div style={{fontFamily:'"Great Vibes",cursive',fontSize:'48px',color:'#2BBAA5',lineHeight:1.05,marginBottom:'4px'}}>Lunja Village</div>
                    <div style={{fontFamily:'"DM Sans",sans-serif',fontSize:'11px',fontWeight:500,letterSpacing:'3px',textTransform:'uppercase',color:'rgba(26,18,8,.35)',marginBottom:'36px'}}>Resort · Management</div>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',fontFamily:'"Righteous",sans-serif',fontSize:'10px',letterSpacing:'4px',textTransform:'uppercase',color:'#2BBAA5',marginBottom:'16px'}}>
                      <span style={{display:'block',width:'22px',height:'1.5px',background:'#2BBAA5',flexShrink:0}} />Secure Access
                    </div>
                    <h2 style={{fontFamily:'"Righteous",sans-serif',fontSize:'clamp(20px,3.5vw,27px)',color:'#1A1208',marginBottom:'6px'}}>Private <span style={{color:'#2BBAA5'}}>Space</span></h2>
                    <p style={{fontFamily:'"Lora",serif',fontStyle:'italic',fontSize:'13.5px',color:'rgba(26,18,8,.42)',marginBottom:'32px',lineHeight:'1.65'}}>Enter your credentials to access the Lunja Village workspace.</p>
                    <form onSubmit={handleLogin}>
                      <div style={{marginBottom:'20px'}}>
                        <label style={{display:'block',fontFamily:'"DM Sans",sans-serif',fontSize:'10px',fontWeight:600,letterSpacing:'3px',textTransform:'uppercase',color:'rgba(26,18,8,.38)',marginBottom:'8px'}}>Email</label>
                        <input type="email" placeholder="admin@lunja.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required
                          style={{width:'100%',padding:'14px 18px',fontFamily:'"DM Sans",sans-serif',fontSize:'14px',color:'#1A1208',background:'#FDF8EE',border:'1.5px solid rgba(43,186,165,.15)',borderRadius:'14px',outline:'none',transition:'all .25s'}}
                          onFocus={e=>{e.currentTarget.style.borderColor='#2BBAA5';e.currentTarget.style.background='#FFFFFF';e.currentTarget.style.boxShadow='0 0 0 4px rgba(43,186,165,.1)';}}
                          onBlur={e=>{e.currentTarget.style.borderColor='rgba(43,186,165,.15)';e.currentTarget.style.background='#FDF8EE';e.currentTarget.style.boxShadow='none';}}
                        />
                      </div>
                      <div style={{marginBottom:'24px'}}>
                        <label style={{display:'block',fontFamily:'"DM Sans",sans-serif',fontSize:'10px',fontWeight:600,letterSpacing:'3px',textTransform:'uppercase',color:'rgba(26,18,8,.38)',marginBottom:'8px'}}>Password</label>
                        <input type="password" placeholder="Enter your password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required
                          style={{width:'100%',padding:'14px 18px',fontFamily:'"DM Sans",sans-serif',fontSize:'14px',letterSpacing:'3px',color:'#1A1208',background:'#FDF8EE',border:'1.5px solid rgba(43,186,165,.15)',borderRadius:'14px',outline:'none',transition:'all .25s'}}
                          onFocus={e=>{e.currentTarget.style.borderColor='#2BBAA5';e.currentTarget.style.background='#FFFFFF';e.currentTarget.style.boxShadow='0 0 0 4px rgba(43,186,165,.1)';}}
                          onBlur={e=>{e.currentTarget.style.borderColor='rgba(43,186,165,.15)';e.currentTarget.style.background='#FDF8EE';e.currentTarget.style.boxShadow='none';}}
                        />
                      </div>
                      {loginError && <p style={{fontFamily:'"DM Sans",sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#F96635',marginBottom:'12px'}}>{loginError}</p>}
                      <button type="submit" style={{width:'100%',padding:'15px 24px',fontFamily:'"Righteous",sans-serif',fontSize:'15px',letterSpacing:'1px',color:'#FFFFFF',background:'#2BBAA5',border:'none',borderRadius:'14px',cursor:'pointer',transition:'all .25s',boxShadow:'0 4px 18px rgba(43,186,165,.3)',marginTop:'8px'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='#1A8F7C';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 26px rgba(43,186,165,.38)';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='#2BBAA5';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 18px rgba(43,186,165,.3)';}}
                      >Access →</button>
                    </form>
                  </div>
                </div>
              </div>

            ) : (

              /* ════════════════════════════════════════
                 EDUCAZEN LOGIN — White, magenta, playful
              ════════════════════════════════════════ */
              <div style={{background:'#FFFFFF',minHeight:'100vh',fontFamily:'"Quicksand",sans-serif',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
                {/* Bottom bar */}
                <div style={{position:'fixed',bottom:0,left:0,right:0,height:'4px',background:'linear-gradient(90deg,#C2185B,#7B1FA2,#00897B,#F9A825)',zIndex:10}} />
                {/* Blobs */}
                <div style={{position:'fixed',width:'40vw',height:'40vw',top:'-12%',right:'-8%',background:'#FFF0F5',opacity:.7,filter:'blur(70px)',borderRadius:'50%',pointerEvents:'none',zIndex:0}} />
                <div style={{position:'fixed',width:'28vw',height:'28vw',bottom:'-8%',left:'-5%',background:'#F6F0FF',opacity:.6,filter:'blur(70px)',borderRadius:'50%',pointerEvents:'none',zIndex:0}} />
                <div style={{position:'fixed',width:'18vw',height:'18vw',top:'30%',left:'7%',background:'#E8F8F5',opacity:.5,filter:'blur(70px)',borderRadius:'50%',pointerEvents:'none',zIndex:0}} />
                {/* Watermark */}
                <div style={{position:'fixed',bottom:'-60px',right:'-60px',fontSize:'clamp(200px,28vw,360px)',opacity:.025,pointerEvents:'none',zIndex:0,lineHeight:1,color:'#C2185B',fontFamily:'"Nunito",sans-serif',fontWeight:900,userSelect:'none'}}>🧩</div>

                <div style={{position:'relative',zIndex:2,flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 24px 60px',minHeight:'100vh'}}>
                  <div style={{background:'#FFFFFF',borderRadius:'20px',padding:'clamp(36px,5vw,56px) clamp(26px,5vw,52px)',width:'100%',maxWidth:'440px',boxShadow:'0 2px 4px rgba(194,24,91,.04),0 8px 28px rgba(194,24,91,.08),0 24px 56px rgba(45,45,58,.06)',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:'linear-gradient(90deg,#C2185B,#7B1FA2,#00897B,#F9A825)'}} />
                    {/* Logo */}
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:'32px'}}>
                      <img src="/educazen.png" alt="EducazenKids" style={{width:'clamp(90px,16vw,130px)',marginBottom:'12px',display:'block'}} onError={e=>(e.currentTarget.style.display='none')} />
                      <p style={{fontFamily:'"Playfair Display",serif',fontStyle:'italic',fontSize:'13px',color:'rgba(45,45,58,.5)',textAlign:'center',lineHeight:'1.6'}}>Centre Éducatif & Psychosocial · Agadir</p>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',fontFamily:'"Cormorant Garamond",serif',fontSize:'10px',fontWeight:600,letterSpacing:'4px',textTransform:'uppercase',color:'#C2185B',marginBottom:'20px'}}>
                      <span style={{display:'block',width:'22px',height:'1.5px',background:'#C2185B',flexShrink:0}} />Accès Sécurisé
                    </div>
                    <h2 style={{fontFamily:'"Nunito",sans-serif',fontWeight:800,fontSize:'clamp(20px,3.5vw,27px)',lineHeight:'1.1',color:'#2D2D3A',marginBottom:'6px'}}>Espace <span style={{color:'#C2185B'}}>Privé</span></h2>
                    <p style={{fontFamily:'"Playfair Display",serif',fontStyle:'italic',fontSize:'14px',color:'rgba(45,45,58,.5)',marginBottom:'32px',lineHeight:'1.65'}}>Veuillez entrer vos identifiants pour accéder à l'espace.</p>
                    <form onSubmit={handleLogin}>
                      <div style={{marginBottom:'20px'}}>
                        <label style={{display:'block',fontFamily:'"Cormorant Garamond",serif',fontSize:'10px',fontWeight:600,letterSpacing:'3px',textTransform:'uppercase',color:'rgba(45,45,58,.5)',marginBottom:'8px'}}>Email</label>
                        <input type="email" placeholder="admin@educazenkids.com" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required
                          style={{width:'100%',padding:'14px 18px',fontFamily:'"Quicksand",sans-serif',fontSize:'14px',color:'#2D2D3A',background:'#FFFDF9',border:'1.5px solid rgba(194,24,91,.12)',borderRadius:'12px',outline:'none',transition:'all .25s'}}
                          onFocus={e=>{e.currentTarget.style.borderColor='#C2185B';e.currentTarget.style.background='#FFFFFF';e.currentTarget.style.boxShadow='0 0 0 4px rgba(194,24,91,.08)';}}
                          onBlur={e=>{e.currentTarget.style.borderColor='rgba(194,24,91,.12)';e.currentTarget.style.background='#FFFDF9';e.currentTarget.style.boxShadow='none';}}
                        />
                      </div>
                      <div style={{marginBottom:'24px'}}>
                        <label style={{display:'block',fontFamily:'"Cormorant Garamond",serif',fontSize:'10px',fontWeight:600,letterSpacing:'3px',textTransform:'uppercase',color:'rgba(45,45,58,.5)',marginBottom:'8px'}}>Mot de passe</label>
                        <input type="password" placeholder="Entrez votre mot de passe" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required
                          style={{width:'100%',padding:'14px 18px',fontFamily:'"Quicksand",sans-serif',fontSize:'14px',letterSpacing:'3px',color:'#2D2D3A',background:'#FFFDF9',border:'1.5px solid rgba(194,24,91,.12)',borderRadius:'12px',outline:'none',transition:'all .25s'}}
                          onFocus={e=>{e.currentTarget.style.borderColor='#C2185B';e.currentTarget.style.background='#FFFFFF';e.currentTarget.style.boxShadow='0 0 0 4px rgba(194,24,91,.08)';}}
                          onBlur={e=>{e.currentTarget.style.borderColor='rgba(194,24,91,.12)';e.currentTarget.style.background='#FFFDF9';e.currentTarget.style.boxShadow='none';}}
                        />
                      </div>
                      {loginError && <p style={{fontFamily:'"Cormorant Garamond",serif',fontSize:'11px',fontWeight:600,letterSpacing:'1.5px',color:'#e53935',marginBottom:'12px'}}>{loginError}</p>}
                      <button type="submit" style={{width:'100%',padding:'15px 24px',fontFamily:'"Nunito",sans-serif',fontWeight:800,fontSize:'15px',letterSpacing:'.5px',color:'#FFFFFF',background:'#C2185B',border:'none',borderRadius:'12px',cursor:'pointer',transition:'all .25s',boxShadow:'0 4px 18px rgba(194,24,91,.28)',marginTop:'8px'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='#E91E7B';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 26px rgba(194,24,91,.34)';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='#C2185B';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 18px rgba(194,24,91,.28)';}}
                      >Accéder →</button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Sidebar */}
            {isMobileMenuOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}
            <aside className={cn(
              "fixed inset-y-0 left-0 top-16 z-40 w-64 bg-white border-r border-gray-100 flex flex-col p-3 sm:p-4 transition-transform duration-300 md:relative md:top-0 md:translate-x-0 md:flex",
              isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            )}>
          <div className="mb-8 px-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              {role === 'superadmin'
                ? currentOrgId === 'educazen' ? 'EducaZen Kids' : currentOrgId === 'lunja' ? 'Lunja Village' : 'Global Control'
                : role === 'admin' ? 'Management' : 'My Stay'}
            </div>
            <nav className="space-y-1" onClick={() => setIsMobileMenuOpen(false)}>
              {role === 'superadmin' ? (
                currentOrgId === 'educazen' ? (
                  // ── Superadmin viewing EducaZen ──
                  <>
                    <button onClick={() => { setCurrentOrgId(null); setPage('dashboard'); }}
                      className="flex items-center gap-2 text-xs text-gray-400 hover:text-ink mb-3 px-2 py-1 rounded-lg hover:bg-gray-50 w-full transition-colors">
                      <ChevronRight size={12} className="rotate-180" /> All Organizations
                    </button>
                    <SidebarItem icon={LayoutDashboard} label="EducaZen Dashboard" active={true} onClick={() => {}} />
                  </>
                ) : currentOrgId === 'lunja' ? (
                  // ── Superadmin viewing Lunja Village ──
                  <>
                    <button onClick={() => { setCurrentOrgId(null); setPage('dashboard'); }}
                      className="flex items-center gap-2 text-xs text-gray-400 hover:text-ink mb-3 px-2 py-1 rounded-lg hover:bg-gray-50 w-full transition-colors">
                      <ChevronRight size={12} className="rotate-180" /> All Organizations
                    </button>
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" active={page === 'dashboard'} onClick={() => setPage('dashboard')} />
                    <SidebarItem icon={Users} label="Contacts" active={page === 'guests'} onClick={() => setPage('guests')} />
                    <SidebarItem icon={CalendarDays} label="Bookings" active={page === 'bookings'} onClick={() => setPage('bookings')} />
                    <SidebarItem icon={CheckSquare} label="Tasks" active={page === 'tasks'} onClick={() => setPage('tasks')} />
                    <SidebarItem icon={CalendarDays} label="Calendar" active={page === 'calendar'} onClick={() => setPage('calendar')} />
                    <SidebarItem icon={BarChart3} label="Revenue" active={page === 'revenue'} onClick={() => setPage('revenue')} />
                  </>
                ) : (
                  // ── Superadmin global view ──
                  <>
                    <SidebarItem icon={LayoutDashboard} label="Super Dashboard" active={page === 'dashboard'} onClick={() => setPage('dashboard')} />
                    <SidebarItem icon={Palmtree} label="Organizations" active={page === 'organizations'} onClick={() => setPage('organizations')} />
                    <SidebarItem icon={ArrowUpRight} label="Global Client Board" active={page === 'client-board'} onClick={() => setPage('client-board')} />
                    <SidebarItem icon={Users} label="Global Contacts" active={page === 'guests'} onClick={() => setPage('guests')} />
                    <SidebarItem icon={CalendarDays} label="Global Bookings" active={page === 'bookings'} onClick={() => setPage('bookings')} />
                    <SidebarItem icon={CheckSquare} label="Global Tasks" active={page === 'tasks'} onClick={() => setPage('tasks')} />
                    <SidebarItem icon={CalendarDays} label="Global Calendar" active={page === 'calendar'} onClick={() => setPage('calendar')} />
                    <SidebarItem icon={BarChart3} label="Global Revenue" active={page === 'revenue'} onClick={() => setPage('revenue')} />
                    <SidebarItem icon={Users} label="Global Users" active={page === 'users'} onClick={() => setPage('users')} />
                  </>
                )
              ) : role === 'admin' ? (
                userOrgId === 'educazen' ? (
                  // EducaZen admin sidebar — single entry point
                  <SidebarItem icon={LayoutDashboard} label="Tableau de Bord" active={page === 'dashboard'} onClick={() => setPage('dashboard')} />
                ) : (
                  <>
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" active={page === 'dashboard'} onClick={() => setPage('dashboard')} />
                    <SidebarItem icon={ArrowUpRight} label="Client Board" active={page === 'client-board'} onClick={() => setPage('client-board')} />
                    <SidebarItem icon={Users} label="Contacts" active={page === 'guests'} onClick={() => setPage('guests')} />
                    <SidebarItem icon={CalendarDays} label="Bookings" active={page === 'bookings'} onClick={() => setPage('bookings')} />
                    <SidebarItem icon={CheckSquare} label="Tasks" active={page === 'tasks'} onClick={() => setPage('tasks')} />
                    <SidebarItem icon={CalendarDays} label="Calendar" active={page === 'calendar'} onClick={() => setPage('calendar')} />
                    <SidebarItem icon={BarChart3} label="Revenue" active={page === 'revenue'} onClick={() => setPage('revenue')} />
                  </>
                )
              ) : (
                userOrgId === 'educazen' ? (
                  // EducaZen parent sidebar
                  <SidebarItem icon={LayoutDashboard} label="Espace Parent" active={page === 'dashboard'} onClick={() => setPage('dashboard')} />
                ) : (
                  <>
                    <SidebarItem icon={LayoutDashboard} label="Overview" active={page === 'client-overview'} onClick={() => setPage('client-overview')} />
                    <SidebarItem icon={CalendarDays} label="My Booking" active={page === 'client-booking'} onClick={() => setPage('client-booking')} />
                    <div className="opacity-50 pointer-events-none relative group mt-2" title="Coming Soon">
                      <SidebarItem icon={Utensils} label="Guest Portal" active={page === 'client-dining'} onClick={() => {}} />
                      <span className="absolute top-1/2 -translate-y-1/2 right-4 text-[8px] bg-gray-200 text-gray-500 px-2 rounded-full uppercase tracking-widest font-bold">Soon</span>
                    </div>
                    <SidebarItem icon={Palmtree} label="Activities" active={page === 'client-activities'} onClick={() => setPage('client-activities')} />
                  </>
                )
              )}
            </nav>
          </div>

          <div className="mt-auto px-2 border-t border-gray-50 pt-4">
            <SidebarItem icon={Settings} label="Settings" active={false} onClick={() => {}} />
            <SidebarItem icon={LogOut} label="Sign Out" active={false} onClick={handleLogout} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${role}-${page}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* ─── EducaZen Dashboard (admin, parent, or superadmin scoped to educazen) ─── */}
              {(userOrgId === 'educazen' || (role === 'superadmin' && currentOrgId === 'educazen')) ? (
                <EducazenDashboard
                  role="admin"
                  userEmail={user?.email}
                  orgId="educazen"
                  onNotify={createNotification}
                />
              ) : role === 'admin' || role === 'superadmin' ? (
                <>
                  {page === 'dashboard' && role === 'superadmin' && !currentOrgId && (() => {
                    // ── derived stats ──
                    const lunjaGuests   = guests.filter(g => g.orgId === 'lunja' || !g.orgId);
                    const lunjaBookings = bookings.filter(b => b.orgId === 'lunja' || !b.orgId);
                    const lunjaRevenue  = lunjaBookings.reduce((s, b) => s + (Number(b.amount) || 0), 0);
                    const lunjaPending  = lunjaBookings.filter(b => b.status === 'Pending').length;
                    const lunjaTasks    = tasks.filter(t => !t.done && (t.orgId === 'lunja' || !t.orgId));
                    const lunjaUrgent   = lunjaTasks.filter(t => t.urgent).length;
                    const ezPayRate     = ezStats.students > 0 ? Math.round((ezStats.paidThisMonth / ezStats.students) * 100) : 0;
                    const combinedRev   = lunjaRevenue + ezStats.totalRevenue;
                    return (
                    <div className="space-y-6 sm:space-y-8">

                      {/* ── Header ── */}
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-eiden-teal">EIDEN Group · Super Admin</span>
                          </div>
                          <h1 className="text-xl sm:text-3xl font-bold text-eiden-deep" style={{fontFamily:'"Outfit",sans-serif',letterSpacing:'-.5px'}}>
                            Client Monitoring
                          </h1>
                          <p className="text-sm text-gray-400 mt-1">
                            {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                            &nbsp;·&nbsp;{organizations.length || 2} active client partners
                          </p>
                        </div>
                        <button onClick={() => setPage('organizations')}
                          className="btn btn-brand text-xs flex items-center gap-1.5 self-start sm:self-auto">
                          <Palmtree size={13} /> Manage Clients
                        </button>
                      </div>

                      {/* ── Top KPI strip ── */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Client Partners',    value: (organizations.length || 2).toString(), sub: 'All active',                 color: '#0C5752', bg: 'rgba(12,87,82,.06)'    },
                          { label: 'Lunja Revenue',      value: `MAD ${lunjaRevenue.toLocaleString()}`, sub: `${lunjaPending} pending`,     color: '#2BBAA5', bg: 'rgba(43,186,165,.06)'  },
                          { label: 'EducaZen Revenue',   value: `MAD ${ezStats.totalRevenue.toLocaleString()}`, sub: `${ezStats.unpaidCount} unpaid`, color: '#C2185B', bg: 'rgba(194,24,91,.06)'  },
                          { label: 'Combined Revenue',   value: `MAD ${combinedRev.toLocaleString()}`,  sub: 'All organisations',           color: '#d7bb93', bg: 'rgba(215,187,147,.08)' },
                        ].map(k => (
                          <div key={k.label} className="rounded-xl p-4 border border-gray-100" style={{background:k.bg}}>
                            <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:k.color,opacity:.7}}>{k.label}</div>
                            <div className="text-lg sm:text-2xl font-bold text-eiden-deep truncate" style={{fontFamily:'"Outfit",sans-serif'}}>{k.value}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">{k.sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* ── Client Partner Cards ── */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* ── Lunja Village ── */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          {/* Header band */}
                          <div style={{background:'linear-gradient(135deg,#2BBAA5 0%,#1A8F7C 100%)',padding:'18px 20px 14px'}}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div style={{fontFamily:'"Great Vibes",cursive',fontSize:'28px',color:'white',lineHeight:1.1}}>Lunja Village</div>
                                <div className="text-[10px] font-bold tracking-widest uppercase text-white/60 mt-0.5">Resort & Hospitality · Agadir</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" /> Online
                                </span>
                                <Palmtree size={22} className="text-white/40" />
                              </div>
                            </div>
                          </div>
                          {/* Body */}
                          <div className="p-5 space-y-4">
                            {/* 4 metrics */}
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {[
                                { label: 'Guests',    value: lunjaGuests.length,                                              color: '#2BBAA5' },
                                { label: 'Bookings',  value: lunjaBookings.length,                                            color: '#2BBAA5' },
                                { label: 'Pending',   value: lunjaPending,                                                    color: lunjaPending > 0 ? '#F96635' : '#9ca3af' },
                                { label: 'Open Tasks',value: lunjaTasks.length,                                               color: lunjaUrgent > 0 ? '#F59E0B' : '#9ca3af' },
                              ].map(m => (
                                <div key={m.label} className="rounded-xl p-2.5 bg-gray-50">
                                  <div className="text-xl font-extrabold" style={{fontFamily:'"Outfit",sans-serif',color:m.color}}>{m.value}</div>
                                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{m.label}</div>
                                </div>
                              ))}
                            </div>
                            {/* Revenue bar */}
                            <div>
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className="font-semibold text-gray-500">Total Revenue</span>
                                <span className="font-bold text-eiden-teal">MAD {lunjaRevenue.toLocaleString()}</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-keppel transition-all" style={{width:`${Math.min(100, combinedRev > 0 ? (lunjaRevenue/combinedRev)*100 : 0)}%`}} />
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1">{combinedRev > 0 ? Math.round((lunjaRevenue/combinedRev)*100) : 0}% of combined group revenue</div>
                            </div>
                            {/* Urgent alert */}
                            {lunjaUrgent > 0 && (
                              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                <span className="text-amber-500 text-sm">⚠️</span>
                                <span className="text-xs font-semibold text-amber-700">{lunjaUrgent} urgent task{lunjaUrgent > 1 ? 's' : ''} need attention</span>
                              </div>
                            )}
                            {/* CTA */}
                            <button onClick={()=>{setCurrentOrgId('lunja');setPage('dashboard');}}
                              className="w-full py-2 rounded-xl text-sm font-bold text-eiden-teal border border-keppel/30 bg-keppel/5 hover:bg-keppel hover:text-white transition-all">
                              Open Lunja Dashboard →
                            </button>
                          </div>
                        </div>

                        {/* ── EducaZen Kids ── */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          {/* Header band */}
                          <div style={{background:'linear-gradient(135deg,#C2185B 0%,#7B1FA2 100%)',padding:'18px 20px 14px'}}>
                            <div className="flex items-center justify-between">
                              <div>
                                <img src="/educazen.png" alt="" className="h-6 w-auto mb-1" style={{filter:'brightness(0) invert(1)'}} onError={e=>(e.currentTarget.style.display='none')} />
                                <div style={{fontFamily:'"Nunito",sans-serif',fontWeight:900,fontSize:'20px',color:'white',lineHeight:1.1}}>EducazenKids</div>
                                <div className="text-[10px] font-bold tracking-widest uppercase text-white/60 mt-0.5">Centre Éducatif · Agadir</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-pink-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-pink-300 animate-pulse" /> Online
                                </span>
                                <span className="text-2xl">🎓</span>
                              </div>
                            </div>
                          </div>
                          {/* Body */}
                          <div className="p-5 space-y-4">
                            {/* 4 metrics */}
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {[
                                { label: 'Students',  value: ezStats.students,      color: '#C2185B' },
                                { label: 'Staff',     value: ezStats.staff,         color: '#7B1FA2' },
                                { label: 'Paid',      value: ezStats.paidThisMonth, color: '#0D9488' },
                                { label: 'Unpaid',    value: ezStats.unpaidCount,   color: ezStats.unpaidCount > 0 ? '#F96635' : '#9ca3af' },
                              ].map(m => (
                                <div key={m.label} className="rounded-xl p-2.5 bg-gray-50">
                                  <div className="text-xl font-extrabold" style={{fontFamily:'"Outfit",sans-serif',color:m.color}}>{m.value}</div>
                                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{m.label}</div>
                                </div>
                              ))}
                            </div>
                            {/* Payment collection bar */}
                            <div>
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className="font-semibold text-gray-500">Payment Collection</span>
                                <span className="font-bold" style={{color:'#C2185B'}}>{ezPayRate}%</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{background:'#C2185B',width:`${ezPayRate}%`}} />
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1">{ezStats.paidThisMonth}/{ezStats.students} students paid this month · MAD {ezStats.totalRevenue.toLocaleString()} collected</div>
                            </div>
                            {/* Unpaid alert */}
                            {ezStats.unpaidCount > 0 && (
                              <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                                <span className="text-rose-500 text-sm">⚠️</span>
                                <span className="text-xs font-semibold text-rose-700">{ezStats.unpaidCount} student{ezStats.unpaidCount > 1 ? 's' : ''} have unpaid fees this month</span>
                              </div>
                            )}
                            {/* CTA */}
                            <button onClick={()=>{setCurrentOrgId('educazen');setPage('dashboard');}}
                              className="w-full py-2 rounded-xl text-sm font-bold border transition-all"
                              style={{color:'#C2185B',borderColor:'rgba(194,24,91,.3)',background:'rgba(194,24,91,.05)'}}
                              onMouseEnter={e=>{e.currentTarget.style.background='#C2185B';e.currentTarget.style.color='white';}}
                              onMouseLeave={e=>{e.currentTarget.style.background='rgba(194,24,91,.05)';e.currentTarget.style.color='#C2185B';}}>
                              Open EducaZen Dashboard →
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ── Recent Activity (read-only feed) ── */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 card">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-bold text-sm text-eiden-deep">Recent Activity</h3>
                              <p className="text-[11px] text-gray-400 mt-0.5">Latest actions across all client orgs</p>
                            </div>
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                            </span>
                          </div>
                          <div className="space-y-2">
                            {activities.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-6 italic">No activity recorded yet.</p>
                            ) : activities.slice(0, 7).map(a => (
                              <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="w-7 h-7 rounded-full bg-eiden-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <ActivityIcon size={11} className="text-eiden-teal" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-700">
                                    <span className="text-eiden-teal">{a.action}</span> · {a.targetType} — <span className="text-gray-900">{a.targetName}</span>
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{a.userName} · {new Date(a.timestamp).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ── System / Health panel ── */}
                        <div className="card space-y-4">
                          <div>
                            <h3 className="font-bold text-sm text-eiden-deep mb-0.5">System Status</h3>
                            <p className="text-[11px] text-gray-400">Infrastructure & integrations</p>
                          </div>
                          <div className="space-y-3">
                            {[
                              { label: 'Supabase Database', ok: true,  note: 'Connected' },
                              { label: 'Lunja Village',     ok: true,  note: 'Online' },
                              { label: 'EducaZen Kids',     ok: true,  note: 'Online' },
                              { label: 'Vercel Deployment', ok: true,  note: 'Live' },
                            ].map(s => (
                              <div key={s.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${s.ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                  <span className="text-xs font-medium text-gray-700">{s.label}</span>
                                </div>
                                <span className={`text-[10px] font-bold ${s.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{s.note}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-gray-50">
                            <p className="text-[10px] text-gray-400">Last checked: just now</p>
                            <div className="mt-3 flex gap-2">
                              <button onClick={() => setPage('organizations')} className="flex-1 btn text-[10px] py-1.5">Manage Clients</button>
                              <button onClick={() => setPage('users')} className="flex-1 btn text-[10px] py-1.5">Users</button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Revenue chart (Lunja) ── */}
                      <div className="card">
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <h3 className="font-bold text-sm text-eiden-deep">Lunja Village — Booking Revenue</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Last 7 months · read-only view</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <span className="w-2 h-2 bg-eiden-teal rounded-full" /> MAD
                          </div>
                        </div>
                        <div className="h-[180px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#9ca3af',fontWeight:600}} dy={10} />
                              <YAxis hide />
                              <Tooltip cursor={{fill:'#f9fafb'}} contentStyle={{borderRadius:'8px',border:'none',boxShadow:'0 10px 15px -3px rgb(0 0 0/.1)'}} formatter={(v:any)=>[`MAD ${Number(v).toLocaleString()}`,'Revenue']} />
                              <Bar dataKey="value" radius={[4,4,0,0]}>
                                {revenueData.map((_,i) => <Cell key={i} fill={i===revenueData.length-1?'#0C5752':'#E5E7EB'} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                    </div>
                    );
                  })()}

                  {page === 'dashboard' && (role !== 'superadmin' || currentOrgId === 'lunja') && (
                    <div className="space-y-8">
                      <div>
                        <h1 className="text-lg sm:text-2xl font-bold text-ink">{role === 'superadmin' ? 'Lunja Village — Overview' : 'Good morning, Team'}</h1>
                        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · Lunja Village Resort</p>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard title="Active Guests" value={guests.filter(g => g.status === 'In-house').length.toString()} change={`${guests.filter(g => g.status === 'Arriving').length} arriving`} trend="up" onClick={() => setPage('guests')} />
                        <StatCard title="Total Bookings" value={bookings.length.toString()} change={`${bookings.filter(b => b.status === 'Pending').length} pending`} trend="neutral" onClick={() => setPage('bookings')} />
                        <StatCard title="Open Tasks" value={tasks.filter(t => !t.done).length.toString()} change={`${tasks.filter(t => t.urgent && !t.done).length} urgent`} trend="up" onClick={() => setPage('tasks')} />
                        <StatCard title="Revenue (Total)" value={`MAD ${bookings.reduce((acc, b) => acc + b.amount, 0).toLocaleString()}`} change={`${leads.filter(l => l.status === 'Qualified').length} leads`} trend="up" onClick={() => setPage('revenue')} />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <div className="card overflow-hidden p-0">
                          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                            <button onClick={() => setPage('guests')} className="font-bold text-sm hover:text-keppel transition-colors">Today's Arrivals</button>
                            <Badge status={`${guests.filter(g => g.status === 'Arriving').length} expected`} />
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                                <tr><th className="px-4 py-3">Guest</th><th className="px-4 py-3">Room</th><th className="px-4 py-3">Nights</th><th className="px-4 py-3">Status</th></tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {guests.slice(0, 4).map((guest, i) => (
                                  <tr key={guest.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setPage('guests')}>
                                    <td className="px-4 py-3 flex items-center gap-3">
                                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold", i % 2 === 0 ? "bg-keppel/20 text-keppel" : "bg-amber/20 text-amber-700")}>{guest.initials}</div>
                                      <span className="font-medium">{guest.name}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">Villa {i + 1}</td>
                                    <td className="px-4 py-3 text-gray-600">{3 + i}</td>
                                    <td className="px-4 py-3"><Badge status={i % 2 === 0 ? "Checked in" : "Arriving 3pm"} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="card">
                          <div className="flex items-center justify-between mb-6">
                            <button onClick={() => setPage('tasks')} className="font-bold text-sm text-ink hover:text-keppel transition-colors">Open Staff Tasks</button>
                            <button onClick={() => setPage('tasks')} className="text-xs text-keppel font-bold hover:underline">View all</button>
                          </div>
                          <div className="space-y-4">
                            {tasks.slice(0, 4).map(task => (
                              <div key={task.id} className="flex items-start gap-3 group cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition-colors" onClick={() => setPage('tasks')}>
                                <button className={cn("mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all", task.done ? "bg-keppel border-keppel text-white" : "border-gray-200 group-hover:border-keppel")}>
                                  {task.done && <CheckSquare size={12} />}
                                </button>
                                <div className="flex-1">
                                  <div className={cn("text-sm font-medium", task.done && "text-gray-400 line-through")}>{task.name}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">{task.department} · Due {task.due}</div>
                                </div>
                                {task.urgent && <Badge status="Urgent" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="card">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold text-sm text-ink">Revenue — last 7 months</h3>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <span className="w-2 h-2 bg-brand-primary rounded-full" /> MAD
                          </div>
                        </div>
                        <div className="h-[200px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                              <YAxis hide />
                              <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {revenueData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === revenueData.length - 1 ? 'var(--color-brand-primary)' : '#E5E7EB'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                  {page === 'client-board' && (
                    <div className="space-y-6">
                      <ClientBoard currentOrgId={currentOrgId} userRole={userRole!} />
                    </div>
                  )}

                  {page === 'organizations' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h1 className="text-lg sm:text-2xl font-bold text-ink">Client Organizations</h1>
                          <p className="text-sm text-gray-500">Manage tenants and their CRM instances</p>
                        </div>
                        <button 
                          onClick={() => setShowNewOrgForm(true)}
                          className="btn btn-coral flex items-center gap-2"
                        >
                          <Plus size={16} /> Add Organization
                        </button>
                      </div>

                      {showNewOrgForm && (
                        <div className="card border-eiden-gold/20 bg-eiden-gold/5 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-ink">Register New Client</h3>
                            <button onClick={() => setShowNewOrgForm(false)} className="text-gray-400 hover:text-ink">
                              <X size={20} />
                            </button>
                          </div>
                          <form onSubmit={handleSaveOrg} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Organization Name</label>
                              <input 
                                required
                                type="text" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newOrg.name}
                                onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Custom Slug (optional)</label>
                              <input 
                                type="text" 
                                placeholder="e.g. my-client-slug"
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newOrg.slug}
                                onChange={e => setNewOrg({...newOrg, slug: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Email</label>
                              <input 
                                required
                                type="email" 
                                placeholder="admin@client.com"
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newOrg.email}
                                onChange={e => setNewOrg({...newOrg, email: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Password</label>
                              <input 
                                required
                                type="password" 
                                placeholder="Set password"
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newOrg.password}
                                onChange={e => setNewOrg({...newOrg, password: e.target.value})}
                              />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                              <button type="button" onClick={() => setShowNewOrgForm(false)} className="btn bg-white text-gray-500 border-gray-100">Cancel</button>
                              <button type="submit" className="btn btn-coral flex items-center gap-2">
                                <Plus size={16} /> Create Organization
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {editingOrg && (
                        <div className="card border-keppel/20 bg-keppel/5 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-ink">Edit Organization: {editingOrg.name}</h3>
                            <button onClick={() => setEditingOrg(null)} className="text-gray-400 hover:text-ink">
                              <X size={20} />
                            </button>
                          </div>
                          <form onSubmit={handleUpdateOrg} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Organization Name</label>
                              <input 
                                required
                                type="text" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={editingOrg.name}
                                onChange={e => setEditingOrg({...editingOrg, name: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Slug</label>
                              <input 
                                required
                                type="text" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={editingOrg.slug}
                                onChange={e => setEditingOrg({...editingOrg, slug: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Email</label>
                              <input 
                                required
                                type="email" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={editingOrg.email || ''}
                                onChange={e => setEditingOrg({...editingOrg, email: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Password</label>
                              <input 
                                required
                                type="password" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={editingOrg.password || ''}
                                onChange={e => setEditingOrg({...editingOrg, password: e.target.value})}
                              />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                              <button type="button" onClick={() => setEditingOrg(null)} className="btn bg-white text-gray-500 border-gray-100">Cancel</button>
                              <button type="submit" className="btn btn-keppel text-white flex items-center gap-2">
                                <Check size={16} /> Update Organization
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {organizations.map(org => (
                          <div key={org.id} className="card hover:border-eiden-gold transition-all group relative">
                            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingOrg(org); }}
                                className="p-1.5 bg-white shadow-sm rounded-lg text-gray-400 hover:text-keppel transition-colors"
                              >
                                <Pencil size={12} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteOrg(org.id); }}
                                className="p-1.5 bg-white shadow-sm rounded-lg text-gray-400 hover:text-coral transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div 
                              className="flex items-center gap-4 mb-4 cursor-pointer"
                              onClick={() => {
                                setCurrentOrgId(org.id);
                                setPage('client-board');
                              }}
                            >
                              <div className="w-12 h-12 rounded-xl bg-eiden-teal/10 flex items-center justify-center text-eiden-teal">
                                <Palmtree size={24} />
                              </div>
                              <div>
                                <h3 className="font-bold text-ink group-hover:text-eiden-teal transition-colors">
                                  {org.name}
                                </h3>
                                <p className="text-xs text-gray-400">/{org.slug}</p>
                                {org.email && <p className="text-[10px] text-gray-500 mt-1">{org.email}</p>}
                              </div>
                            </div>
                            
                            {org.password && (
                              <div className="bg-gray-50 rounded-lg p-2 mb-4 flex items-center justify-between">
                                <div>
                                  <div className="text-[8px] font-bold text-gray-400 uppercase">Admin Password</div>
                                  <div className="text-xs font-mono text-ink mt-0.5">{org.password}</div>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(org.password || '');
                                    alert('Password copied!');
                                  }}
                                  className="text-[10px] font-bold text-keppel border border-keppel/20 bg-keppel/5 px-2 py-1 rounded hover:bg-keppel hover:text-white transition-colors"
                                >
                                  Copy
                                </button>
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Users</div>
                              <div className="text-sm font-bold text-ink">
                                {users.filter(u => u.orgId === org.id).length}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {page === 'users' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h1 className="text-lg sm:text-2xl font-bold text-ink">Organization Admins</h1>
                          <p className="text-sm text-gray-500">{organizations.length} registered organizations · click a row to manage</p>
                        </div>
                        <button onClick={() => setShowNewOrgForm(true)} className="btn btn-coral flex items-center gap-2 text-sm">
                          <Plus size={14}/> New Org
                        </button>
                      </div>

                      <div className="card p-0 overflow-hidden table-wrap">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                            <tr>
                              <th className="px-3 sm:px-6 py-3 sm:py-4">Organization</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4">Admin Email</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4">Password</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">Slug</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {organizations.map(org => (
                              <tr key={org.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => setEditingOrg(org)}>
                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center text-brand-primary font-bold text-xs">
                                      {org.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-ink">{org.name}</span>
                                  </div>
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-500">{org.email || '—'}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{org.password || '—'}</code>
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-400 text-xs font-mono hidden sm:table-cell">{org.slug}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => { setCurrentOrgId(org.id); setPage('client-board'); }}
                                    className="btn text-[10px] py-1 px-3"
                                  >
                                    View Board →
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {organizations.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                  No organizations yet. Click "New Org" to add the first one.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}


                  {page === 'guests' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h1 className="text-lg sm:text-2xl font-bold text-ink">Contacts & CRM</h1>
                          <p className="text-sm text-gray-500">Manage guest profiles and relationship history</p>
                        </div>
                        <button 
                          onClick={() => setShowNewGuestForm(true)}
                          className="btn btn-coral flex items-center gap-2 w-fit"
                        >
                          <Plus size={16} /> New Contact
                        </button>
                      </div>

                      {showNewGuestForm && (
                        <div className="card border-keppel/20 bg-keppel/5 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-ink">Add New Guest</h3>
                            <button 
                              onClick={() => setShowNewGuestForm(false)}
                              className="text-gray-400 hover:text-ink"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          <form onSubmit={handleSaveGuest} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                              <input 
                                required
                                type="text" 
                                placeholder="e.g. John Doe"
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={newGuest.name}
                                onChange={e => setNewGuest({...newGuest, name: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                              <input 
                                required
                                type="email" 
                                placeholder="john@example.com"
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={newGuest.email}
                                onChange={e => setNewGuest({...newGuest, email: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
                              <input 
                                type="tel" 
                                placeholder="+212 ..."
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={newGuest.phone}
                                onChange={e => setNewGuest({...newGuest, phone: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company / Organization</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Acme Corp"
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={newGuest.company}
                                onChange={e => setNewGuest({...newGuest, company: e.target.value})}
                              />
                            </div>
                            <div className="md:col-span-3 space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Internal Notes</label>
                              <textarea 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20 min-h-[60px]"
                                value={newGuest.notes}
                                onChange={e => setNewGuest({...newGuest, notes: e.target.value})}
                              />
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                              <button 
                                type="button"
                                onClick={() => setShowNewGuestForm(false)}
                                className="btn bg-white text-gray-500 border-gray-100"
                              >
                                Cancel
                              </button>
                              <button 
                                type="submit"
                                disabled={isSavingGuest}
                                className="btn btn-keppel flex items-center gap-2"
                              >
                                {isSavingGuest ? 'Saving...' : <><Plus size={16} /> Save Contact</>}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {editingGuest && (
                        <div className="card border-amber/20 bg-amber/5 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-ink">Edit Guest Profile</h3>
                            <button 
                              onClick={() => setEditingGuest(null)}
                              className="text-gray-400 hover:text-ink"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          <form onSubmit={handleUpdateGuest} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                              <input 
                                required
                                type="text" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber/20"
                                value={editingGuest.name}
                                onChange={e => setEditingGuest({...editingGuest, name: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                              <input 
                                required
                                type="email" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber/20"
                                value={editingGuest.email}
                                onChange={e => setEditingGuest({...editingGuest, email: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Guest Type</label>
                              <select 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber/20"
                                value={editingGuest.type}
                                onChange={e => setEditingGuest({...editingGuest, type: e.target.value as Guest['type']})}
                              >
                                <option value="VIP">VIP</option>
                                <option value="Regular">Regular</option>
                                <option value="New">New</option>
                              </select>
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                              <button 
                                type="button"
                                onClick={() => setEditingGuest(null)}
                                className="btn bg-white text-gray-500 border-gray-100"
                              >
                                Cancel
                              </button>
                              <button 
                                type="submit"
                                disabled={isSavingGuest}
                                className="btn bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-2"
                              >
                                {isSavingGuest ? 'Updating...' : <><Edit size={16} /> Update Guest</>}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <div className="relative flex-1 max-w-sm">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                            type="text" 
                            placeholder="Search guests..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <button className="btn flex items-center gap-2">
                          <Filter size={16} /> Filter
                        </button>
                      </div>

                      <div className="card p-0 overflow-hidden table-wrap">
                        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
                          <table className="w-full text-left text-sm" style={{minWidth:'620px'}}>
                            <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                              <tr>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Guest</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Type</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Stays</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Last Visit</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Spend (total)</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Status</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {filteredGuests.map((guest) => (
                                <tr key={guest.id} className="hover:bg-gray-50 transition-colors group">
                                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-keppel/10 flex items-center justify-center text-keppel font-bold text-xs">
                                        {guest.initials}
                                      </div>
                                      <div>
                                        <div className="font-bold text-ink">{guest.name}</div>
                                        <div className="text-[11px] text-gray-400">{guest.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                                    <Badge status={guest.type} />
                                  </td>
                                  <td className="px-6 py-4 font-medium text-gray-600">{guest.stays}</td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-500">{guest.lastVisit}</td>
                                  <td className="px-6 py-4 font-bold text-ink">MAD {guest.spend.toLocaleString()}</td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                                    <Badge status={guest.status} />
                                  </td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingGuest(guest);
                                          setShowNewGuestForm(false);
                                        }}
                                        className="p-2 text-gray-400 hover:text-amber-600 opacity-0 group-hover:opacity-100 transition-all"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteGuest(guest.id);
                                        }}
                                        className="p-2 text-gray-400 hover:text-coral opacity-0 group-hover:opacity-100 transition-all"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {page === 'bookings' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h1 className="text-lg sm:text-2xl font-bold text-ink">Bookings & Reservations</h1>
                          <p className="text-sm text-gray-500">All accommodation, dining & event bookings</p>
                        </div>
                        <button 
                          onClick={() => setShowNewBookingForm(true)}
                          className="btn btn-coral flex items-center gap-2 w-fit"
                        >
                          <Plus size={16} /> New Booking
                        </button>
                      </div>

                      {showNewBookingForm && (
                        <div className="card border-eiden-gold/20 bg-eiden-gold/5 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-ink">New Reservation</h3>
                            <button onClick={() => setShowNewBookingForm(false)} className="text-gray-400 hover:text-ink">
                              <X size={20} />
                            </button>
                          </div>
                          <form onSubmit={handleSaveBooking} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Guest Name</label>
                              <input 
                                required
                                type="text" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newBooking.guestName}
                                onChange={e => setNewBooking({...newBooking, guestName: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                              <select 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newBooking.type}
                                onChange={e => setNewBooking({...newBooking, type: e.target.value as Booking['type']})}
                              >
                                <option value="Stay">Stay</option>
                                <option value="Dining">Dining</option>
                                <option value="Event">Event</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount (MAD)</label>
                              <input 
                                required
                                type="number" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newBooking.amount}
                                onChange={e => setNewBooking({...newBooking, amount: Number(e.target.value)})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Check-in</label>
                              <input 
                                required
                                type="date" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newBooking.checkIn}
                                onChange={e => setNewBooking({...newBooking, checkIn: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Check-out</label>
                              <input 
                                type="date" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newBooking.checkOut}
                                onChange={e => setNewBooking({...newBooking, checkOut: e.target.value})}
                              />
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                              <button type="button" onClick={() => setShowNewBookingForm(false)} className="btn bg-white text-gray-500 border-gray-100">Cancel</button>
                              <button type="submit" className="btn btn-coral flex items-center gap-2">
                                <Plus size={16} /> Save Booking
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      <div className="card p-0 overflow-hidden table-wrap">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm" style={{minWidth:'680px'}}>
                            <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                              <tr>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Ref</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Guest</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Type</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Check-in</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Check-out</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Amount</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {bookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-[11px] text-gray-400">{booking.ref}</td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-ink">{booking.guestName}</td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600">{booking.type}</td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-500">{booking.checkIn}</td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-500">{booking.checkOut}</td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-ink">MAD {booking.amount.toLocaleString()}</td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                                    <Badge status={booking.status} />
                                  </td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button 
                                        onClick={() => setEditingBooking(booking)}
                                        className="p-2 text-gray-400 hover:text-keppel transition-colors"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteBooking(booking.id)}
                                        className="p-2 text-gray-400 hover:text-coral transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {editingBooking && (
                        <div className="card border-keppel/20 bg-keppel/5 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-ink">Edit Booking: {editingBooking.ref}</h3>
                            <button onClick={() => setEditingBooking(null)} className="text-gray-400 hover:text-ink">
                              <X size={20} />
                            </button>
                          </div>
                          <form onSubmit={handleUpdateBooking} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Guest Name</label>
                              <input 
                                required
                                type="text" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={editingBooking.guestName}
                                onChange={e => setEditingBooking({...editingBooking, guestName: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
                              <select 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={editingBooking.type}
                                onChange={e => setEditingBooking({...editingBooking, type: e.target.value as Booking['type']})}
                              >
                                <option value="Stay">Stay</option>
                                <option value="Dining">Dining</option>
                                <option value="Event">Event</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount (MAD)</label>
                              <input 
                                required
                                type="number" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={editingBooking.amount}
                                onChange={e => setEditingBooking({...editingBooking, amount: Number(e.target.value)})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Check-in</label>
                              <input 
                                required
                                type="date" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={editingBooking.checkIn}
                                onChange={e => setEditingBooking({...editingBooking, checkIn: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Check-out</label>
                              <input 
                                type="date" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={editingBooking.checkOut}
                                onChange={e => setEditingBooking({...editingBooking, checkOut: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</label>
                              <select 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                                value={editingBooking.status}
                                onChange={e => setEditingBooking({...editingBooking, status: e.target.value as Booking['status']})}
                              >
                                <option value="Confirmed">Confirmed</option>
                                <option value="Pending">Pending</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                              <button type="button" onClick={() => setEditingBooking(null)} className="btn bg-white text-gray-500 border-gray-100">Cancel</button>
                              <button type="submit" className="btn btn-keppel text-white flex items-center gap-2">
                                <Check size={16} /> Update Booking
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  )}

                  {page === 'tasks' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h1 className="text-lg sm:text-2xl font-bold text-ink">Tasks</h1>
                          <p className="text-sm text-gray-500">Today · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 w-full sm:w-auto">
                          <div className="flex flex-wrap bg-gray-100 p-1 rounded-lg gap-0.5">
                            {[
                              { id: 'all', label: 'All' },
                              { id: 'me', label: 'Mine' },
                              { id: 'today', label: 'Today' },
                              { id: 'urgent', label: 'Urgent' }
                            ].map(f => (
                              <button
                                key={f.id}
                                onClick={() => setTaskFilter(f.id as any)}
                                className={cn(
                                  "px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all whitespace-nowrap",
                                  taskFilter === f.id ? "bg-white text-keppel shadow-sm" : "text-gray-400 hover:text-gray-600"
                                )}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setShowNewTaskForm(true)}
                            className="btn btn-coral flex items-center gap-2 w-fit whitespace-nowrap"
                          >
                            <Plus size={16} /> New Task
                          </button>
                        </div>
                      </div>

                      {showNewTaskForm && (
                        <div className="card border-eiden-gold/20 bg-eiden-gold/5 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-ink">Assign New Task</h3>
                            <button onClick={() => setShowNewTaskForm(false)} className="text-gray-400 hover:text-ink">
                              <X size={20} />
                            </button>
                          </div>
                          <form onSubmit={handleSaveTask} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Task Description</label>
                              <input 
                                required
                                type="text" 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newTask.name}
                                onChange={e => setNewTask({...newTask, name: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Department</label>
                              <select 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newTask.department}
                                onChange={e => setNewTask({...newTask, department: e.target.value as Task['department']})}
                              >
                                <option value="Housekeeping">Housekeeping</option>
                                <option value="F&B">F&B</option>
                                <option value="Concierge">Concierge</option>
                                <option value="Maintenance">Maintenance</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assigned To</label>
                              <input
                                required
                                type="text"
                                placeholder="Enter staff name"
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newTask.assignee}
                                onChange={e => setNewTask({...newTask, assignee: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due Time</label>
                              <input 
                                required
                                type="text" 
                                placeholder="e.g. 2:00pm"
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20"
                                value={newTask.due}
                                onChange={e => setNewTask({...newTask, due: e.target.value})}
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                              <input 
                                type="checkbox" 
                                id="urgent"
                                className="w-4 h-4 text-coral border-gray-300 rounded focus:ring-coral"
                                checked={newTask.urgent}
                                onChange={e => setNewTask({...newTask, urgent: e.target.checked})}
                              />
                              <label htmlFor="urgent" className="text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer">Urgent</label>
                            </div>
                            <div className="md:col-span-3 space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Task Details / Notes</label>
                              <textarea 
                                className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eiden-gold/20 min-h-[60px]"
                                value={newTask.notes}
                                onChange={e => setNewTask({...newTask, notes: e.target.value})}
                              />
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                              <button type="button" onClick={() => setShowNewTaskForm(false)} className="btn bg-white text-gray-500 border-gray-100">Cancel</button>
                              <button type="submit" className="btn btn-coral flex items-center gap-2">
                                <Plus size={16} /> Assign Task
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {['Housekeeping', 'F&B', 'Concierge', 'Maintenance'].map(dept => {
                          const deptTasks = tasks.filter(t => {
                            if (t.department !== dept) return false;
                            if (taskFilter === 'me') return t.assignee === user?.displayName;
                            if (taskFilter === 'urgent') return t.urgent;
                            if (taskFilter === 'today') return t.date === new Date().toISOString().split('T')[0];
                            return true;
                          });
                          
                          return (
                            <div key={dept} className="card">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-sm">{dept}</h3>
                                <Badge status={`${deptTasks.filter(t => !t.done).length} open`} />
                              </div>
                              <div className="space-y-3">
                                {deptTasks.map(task => (
                                <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                  <button 
                                    onClick={() => handleToggleTask(task.id, !task.done)}
                                    className={cn(
                                      "mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                      task.done ? "bg-keppel border-keppel text-white" : "border-gray-200 hover:border-keppel"
                                    )}
                                  >
                                    {task.done && <CheckSquare size={12} />}
                                  </button>
                                  <div className="flex-1">
                                    <div className={cn("text-sm font-medium", task.done && "text-gray-400 line-through")}>{task.name}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">Due {task.due} · {task.assignee}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => setEditingTask(task)}
                                      className="p-1 text-gray-400 hover:text-keppel transition-colors"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="p-1 text-gray-400 hover:text-coral transition-colors"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                  {editingTask && (
                    <div className="card border-keppel/20 bg-keppel/5 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-ink">Edit Task: {editingTask.name}</h3>
                        <button onClick={() => setEditingTask(null)} className="text-gray-400 hover:text-ink">
                          <X size={20} />
                        </button>
                      </div>
                      <form onSubmit={handleUpdateTask} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Task Description</label>
                          <input 
                            required
                            type="text" 
                            className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                            value={editingTask.name}
                            onChange={e => setEditingTask({...editingTask, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Department</label>
                          <select 
                            className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                            value={editingTask.department}
                            onChange={e => setEditingTask({...editingTask, department: e.target.value as Task['department']})}
                          >
                            <option value="Housekeeping">Housekeeping</option>
                            <option value="F&B">F&B</option>
                            <option value="Concierge">Concierge</option>
                            <option value="Maintenance">Maintenance</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assignee</label>
                          <input 
                            required
                            type="text" 
                            className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                            value={editingTask.assignee}
                            onChange={e => setEditingTask({...editingTask, assignee: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due Time</label>
                          <input 
                            required
                            type="text" 
                            className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-keppel/20"
                            value={editingTask.due}
                            onChange={e => setEditingTask({...editingTask, due: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input 
                            type="checkbox" 
                            id="edit-urgent"
                            className="w-4 h-4 text-coral border-gray-300 rounded focus:ring-coral"
                            checked={editingTask.urgent}
                            onChange={e => setEditingTask({...editingTask, urgent: e.target.checked})}
                          />
                          <label htmlFor="edit-urgent" className="text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer">Urgent</label>
                        </div>
                        <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                          <button type="button" onClick={() => setEditingTask(null)} className="btn bg-white text-gray-500 border-gray-100">Cancel</button>
                          <button type="submit" className="btn btn-keppel text-white flex items-center gap-2">
                            <Check size={16} /> Update Task
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {page === 'calendar' && (() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = today.getMonth();
                    const monthName = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                    // First day of month (0=Sun..6=Sat), convert to Mon-based (0=Mon..6=Sun)
                    const firstDow = new Date(year, month, 1).getDay();
                    const startOffset = (firstDow === 0 ? 6 : firstDow - 1);
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

                    return (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h1 className="text-lg sm:text-2xl font-bold text-ink">Operations Calendar</h1>
                            <p className="text-sm text-gray-500">{monthName} · bookings & tasks</p>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto -webkit-overflow-scrolling-touch">
                          <div className="min-w-[600px]">
                          <div className="grid grid-cols-7 gap-px bg-gray-100">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                              <div key={day} className="bg-gray-50 p-2 sm:p-3 text-center text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {day}
                              </div>
                            ))}
                            {Array.from({ length: totalCells }).map((_, i) => {
                              const dayNum = i - startOffset + 1;
                              const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
                              const isToday = isCurrentMonth && dayNum === today.getDate();
                              const dateStr = isCurrentMonth
                                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                                : '';
                              const dayBookings = dateStr ? bookings.filter(b => b.checkIn === dateStr || b.checkOut === dateStr) : [];
                              const dayTasks = dateStr ? tasks.filter(t => t.date === dateStr) : [];

                              return (
                                <div key={i} className={cn(
                                  "bg-white min-h-[100px] p-2 transition-colors",
                                  !isCurrentMonth ? "opacity-30 bg-gray-50" : "hover:bg-gray-50"
                                )}>
                                  <div className={cn(
                                    "text-xs font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                                    isToday ? "bg-coral text-white" : "text-gray-500"
                                  )}>
                                    {isCurrentMonth ? dayNum : ''}
                                  </div>
                                  <div className="space-y-1">
                                    {dayBookings.slice(0, 2).map(b => (
                                      <div key={b.id} className="text-[9px] px-1.5 py-0.5 bg-keppel/10 text-keppel rounded truncate font-medium">
                                        🏨 {b.guestName}
                                      </div>
                                    ))}
                                    {dayTasks.slice(0, 2).map(t => (
                                      <div key={t.id} className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded truncate font-medium">
                                        ✅ {t.name}
                                      </div>
                                    ))}
                                    {(dayBookings.length + dayTasks.length) > 4 && (
                                      <div className="text-[9px] text-gray-400">+{dayBookings.length + dayTasks.length - 4} more</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>{/* closes grid */}
                          </div>{/* closes min-w wrapper */}
                        </div>{/* closes overflow-x-auto */}

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-keppel/20 inline-block"/>Booking check-in/out</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 inline-block"/>Task due</span>
                        </div>
                      </div>
                    );
                  })()}

                  {page === 'revenue' && (() => {
                    const now = new Date();
                    const thisMonth = now.getMonth();
                    const thisYear = now.getFullYear();
                    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
                    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

                    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
                    const monthBookings = bookings.filter(b => {
                      if (!b.checkIn) return false;
                      const d = new Date(b.checkIn);
                      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                    });
                    const lastMonthBookings = bookings.filter(b => {
                      if (!b.checkIn) return false;
                      const d = new Date(b.checkIn);
                      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
                    });
                    const mtd = monthBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
                    const lastMtd = lastMonthBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
                    const mtdChange = lastMtd > 0 ? Math.round(((mtd - lastMtd) / lastMtd) * 100) : 0;
                    const avgPerBooking = bookings.length > 0 ? Math.round(totalRevenue / bookings.length) : 0;
                    const pendingBookings = bookings.filter(b => b.status === 'Pending');
                    const pendingAmount = pendingBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

                    // Revenue by booking type
                    const byType: Record<string, number> = {};
                    bookings.forEach(b => {
                      const t = b.type || 'Stay';
                      byType[t] = (byType[t] || 0) + (Number(b.amount) || 0);
                    });
                    const typeColors: Record<string, string> = {
                      Stay: 'bg-brand-primary',
                      Dining: 'bg-amber',
                      Event: 'bg-brand-secondary',
                    };
                    const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
                    const maxType = typeEntries[0]?.[1] || 1;

                    return (
                      <div className="space-y-8">
                        <div>
                          <h1 className="text-lg sm:text-2xl font-bold text-ink">Revenue & Payments</h1>
                          <p className="text-sm text-gray-500">Financial overview · {now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                          <StatCard
                            title="Month to date"
                            value={`MAD ${mtd.toLocaleString()}`}
                            change={mtdChange >= 0 ? `+${mtdChange}% vs last month` : `${mtdChange}% vs last month`}
                            trend={mtdChange >= 0 ? 'up' : 'down'}
                          />
                          <StatCard
                            title="Total Revenue"
                            value={`MAD ${totalRevenue.toLocaleString()}`}
                            change={`${bookings.length} bookings`}
                            trend="neutral"
                          />
                          <StatCard
                            title="Avg per Booking"
                            value={`MAD ${avgPerBooking.toLocaleString()}`}
                            change={bookings.length > 0 ? 'Calculated from DB' : 'No bookings yet'}
                            trend="up"
                          />
                          <StatCard
                            title="Pending Payments"
                            value={`MAD ${pendingAmount.toLocaleString()}`}
                            change={`${pendingBookings.length} pending`}
                            trend={pendingAmount > 0 ? 'down' : 'up'}
                          />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                          <div className="card">
                            <h3 className="font-bold text-sm mb-6">Revenue by Booking Type</h3>
                            {typeEntries.length === 0 ? (
                              <p className="text-sm text-gray-400 italic">No booking data yet.</p>
                            ) : (
                              <div className="space-y-5">
                                {typeEntries.map(([label, value]) => (
                                  <div key={label}>
                                    <div className="flex justify-between text-xs mb-2">
                                      <span className="text-gray-500 font-medium">{label}</span>
                                      <span className="font-bold">MAD {value.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.round((value / maxType) * 100)}%` }}
                                        className={cn("h-full rounded-full", typeColors[label] || 'bg-brand-primary')}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="card p-0 overflow-hidden table-wrap">
                            <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                              <h3 className="font-bold text-sm">Pending / Unconfirmed Bookings</h3>
                              <span className="text-xs text-gray-400">{pendingBookings.length} items</span>
                            </div>
                            <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm" style={{minWidth:'360px'}}>
                              <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                                <tr>
                                  <th className="px-4 py-3">Guest</th>
                                  <th className="px-4 py-3">Amount</th>
                                  <th className="px-4 py-3">Check-in</th>
                                  <th className="px-4 py-3"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {pendingBookings.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs italic">No pending bookings.</td>
                                  </tr>
                                ) : pendingBookings.map(b => (
                                  <tr key={b.id}>
                                    <td className="px-4 py-3 font-medium">{b.guestName}</td>
                                    <td className="px-4 py-3 font-bold">MAD {Number(b.amount).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-gray-500">{b.checkIn}</td>
                                    <td className="px-4 py-3 text-right">
                                      <button
                                        onClick={() => handleSendReminder(b.guestName)}
                                        className="btn text-[10px] py-1"
                                      >
                                        Remind
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            </div>
                          </div>
                        </div>

                        {/* Monthly bar chart */}
                        <div className="card">
                          <h3 className="font-bold text-sm mb-6">Monthly Revenue Trend</h3>
                          {revenueData.every(d => d.value === 0) ? (
                            <p className="text-sm text-gray-400 italic">Add bookings to see revenue trends.</p>
                          ) : (
                            <ResponsiveContainer width="100%" height={240}>
                              <BarChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(v: any) => [`MAD ${Number(v).toLocaleString()}`, 'Revenue']} />
                                <Bar dataKey="value" radius={[4,4,0,0]}>
                                  {revenueData.map((_, i) => (
                                    <Cell key={i} fill={i === revenueData.length - 1 ? 'var(--brand-primary)' : '#e5e7eb'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                /* Client Portal */
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="relative overflow-hidden bg-brand-primary rounded-2xl p-8 text-white shadow-lg">
                    <div className="absolute top-1/2 right-8 -translate-y-1/2 text-white/10 pointer-events-none">
                      <LayoutDashboard size={120} />
                    </div>
                    <div className="relative z-10">
                      <h1 className="text-3xl font-brand-head italic mb-2">Welcome back, {user?.displayName?.split(' ')[0] || 'Guest'}</h1>
                      <p className="opacity-90 text-sm">
                        {bookings.length > 0 
                          ? `Your stay at ${organizations.find(o => o.id === userOrgId)?.name || 'Lunja Village'} · ${bookings[0].ref} · ${bookings[0].checkIn} – ${bookings[0].checkOut}`
                          : "Welcome to your guest portal"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="card text-center">
                      <div className="text-lg sm:text-2xl font-bold text-ink">{bookings.length > 0 ? 'Active' : '0'}</div>
                      <div className="text-xs text-gray-500 mt-1">Current bookings</div>
                    </div>
                    <div className="card text-center">
                      <div className="text-lg sm:text-2xl font-bold text-ink">{myGuestProfile?.stays || 0} stays</div>
                      <div className="text-xs text-gray-500 mt-1">Total visits</div>
                    </div>
                    <div className="card text-center">
                      <div className="text-2xl font-bold text-brand-primary">{myGuestProfile?.type || 'Guest'}</div>
                      <div className="text-xs text-gray-500 mt-1">Guest tier</div>
                      <div className="mt-2 badge bg-brand-primary/15 text-brand-primary">{myGuestProfile?.type === 'VIP' ? 'Premium Member' : 'Valued Guest'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Stay Details */}
                    <div className="card">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                        <CalendarDays size={16} className="text-brand-primary" /> My stay details
                      </h3>
                      <div className="space-y-4">
                        {bookings.length > 0 ? (
                          [
                            { label: 'Reference', value: bookings[0].ref, bold: true },
                            { label: 'Check-in', value: bookings[0].checkIn },
                            { label: 'Check-out', value: bookings[0].checkOut },
                            { label: 'Type', value: bookings[0].type },
                            { label: 'Amount', value: `$${bookings[0].amount.toLocaleString()}` },
                            { label: 'Status', value: bookings[0].status, color: 'text-brand-primary font-bold' },
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between items-baseline py-1 border-b border-gray-50 last:border-0">
                              <span className="text-xs text-gray-400">{item.label}</span>
                              <span className={cn("text-sm text-ink", item.bold && "font-bold", item.color)}>{item.value}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 text-center py-4">No active bookings found.</p>
                        )}
                      </div>
                    </div>

                    {/* Dining */}
                    <div className="card">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          <Utensils size={16} className="text-amber" /> Dining reservations
                        </h3>
                        <button className="btn btn-coral text-[10px] py-1">+ Reserve</button>
                      </div>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-2 h-2 rounded-full bg-brand-primary mt-1.5 shrink-0" />
                          <div>
                            <div className="text-sm font-medium">Sunset dinner · Terrace</div>
                            <div className="text-[11px] text-gray-500">Tue 14 Apr · 7:30pm · 2 pax</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-2 h-2 rounded-full bg-amber mt-1.5 shrink-0" />
                          <div>
                            <div className="text-sm font-medium">Breakfast included daily</div>
                            <div className="text-[11px] text-gray-500">Each morning · 7:00–10:30am</div>
                          </div>
                        </div>
                        <button className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-[11px] text-gray-400 hover:bg-gray-50 transition-colors">
                          Add another reservation...
                        </button>
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="card">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                        <Palmtree size={16} className="text-brand-secondary" /> Activities & excursions
                      </h3>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-2 h-2 rounded-full bg-brand-secondary mt-1.5 shrink-0" />
                          <div>
                            <div className="text-sm font-medium">Camel trek — Sahara dunes</div>
                            <div className="text-[11px] text-gray-500">Wed 15 Apr · 6:00am · 3 hrs</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-2 h-2 rounded-full bg-brand-primary mt-1.5 shrink-0" />
                          <div>
                            <div className="text-sm font-medium">Spa massage (60 min)</div>
                            <div className="text-[11px] text-gray-500">Thu 16 Apr · 3:00pm</div>
                          </div>
                        </div>
                        <button className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-[11px] text-gray-400 hover:bg-gray-50 transition-colors">
                          Browse experiences...
                        </button>
                      </div>
                    </div>

                    {/* Past Stays */}
                    <div className="card p-0 overflow-hidden table-wrap">
                      <div className="p-4 border-b border-gray-50">
                        <h3 className="font-bold text-sm">Past stays</h3>
                      </div>
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                          <tr>
                            <th className="px-4 py-2">Reference</th>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {bookings.slice(1).map((stay, i) => (
                            <tr key={i}>
                              <td className="px-4 py-3 font-medium">{stay.ref}</td>
                              <td className="px-4 py-3 text-gray-600">{stay.checkIn}</td>
                              <td className="px-4 py-3 text-gray-500">${stay.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                          {bookings.length <= 1 && (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-xs italic">
                                No past stays recorded.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </>
    )}
  </div>
</div>
  );
}
