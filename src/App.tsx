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

const StatCard = ({ title, value, change, trend }: { title: string, value: string, change: string, trend: 'up' | 'down' | 'neutral' }) => (
  <div className="card flex flex-col justify-between">
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

  // Multi-tenancy states
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);

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

  // Auth Listener (Modified for Password Login)
  React.useEffect(() => {
    // Ensure we have a session for security rules
    
    // Check local storage for session
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

    // 1. Check Super Admin (Fixed)
    if (loginEmail === 'admin@eiden-group.com' && loginPassword === 'superadmin123') {
      const userData = {
        uid: 'superadmin',
        email: loginEmail,
        displayName: 'Super Admin',
        role: 'superadmin',
        orgId: null
      };
      setUser(userData);
      setUserRole('superadmin');
      setRole('superadmin');
      setUserOrgId(null);
      setCurrentOrgId(null);
      setPage('dashboard');
      localStorage.setItem('eiden_user', JSON.stringify(userData));
      return;
    }

    // 2. Check Client (Fixed for now)
    if (loginEmail === 'client@eiden-group.com' && loginPassword === 'client123') {
      const userData = {
        uid: 'client',
        email: loginEmail,
        displayName: 'Lunja Client',
        role: 'client',
        orgId: 'lunja'
      };
      setUser(userData);
      setUserRole('client');
      setRole('client');
      setUserOrgId('lunja');
      setCurrentOrgId('lunja');
      setPage('client-overview');
      localStorage.setItem('eiden_user', JSON.stringify(userData));
      return;
    }

    // 2b. EducaZen Parent Portal
    if (loginEmail === 'parent@educazen.com' && loginPassword === 'parent123') {
      const userData = {
        uid: 'educazen-parent',
        email: loginEmail,
        displayName: 'Parent EducaZen',
        role: 'client',
        orgId: 'educazen'
      };
      setUser(userData);
      setUserRole('client');
      setRole('client');
      setUserOrgId('educazen');
      setCurrentOrgId('educazen');
      setPage('dashboard');
      localStorage.setItem('eiden_user', JSON.stringify(userData));
      return;
    }

    // 3. Check Organizations (Dynamic Admins)
    try {
      const { data, error } = await supabase.from('organizations').select('*').eq('email', loginEmail).limit(1);
      
      if (data && data.length > 0) {
        const orgData = data[0];
        if (orgData.password === loginPassword) {
           const userData = {
             uid: orgData.id,
             email: loginEmail,
             displayName: `${orgData.name} Admin`,
             role: 'admin',
             orgId: orgData.id
           };
          setUser(userData);
          setUserRole('admin');
          setRole('admin');
          setUserOrgId(orgData.id);
          setCurrentOrgId(orgData.id);
          setPage('dashboard');
          localStorage.setItem('eiden_user', JSON.stringify(userData));
          return;
        }
      }
    } catch (err) {
      console.error('Login error:', err);
    }

    setLoginError('Invalid email or password.');
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
      <header className="h-16 bg-brand-primary border-b border-brand-secondary/20 flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            className="md:hidden p-2 text-brand-secondary/80 hover:text-brand-secondary transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
          {userOrgId === 'educazen' ? (
            <img src="/educazen.png" alt="EducazenKids" className="h-9 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="text-2xl font-brand-head text-brand-secondary">
              {role === 'superadmin' ? 'Eiden Solutions' : (organizations.find(o => o.id === userOrgId)?.name || 'Lunja Village')}
            </div>
          )}
          <div className="h-4 w-[1px] bg-brand-secondary/30 mx-2" />
          <div className="hidden sm:block text-[10px] font-brand-body uppercase tracking-[0.2em] text-brand-secondary/60">
            {role === 'superadmin' ? 'SuperAdmin Portal' : role === 'admin' ? 'Manager Portal' : 'Guest Portal'}
          </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && userRole === 'superadmin' && (
            <div className="hidden sm:flex items-center gap-4">
              <button 
                onClick={seedData}
                className="btn btn-brand text-[10px] py-1 flex items-center gap-2"
              >
                <Database size={12} /> Seed Data
              </button>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-brand-secondary/20">
                <Palmtree size={14} className="text-brand-secondary" />
                <select 
                  className="bg-transparent text-white text-xs font-brand-body focus:outline-none cursor-pointer"
                  value={currentOrgId || ''}
                  onChange={(e) => setCurrentOrgId(e.target.value || null)}
                >
                  <option value="" className="text-ink">All Organizations</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id} className="text-ink">{org.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 ml-4">
            {!user ? (
              <button 
                onClick={() => setPage('dashboard')}
                className="btn btn-coral"
              >
                Sign In
              </button>
            ) : (
              <>
                <button className="p-2 text-white/60 hover:text-white transition-colors relative">
                  <Bell size={20} />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-brand-secondary rounded-full border-2 border-brand-primary" />
                </button>
                <div className="w-8 h-8 rounded-full bg-brand-secondary/20 flex items-center justify-center text-brand-secondary font-bold text-xs border border-brand-secondary/30 overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} referrerPolicy="no-referrer" />
                  ) : (
                    role === 'superadmin' ? 'SA' : role === 'admin' ? 'AD' : 'GS'
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {!user ? (
          <div className="flex-1 flex items-center justify-center bg-cream/50">
            <div className="text-center max-w-md p-8">
              <div className="w-20 h-20 bg-eiden-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserCircle size={40} className="text-eiden-gold" />
              </div>
              <h2 className="text-3xl font-editorial italic text-ink mb-4">Welcome to Eiden CRM</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">A specialized workspace for managing resort operations, sales leads, and guest relationships.</p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email"
                    placeholder="admin@eiden-group.com"
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral/20 transition-all"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                  <input 
                    type="password"
                    placeholder="Enter password"
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coral/20 transition-all"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {loginError && <p className="text-xs text-coral font-medium">{loginError}</p>}
                <button type="submit" className="w-full btn btn-coral py-4 text-lg shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-3">
                  <UserCircle size={20} />
                  Sign In
                </button>
              </form>
            </div>
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
              {role === 'superadmin' ? 'Global Control' : role === 'admin' ? 'Management' : 'My Stay'}
            </div>
            <nav className="space-y-1" onClick={() => setIsMobileMenuOpen(false)}>
              {role === 'superadmin' ? (
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
              {/* ─── EducaZen Dashboard (admin + parent) ─── */}
              {userOrgId === 'educazen' ? (
                <EducazenDashboard
                  role={role === 'client' ? 'parent' : 'admin'}
                  userEmail={user?.email}
                />
              ) : role === 'admin' || role === 'superadmin' ? (
                <>
                  {page === 'dashboard' && (
                    <div className="space-y-8">
                      <div>
                        <h1 className="text-lg sm:text-2xl font-bold text-ink">Good morning, Team</h1>
                        <p className="text-sm text-gray-500">Monday, 13 April 2026 · Lunja Village Resort</p>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard 
                          title="Active Guests" 
                          value={guests.filter(g => g.status === 'In-house').length.toString()} 
                          change={`${guests.filter(g => g.status === 'Arriving').length} arriving`} 
                          trend="up" 
                        />
                        <StatCard 
                          title="Total Bookings" 
                          value={bookings.length.toString()} 
                          change={`${bookings.filter(b => b.status === 'Pending').length} pending`} 
                          trend="neutral" 
                        />
                        <StatCard 
                          title="Open Tasks" 
                          value={tasks.filter(t => !t.done).length.toString()} 
                          change={`${tasks.filter(t => t.urgent && !t.done).length} urgent`} 
                          trend="up" 
                        />
                        <StatCard 
                          title="Revenue (Total)" 
                          value={`MAD ${bookings.reduce((acc, b) => acc + b.amount, 0).toLocaleString()}`} 
                          change={`${leads.filter(l => l.status === 'Qualified').length} leads`} 
                          trend="up" 
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Arrivals Table */}
                        <div className="card overflow-hidden p-0">
                          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-sm">Today's Arrivals</h3>
                            <Badge status={`${guests.filter(g => g.status === 'Arriving').length} expected`} />
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                                <tr>
                                  <th className="px-4 py-3">Guest</th>
                                  <th className="px-4 py-3">Room</th>
                                  <th className="px-4 py-3">Nights</th>
                                  <th className="px-4 py-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {guests.slice(0, 4).map((guest, i) => (
                                  <tr key={guest.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 flex items-center gap-3">
                                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold", i % 2 === 0 ? "bg-keppel/20 text-keppel" : "bg-amber/20 text-amber-700")}>
                                        {guest.initials}
                                      </div>
                                      <span className="font-medium">{guest.name}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">Villa {i + 1}</td>
                                    <td className="px-4 py-3 text-gray-600">{3 + i}</td>
                                    <td className="px-4 py-3">
                                      <Badge status={i % 2 === 0 ? "Checked in" : "Arriving 3pm"} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Staff Tasks */}
                        <div className="card">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-sm text-ink">Open Staff Tasks</h3>
                            <button onClick={() => setPage('tasks')} className="text-xs text-keppel font-bold hover:underline">View all</button>
                          </div>
                          <div className="space-y-4">
                            {tasks.slice(0, 4).map(task => (
                              <div key={task.id} className="flex items-start gap-3 group">
                                <button className={cn(
                                  "mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                  task.done ? "bg-keppel border-keppel text-white" : "border-gray-200 hover:border-keppel"
                                )}>
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

                      {/* Revenue Chart */}
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
                              <XAxis 
                                dataKey="month" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} 
                                dy={10}
                              />
                              <YAxis hide />
                              <Tooltip 
                                cursor={{ fill: '#f9fafb' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
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
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
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
                          <table className="w-full text-left text-sm">
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
                        <div className="flex items-center gap-2">
                          <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
                            {[
                              { id: 'all', label: 'All' },
                              { id: 'me', label: 'Assigned to me' },
                              { id: 'today', label: 'Due Today' },
                              { id: 'urgent', label: 'Urgent' }
                            ].map(f => (
                              <button
                                key={f.id}
                                onClick={() => setTaskFilter(f.id as any)}
                                className={cn(
                                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                                  taskFilter === f.id ? "bg-white text-keppel shadow-sm" : "text-gray-400 hover:text-gray-600"
                                )}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                          <button 
                            onClick={() => setShowNewTaskForm(true)}
                            className="btn btn-coral flex items-center gap-2 w-fit"
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
                            <table className="w-full text-left text-sm">
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
