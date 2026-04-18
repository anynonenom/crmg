/**
 * EducazenDashboard — Centre Éducatif & Psychosocial
 *
 * SUPABASE SQL — run once in your Supabase SQL editor:
 * ─────────────────────────────────────────────────────
 * create table if not exists ez_students (
 *   id text primary key, org_id text not null,
 *   prenom text, nom text, date_naissance text, sexe text default 'M',
 *   classe text, profil text default 'Standard', statut text default 'Actif',
 *   date_inscription text, montant_mensuel integer default 1200,
 *   parent1_relation text default 'Mère', parent1_prenom text, parent1_nom text,
 *   parent1_email text, parent1_telephone text, parent1_profession text,
 *   parent2_relation text, parent2_prenom text, parent2_nom text,
 *   parent2_email text, parent2_telephone text,
 *   adresse text, ville text, besoins_speciaux text, notes_medicales text,
 *   created_at timestamptz default now()
 * );
 * create table if not exists ez_classes (
 *   id text primary key, org_id text not null, nom text, niveau text,
 *   enseignant text, horaire_debut text, horaire_fin text, jours text,
 *   salle text, capacite integer default 15, created_at timestamptz default now()
 * );
 * create table if not exists ez_attendance (
 *   id text primary key, org_id text not null, student_id text not null,
 *   date text not null, statut text not null, note text,
 *   created_at timestamptz default now()
 * );
 * create table if not exists ez_payments (
 *   id text primary key, org_id text not null, student_id text not null,
 *   mois text not null, montant integer not null, statut text default 'Non payé',
 *   date_paiement text, mode_paiement text, notes text,
 *   created_at timestamptz default now()
 * );
 * create table if not exists ez_assignments (
 *   id text primary key, org_id text not null, titre text not null,
 *   matiere text, classe text, date_limite text, description text,
 *   created_at timestamptz default now()
 * );
 * create table if not exists ez_grades (
 *   id text primary key, org_id text not null, assignment_id text not null,
 *   student_id text not null, note numeric(4,1), commentaire text,
 *   created_at timestamptz default now()
 * );
 * create table if not exists ez_staff (
 *   id text primary key, org_id text not null, prenom text, nom text,
 *   role text, matiere text, email text, telephone text,
 *   date_embauche text, statut text default 'Actif', created_at timestamptz default now()
 * );
 * create table if not exists notifications (
 *   id text primary key, org_id text not null, title text, message text,
 *   type text default 'info', read boolean default false,
 *   created_at timestamptz default now()
 * );
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, Users, Calendar, CheckSquare, CreditCard,
  BookMarked, UserCog, Plus, Search, X, Pencil, Trash2,
  Phone, Mail, Clock, AlertCircle, ChevronDown, ChevronUp,
  GraduationCap, TrendingDown, RefreshCw, Save, Database
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

type EzTab = 'dashboard' | 'eleves' | 'classes' | 'presences' | 'paiements' | 'devoirs' | 'personnel';
type Profil = 'Standard' | 'HPI' | 'TDAH' | 'DYS' | 'TSA';
type StatutPresence = 'Présent' | 'Absent' | 'Retard';
type StatutPaiement = 'Payé' | 'Non payé' | 'Partiel';

export interface EzStudent {
  id: string; org_id: string;
  prenom: string; nom: string; date_naissance: string; sexe: string;
  classe: string; profil: Profil; statut: string;
  date_inscription: string; montant_mensuel: number;
  parent1_relation: string; parent1_prenom: string; parent1_nom: string;
  parent1_email: string; parent1_telephone: string; parent1_profession: string;
  parent2_relation: string; parent2_prenom: string; parent2_nom: string;
  parent2_email: string; parent2_telephone: string;
  adresse: string; ville: string; besoins_speciaux: string; notes_medicales: string;
}

export interface EzClass {
  id: string; org_id: string; nom: string; niveau: string;
  enseignant: string; horaire_debut: string; horaire_fin: string;
  jours: string; salle: string; capacite: number;
}

export interface EzAttendance {
  id: string; org_id: string; student_id: string;
  date: string; statut: StatutPresence; note: string;
}

export interface EzPayment {
  id: string; org_id: string; student_id: string;
  mois: string; montant: number; statut: StatutPaiement;
  date_paiement: string; mode_paiement: string; notes: string;
}

export interface EzAssignment {
  id: string; org_id: string; titre: string; matiere: string;
  classe: string; date_limite: string; description: string;
}

export interface EzGrade {
  id: string; org_id: string; assignment_id: string;
  student_id: string; note: number; commentaire: string;
}

export interface EzStaff {
  id: string; org_id: string; prenom: string; nom: string;
  role: string; matiere: string; email: string; telephone: string;
  date_embauche: string; statut: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const initStudent = (orgId: string): Partial<EzStudent> => ({
  org_id: orgId, prenom: '', nom: '', date_naissance: '', sexe: 'M',
  classe: 'CP-A', profil: 'Standard', statut: 'Actif',
  date_inscription: new Date().toISOString().slice(0, 10),
  montant_mensuel: 1200, parent1_relation: 'Mère',
  parent1_prenom: '', parent1_nom: '', parent1_email: '', parent1_telephone: '',
  parent1_profession: '', parent2_relation: 'Père', parent2_prenom: '',
  parent2_nom: '', parent2_email: '', parent2_telephone: '',
  adresse: '', ville: 'Agadir', besoins_speciaux: '', notes_medicales: '',
});

const profilColors: Record<string, string> = {
  Standard: 'bg-gray-100 text-gray-600',
  HPI: 'bg-amber-50 text-amber-700 border border-amber-200',
  TDAH: 'bg-violet-50 text-violet-700 border border-violet-200',
  DYS: 'bg-teal-50 text-teal-700 border border-teal-200',
  TSA: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const presenceStyle: Record<string, string> = {
  'Présent': 'bg-teal-50 text-teal-700',
  'Absent': 'bg-rose-100 text-rose-700',
  'Retard': 'bg-amber-50 text-amber-700',
};

const payStyle: Record<string, string> = {
  'Payé': 'bg-teal-50 text-teal-700',
  'Non payé': 'bg-rose-100 text-rose-700',
  'Partiel': 'bg-amber-50 text-amber-700',
};

const EZ_ACCENT = '#C2185B';
const EZ_VIOLET = '#7B1FA2';
const EZ_TEAL = '#00897B';
const EZ_GOLD = '#F9A825';
const accentList = [EZ_ACCENT, EZ_VIOLET, EZ_TEAL, EZ_GOLD];
const avatarBg = ['bg-[#FFF0F5] text-[#C2185B]', 'bg-[#F8F0FF] text-[#7B1FA2]', 'bg-[#E8F8F5] text-[#00897B]', 'bg-amber-50 text-amber-700'];

const initials = (p: string, n: string) => `${p?.[0] || ''}${n?.[0] || ''}`.toUpperCase();

const EzLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{children}</span>
);

const EzInput = ({ label, value, onChange, type = 'text', required = false, placeholder = '' }:
  { label: string; value: string | number; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) => (
  <div>
    <EzLabel>{label}{required && ' *'}</EzLabel>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required}
      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none text-sm bg-white"
      style={{ fontFamily: 'Quicksand, sans-serif', borderColor: 'inherit' }}
      onFocus={e => e.target.style.borderColor = EZ_ACCENT}
      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
    />
  </div>
);

const EzSelect = ({ label, value, onChange, options, required = false }:
  { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) => (
  <div>
    <EzLabel>{label}{required && ' *'}</EzLabel>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none text-sm bg-white"
      style={{ fontFamily: 'Quicksand, sans-serif' }}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </div>
);

const EzStatCard = ({ label, value, sub, color, icon: Icon, onClick }: { label: string; value: string | number; sub: string; color: string; icon?: any; onClick?: () => void }) => (
  <div className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 transition-all duration-150 ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`} onClick={onClick}>
    <div className="flex items-start justify-between mb-2">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest" style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.15em' }}>{label}</p>
      {Icon && <Icon size={16} style={{ color }} />}
    </div>
    <p className="text-2xl sm:text-3xl font-extrabold" style={{ fontFamily: 'Nunito, sans-serif', color }}>{value}</p>
    <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'Quicksand, sans-serif' }}>{sub}</p>
  </div>
);

const EzTabBtn = ({ label, icon: Icon, active, onClick, count }: { label: string; icon: any; active: boolean; onClick: () => void; count?: number; [k: string]: any }) => (
  <button onClick={onClick}
    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative ${active ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
    style={{ fontFamily: 'Nunito, sans-serif', backgroundColor: active ? EZ_ACCENT : undefined }}>
    <Icon size={15} />
    <span className="hidden xs:inline">{label}</span>
    {count !== undefined && count > 0 && (
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/30 text-white' : 'bg-rose-100 text-rose-600'}`}>{count}</span>
    )}
  </button>
);

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_CLASSES = (orgId: string): Partial<EzClass>[] => [
  { id: 'ezc1', org_id: orgId, nom: 'CP-A', niveau: 'CP', enseignant: 'Mme. Karima Idrissi', horaire_debut: '08:30', horaire_fin: '12:30', jours: 'Lun–Ven', salle: 'Salle 1', capacite: 12 },
  { id: 'ezc2', org_id: orgId, nom: 'CE1-B', niveau: 'CE1', enseignant: 'M. Tarik Benali', horaire_debut: '08:30', horaire_fin: '12:30', jours: 'Lun–Ven', salle: 'Salle 2', capacite: 12 },
  { id: 'ezc3', org_id: orgId, nom: 'CE2-A', niveau: 'CE2', enseignant: 'Mme. Sanaa Bakkali', horaire_debut: '08:30', horaire_fin: '13:00', jours: 'Lun–Ven', salle: 'Salle 3', capacite: 12 },
  { id: 'ezc4', org_id: orgId, nom: 'CM1-A', niveau: 'CM1', enseignant: 'M. Yassine Mourad', horaire_debut: '08:30', horaire_fin: '13:30', jours: 'Lun–Ven', salle: 'Salle 4', capacite: 12 },
  { id: 'ezc5', org_id: orgId, nom: 'CM2-A', niveau: 'CM2', enseignant: 'Mme. Hind Zouari', horaire_debut: '08:30', horaire_fin: '14:00', jours: 'Lun–Ven', salle: 'Salle 5', capacite: 12 },
];

const SEED_STAFF = (orgId: string): Partial<EzStaff>[] => [
  { id: 'ezs1', org_id: orgId, prenom: 'Karima', nom: 'Idrissi', role: 'Enseignante', matiere: 'Toutes matières (CP)', email: 'k.idrissi@educazen.com', telephone: '0661100001', date_embauche: '2024-09-01', statut: 'Actif' },
  { id: 'ezs2', org_id: orgId, prenom: 'Tarik', nom: 'Benali', role: 'Enseignant', matiere: 'Toutes matières (CE1)', email: 't.benali@educazen.com', telephone: '0661100002', date_embauche: '2024-09-01', statut: 'Actif' },
  { id: 'ezs3', org_id: orgId, prenom: 'Sanaa', nom: 'Bakkali', role: 'Enseignante', matiere: 'Toutes matières (CE2)', email: 's.bakkali@educazen.com', telephone: '0661100003', date_embauche: '2025-01-15', statut: 'Actif' },
  { id: 'ezs4', org_id: orgId, prenom: 'Yassine', nom: 'Mourad', role: 'Enseignant', matiere: 'Mathématiques & Sciences', email: 'y.mourad@educazen.com', telephone: '0661100004', date_embauche: '2024-09-01', statut: 'Actif' },
  { id: 'ezs5', org_id: orgId, prenom: 'Hind', nom: 'Zouari', role: 'Psychopédagogue', matiere: 'Accompagnement PAP', email: 'h.zouari@educazen.com', telephone: '0661100005', date_embauche: '2024-09-01', statut: 'Actif' },
  { id: 'ezs6', org_id: orgId, prenom: 'Rim', nom: 'Kettani', role: 'Art-thérapeute', matiere: 'Art-thérapie', email: 'r.kettani@educazen.com', telephone: '0661100006', date_embauche: '2025-02-01', statut: 'Congé' },
];

const SEED_STUDENTS = (orgId: string): Partial<EzStudent>[] => [
  { id: 'ez_e1', org_id: orgId, prenom: 'Yasmine', nom: 'Benhaddou', date_naissance: '2015-03-12', sexe: 'F', classe: 'CE2-A', profil: 'HPI', statut: 'Actif', date_inscription: '2025-09-01', montant_mensuel: 1200, parent1_relation: 'Mère', parent1_prenom: 'Fatima', parent1_nom: 'Benhaddou', parent1_email: 'parent@educazen.com', parent1_telephone: '0661234567', parent1_profession: 'Enseignante', parent2_relation: 'Père', parent2_prenom: 'Karim', parent2_nom: 'Benhaddou', parent2_email: 'karim.b@gmail.com', parent2_telephone: '0662234567', adresse: '12 Rue des Fleurs', ville: 'Agadir', besoins_speciaux: 'Élève à haut potentiel, stimulation intellectuelle recommandée', notes_medicales: 'Aucune allergie connue' },
  { id: 'ez_e2', org_id: orgId, prenom: 'Amine', nom: 'Ouali', date_naissance: '2016-07-20', sexe: 'M', classe: 'CE1-B', profil: 'TDAH', statut: 'Actif', date_inscription: '2025-09-01', montant_mensuel: 1200, parent1_relation: 'Père', parent1_prenom: 'Karim', parent1_nom: 'Ouali', parent1_email: 'karim.ouali@gmail.com', parent1_telephone: '0662345678', parent1_profession: 'Ingénieur', parent2_relation: 'Mère', parent2_prenom: 'Nadia', parent2_nom: 'Ouali', parent2_email: '', parent2_telephone: '0663345678', adresse: '5 Avenue Mohammed V', ville: 'Agadir', besoins_speciaux: 'TDAH — suivi PAP actif, séances ortho 2x/semaine', notes_medicales: 'Traitement Ritalin 10mg le matin' },
  { id: 'ez_e3', org_id: orgId, prenom: 'Inès', nom: 'Sabri', date_naissance: '2014-11-05', sexe: 'F', classe: 'CM1-A', profil: 'DYS', statut: 'Actif', date_inscription: '2025-09-01', montant_mensuel: 1400, parent1_relation: 'Mère', parent1_prenom: 'Nadia', parent1_nom: 'Sabri', parent1_email: 'nadia.sabri@gmail.com', parent1_telephone: '0663456789', parent1_profession: 'Médecin', parent2_relation: 'Père', parent2_prenom: 'Hicham', parent2_nom: 'Sabri', parent2_email: '', parent2_telephone: '', adresse: '78 Boulevard Hassan II', ville: 'Agadir', besoins_speciaux: 'Dyslexie — supports adaptés nécessaires', notes_medicales: '' },
  { id: 'ez_e4', org_id: orgId, prenom: 'Omar', nom: 'Tazi', date_naissance: '2017-04-18', sexe: 'M', classe: 'CP-A', profil: 'Standard', statut: 'Actif', date_inscription: '2025-09-01', montant_mensuel: 1100, parent1_relation: 'Père', parent1_prenom: 'Hassan', parent1_nom: 'Tazi', parent1_email: 'hassan.tazi@gmail.com', parent1_telephone: '0664567890', parent1_profession: 'Commerçant', parent2_relation: 'Mère', parent2_prenom: 'Samira', parent2_nom: 'Tazi', parent2_email: '', parent2_telephone: '0665567890', adresse: '3 Rue Oued Souss', ville: 'Agadir', besoins_speciaux: '', notes_medicales: '' },
  { id: 'ez_e5', org_id: orgId, prenom: 'Salma', nom: 'Cherkaoui', date_naissance: '2013-09-22', sexe: 'F', classe: 'CM2-A', profil: 'TSA', statut: 'Actif', date_inscription: '2025-09-01', montant_mensuel: 1500, parent1_relation: 'Mère', parent1_prenom: 'Aïcha', parent1_nom: 'Cherkaoui', parent1_email: 'aicha.cherkaoui@gmail.com', parent1_telephone: '0665678901', parent1_profession: 'Juriste', parent2_relation: 'Père', parent2_prenom: 'Rachid', parent2_nom: 'Cherkaoui', parent2_email: '', parent2_telephone: '0666678901', adresse: '22 Résidence Al Amal', ville: 'Agadir', besoins_speciaux: 'TSA — environnement structuré, routines claires', notes_medicales: 'Suivi neuropsy mensuel' },
  { id: 'ez_e6', org_id: orgId, prenom: 'Mehdi', nom: 'Bennani', date_naissance: '2016-02-14', sexe: 'M', classe: 'CE1-B', profil: 'Standard', statut: 'Actif', date_inscription: '2025-10-01', montant_mensuel: 1200, parent1_relation: 'Père', parent1_prenom: 'Said', parent1_nom: 'Bennani', parent1_email: 'said.bennani@gmail.com', parent1_telephone: '0666789012', parent1_profession: 'Architecte', parent2_relation: 'Mère', parent2_prenom: 'Lalla', parent2_nom: 'Bennani', parent2_email: '', parent2_telephone: '', adresse: '9 Rue Taroudant', ville: 'Agadir', besoins_speciaux: '', notes_medicales: '' },
  { id: 'ez_e7', org_id: orgId, prenom: 'Lina', nom: 'Alaoui', date_naissance: '2015-06-30', sexe: 'F', classe: 'CE2-A', profil: 'HPI', statut: 'Actif', date_inscription: '2025-09-01', montant_mensuel: 1200, parent1_relation: 'Mère', parent1_prenom: 'Zineb', parent1_nom: 'Alaoui', parent1_email: 'zineb.alaoui@gmail.com', parent1_telephone: '0667890123', parent1_profession: 'Pharmacienne', parent2_relation: 'Père', parent2_prenom: 'Mehdi', parent2_nom: 'Alaoui', parent2_email: '', parent2_telephone: '', adresse: '14 Cité Founty', ville: 'Agadir', besoins_speciaux: 'HPI — projets enrichissement', notes_medicales: '' },
  { id: 'ez_e8', org_id: orgId, prenom: 'Rayan', nom: 'Fassi', date_naissance: '2014-08-10', sexe: 'M', classe: 'CM1-A', profil: 'TDAH', statut: 'Parti', date_inscription: '2026-01-15', montant_mensuel: 1400, parent1_relation: 'Père', parent1_prenom: 'Youssef', parent1_nom: 'Fassi', parent1_email: 'youssef.fassi@gmail.com', parent1_telephone: '0668901234', parent1_profession: 'Comptable', parent2_relation: 'Mère', parent2_prenom: 'Safia', parent2_nom: 'Fassi', parent2_email: '', parent2_telephone: '', adresse: '6 Hay Dakhla', ville: 'Agadir', besoins_speciaux: 'TDAH', notes_medicales: '' },
  { id: 'ez_e9', org_id: orgId, prenom: 'Douaa', nom: 'Berrada', date_naissance: '2017-12-01', sexe: 'F', classe: 'CP-A', profil: 'Standard', statut: 'Actif', date_inscription: '2025-09-01', montant_mensuel: 1100, parent1_relation: 'Mère', parent1_prenom: 'Meriem', parent1_nom: 'Berrada', parent1_email: 'meriem.berrada@gmail.com', parent1_telephone: '0669012345', parent1_profession: 'Infirmière', parent2_relation: 'Père', parent2_prenom: 'Brahim', parent2_nom: 'Berrada', parent2_email: '', parent2_telephone: '', adresse: '1 Hay Essalam', ville: 'Agadir', besoins_speciaux: '', notes_medicales: '' },
  { id: 'ez_e10', org_id: orgId, prenom: 'Adam', nom: 'Lahlou', date_naissance: '2013-05-25', sexe: 'M', classe: 'CM2-A', profil: 'DYS', statut: 'Actif', date_inscription: '2025-09-01', montant_mensuel: 1500, parent1_relation: 'Père', parent1_prenom: 'Rachid', parent1_nom: 'Lahlou', parent1_email: 'rachid.lahlou@gmail.com', parent1_telephone: '0660123456', parent1_profession: 'Enseignant', parent2_relation: 'Mère', parent2_prenom: 'Fatima', parent2_nom: 'Lahlou', parent2_email: '', parent2_telephone: '', adresse: '33 Boulevard Abderrahim Bouabid', ville: 'Agadir', besoins_speciaux: 'Dyslexie et dysorthographie', notes_medicales: '' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

interface EducazenDashboardProps {
  role: 'admin' | 'parent';
  userEmail?: string;
  orgId: string;
  onNotify: (orgId: string, title: string, message: string, type?: string) => void;
}

export function EducazenDashboard({ role, userEmail, orgId, onNotify }: EducazenDashboardProps) {
  const [tab, setTab] = useState<EzTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<EzStudent[]>([]);
  const [classes, setClasses] = useState<EzClass[]>([]);
  const [attendance, setAttendance] = useState<EzAttendance[]>([]);
  const [payments, setPayments] = useState<EzPayment[]>([]);
  const [assignments, setAssignments] = useState<EzAssignment[]>([]);
  const [grades, setGrades] = useState<EzGrade[]>([]);
  const [staff, setStaff] = useState<EzStaff[]>([]);

  // UI state
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterMois, setFilterMois] = useState('Avril 2026');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showParent2, setShowParent2] = useState(false);
  const [editingStudent, setEditingStudent] = useState<EzStudent | null>(null);
  const [studentForm, setStudentForm] = useState<Partial<EzStudent>>(initStudent(orgId));
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Fetch ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    const [s, c, a, p, asn, g, st] = await Promise.all([
      supabase.from('ez_students').select('*').eq('org_id', orgId),
      supabase.from('ez_classes').select('*').eq('org_id', orgId),
      supabase.from('ez_attendance').select('*').eq('org_id', orgId),
      supabase.from('ez_payments').select('*').eq('org_id', orgId),
      supabase.from('ez_assignments').select('*').eq('org_id', orgId),
      supabase.from('ez_grades').select('*').eq('org_id', orgId),
      supabase.from('ez_staff').select('*').eq('org_id', orgId),
    ]);
    // Detect missing tables (Postgres error 42P01 = undefined_table)
    const firstError = [s, c, a, p, asn, g, st].find(r => r.error);
    if (firstError?.error) {
      const code = (firstError.error as any).code;
      if (code === '42P01' || firstError.error.message?.includes('does not exist')) {
        setDbError('setup_needed');
      } else {
        setDbError(firstError.error.message || 'Erreur de connexion à la base de données.');
      }
    }
    if (s.data) setStudents(s.data as EzStudent[]);
    if (c.data) setClasses(c.data as EzClass[]);
    if (a.data) setAttendance(a.data as EzAttendance[]);
    if (p.data) setPayments(p.data as EzPayment[]);
    if (asn.data) setAssignments(asn.data as EzAssignment[]);
    if (g.data) setGrades(g.data as EzGrade[]);
    if (st.data) setStaff(st.data as EzStaff[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Seed ──
  const handleSeedData = async () => {
    setSeeding(true);
    setSaveError(null);
    const cls = SEED_CLASSES(orgId);
    const stf = SEED_STAFF(orgId);
    const stu = SEED_STUDENTS(orgId);

    // Check table existence with the first insert
    const { error: probeErr } = await supabase.from('ez_classes').upsert(cls[0]);
    if (probeErr) {
      const code = (probeErr as any).code;
      if (code === '42P01' || probeErr.message?.includes('does not exist')) {
        setDbError('setup_needed');
      } else {
        setSaveError(`Erreur Supabase: ${probeErr.message}`);
      }
      setSeeding(false);
      return;
    }

    // Tables exist — seed everything
    for (const c of cls) await supabase.from('ez_classes').upsert(c);
    for (const s of stf) await supabase.from('ez_staff').upsert(s);
    for (const s of stu) await supabase.from('ez_students').upsert(s);
    const statuts = ['Payé', 'Non payé', 'Payé', 'Partiel', 'Payé', 'Non payé', 'Payé', 'Payé', 'Non payé', 'Payé'];
    for (let i = 0; i < stu.length; i++) {
      const s = stu[i];
      await supabase.from('ez_payments').upsert({
        id: `ezp_${s.id}_avr`, org_id: orgId, student_id: s.id,
        mois: 'Avril 2026', montant: s.montant_mensuel,
        statut: statuts[i % statuts.length],
        date_paiement: statuts[i % statuts.length] === 'Payé' ? `2026-04-0${(i % 5) + 1}` : '',
        mode_paiement: 'Espèces', notes: ''
      });
    }
    for (const a of [
      { id: 'eza1', org_id: orgId, titre: 'Rédaction – Mon Animal Préféré', matiere: 'Français', classe: 'CE2-A', date_limite: '2026-04-18', description: 'Écrire un texte de 10 lignes.' },
      { id: 'eza2', org_id: orgId, titre: 'Tables de Multiplication', matiere: 'Mathématiques', classe: 'CE1-B', date_limite: '2026-04-17', description: 'Tables de 6, 7 et 8.' },
      { id: 'eza3', org_id: orgId, titre: 'Le Petit Prince — Chapitres 1-5', matiere: 'Lecture', classe: 'CM1-A', date_limite: '2026-04-20', description: 'Lire et répondre aux questions.' },
      { id: 'eza4', org_id: orgId, titre: 'Les Fractions', matiere: 'Mathématiques', classe: 'CM2-A', date_limite: '2026-04-19', description: 'Exercices page 45.' },
    ]) await supabase.from('ez_assignments').upsert(a);

    await onNotify(orgId, 'EducaZen initialisé', 'Données de démonstration chargées avec succès.', 'success');
    await fetchAll();
    setSeeding(false);
  };

  // ── Computed ──
  const activeStudents = useMemo(() => students.filter(s => s.statut === 'Actif'), [students]);
  const classNames = useMemo(() => [...new Set(students.map(s => s.classe))].sort(), [students]);
  const moisList = useMemo(() => {
    const m = [...new Set(payments.map(p => p.mois))];
    return m.length > 0 ? m : ['Avril 2026'];
  }, [payments]);

  const paysMois = useMemo(() => payments.filter(p => p.mois === filterMois), [payments, filterMois]);
  const totalPercu = paysMois.filter(p => p.statut === 'Payé').reduce((s, p) => s + p.montant, 0);
  const totalAttendu = activeStudents.reduce((s, e) => s + e.montant_mensuel, 0);
  const nonPayers = useMemo(() => paysMois.filter(p => p.statut === 'Non payé'), [paysMois]);

  const todayAttendance = useMemo(() => attendance.filter(a => a.date === selectedDate), [attendance, selectedDate]);
  const presentCount = todayAttendance.filter(a => a.statut === 'Présent').length;
  const tauxPresence = activeStudents.length > 0 ? Math.round(presentCount / activeStudents.length * 100) : 0;

  const filteredStudents = useMemo(() =>
    students.filter(s => {
      const q = search.toLowerCase();
      const match = !q || `${s.prenom} ${s.nom} ${s.parent1_prenom} ${s.parent1_nom}`.toLowerCase().includes(q);
      return match && (!filterClasse || s.classe === filterClasse) && (!filterStatut || s.statut === filterStatut);
    }),
    [students, search, filterClasse, filterStatut]
  );

  // ── Attendance actions ──
  const markAttendance = async (studentId: string, statut: StatutPresence) => {
    const existing = attendance.find(a => a.student_id === studentId && a.date === selectedDate);
    const student = students.find(s => s.id === studentId);
    if (existing) {
      const { error } = await supabase.from('ez_attendance').update({ statut }).eq('id', existing.id);
      if (error) { setSaveError(`Erreur présence: ${error.message}`); return; }
      setAttendance(prev => prev.map(a => a.id === existing.id ? { ...a, statut } : a));
    } else {
      const id = `eza_${studentId}_${selectedDate}`;
      const rec: EzAttendance = { id, org_id: orgId, student_id: studentId, date: selectedDate, statut, note: '' };
      const { error } = await supabase.from('ez_attendance').upsert(rec);
      if (error) { setSaveError(`Erreur présence: ${error.message}`); return; }
      setAttendance(prev => [...prev, rec]);
    }
    if (statut === 'Absent' && student) {
      await onNotify(orgId, 'Absence signalée', `${student.prenom} ${student.nom} absent(e) le ${selectedDate}.`, 'warning');
    }
  };

  // ── Payment actions ──
  const togglePayment = async (studentId: string) => {
    const pay = paysMois.find(p => p.student_id === studentId);
    const student = students.find(s => s.id === studentId);
    if (pay) {
      const newStatut: StatutPaiement = pay.statut === 'Payé' ? 'Non payé' : 'Payé';
      const newDate = newStatut === 'Payé' ? new Date().toISOString().slice(0, 10) : '';
      const { error } = await supabase.from('ez_payments').update({ statut: newStatut, date_paiement: newDate }).eq('id', pay.id);
      if (error) { setSaveError(`Erreur paiement: ${error.message}`); return; }
      setPayments(prev => prev.map(p => p.id === pay.id ? { ...p, statut: newStatut, date_paiement: newDate } : p));
      if (newStatut === 'Payé' && student)
        await onNotify(orgId, 'Paiement reçu', `Paiement de ${student.prenom} ${student.nom} enregistré pour ${filterMois}.`, 'success');
    } else if (student) {
      const id = `ezp_${studentId}_${filterMois.replace(' ', '_')}`;
      const rec: EzPayment = { id, org_id: orgId, student_id: studentId, mois: filterMois, montant: student.montant_mensuel, statut: 'Payé', date_paiement: new Date().toISOString().slice(0, 10), mode_paiement: 'Espèces', notes: '' };
      const { error } = await supabase.from('ez_payments').upsert(rec);
      if (error) { setSaveError(`Erreur paiement: ${error.message}`); return; }
      setPayments(prev => [...prev, rec]);
      await onNotify(orgId, 'Paiement reçu', `Paiement de ${student.prenom} ${student.nom} enregistré pour ${filterMois}.`, 'success');
    }
  };

  // ── Student CRUD ──
  const openAddStudent = () => {
    setEditingStudent(null);
    setStudentForm(initStudent(orgId));
    setShowParent2(false);
    setSaveError(null);
    setShowStudentModal(true);
  };

  const openEditStudent = (s: EzStudent) => {
    setEditingStudent(s);
    setStudentForm({ ...s });
    setShowParent2(!!s.parent2_prenom);
    setSaveError(null);
    setShowStudentModal(true);
  };

  const sf = (key: keyof EzStudent, val: any) =>
    setStudentForm(prev => ({ ...prev, [key]: val }));

  const handleSaveStudent = async () => {
    if (!studentForm.prenom || !studentForm.nom) return;
    setSaving(true);
    setSaveError(null);
    const data = { ...initStudent(orgId), ...studentForm, org_id: orgId };
    if (editingStudent) {
      const { error } = await supabase.from('ez_students').update(data).eq('id', editingStudent.id);
      if (error) {
        setSaveError(`Erreur: ${error.message}`);
        setSaving(false);
        return;
      }
    } else {
      const id = `ez_${Date.now()}`;
      const rec = { ...data, id } as EzStudent;
      const { error } = await supabase.from('ez_students').insert(rec);
      if (error) {
        setSaveError(`Erreur: ${error.message}`);
        setSaving(false);
        return;
      }
      await onNotify(orgId, 'Nouvel élève inscrit', `${data.prenom} ${data.nom} a été inscrit(e).`, 'success');
    }
    // Refetch from Supabase to confirm data persisted
    await fetchAll();
    setSaving(false);
    setShowStudentModal(false);
  };

  const handleDeleteStudent = async (id: string) => {
    const s = students.find(e => e.id === id);
    if (!confirm(`Supprimer ${s?.prenom} ${s?.nom} ?`)) return;
    const { error } = await supabase.from('ez_students').delete().eq('id', id);
    if (error) { setSaveError(`Erreur suppression: ${error.message}`); return; }
    setStudents(prev => prev.filter(e => e.id !== id));
  };

  // ── Parent view ──
  const myChild = useMemo(() => userEmail ? students.find(s => s.parent1_email === userEmail || s.parent2_email === userEmail) : null, [students, userEmail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: EZ_ACCENT, borderTopColor: 'transparent' }} />
          <p className="text-sm text-gray-400" style={{ fontFamily: 'Quicksand, sans-serif' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  // ── DB Setup Banner ──
  if (dbError === 'setup_needed') {
    const sql = `-- Run this SQL in your Supabase SQL Editor (once):
create table if not exists ez_students (id text primary key, org_id text not null, prenom text, nom text, date_naissance text, sexe text default 'M', classe text, profil text default 'Standard', statut text default 'Actif', date_inscription text, montant_mensuel integer default 1200, parent1_relation text default 'Mère', parent1_prenom text, parent1_nom text, parent1_email text, parent1_telephone text, parent1_profession text, parent2_relation text, parent2_prenom text, parent2_nom text, parent2_email text, parent2_telephone text, adresse text, ville text, besoins_speciaux text, notes_medicales text, created_at timestamptz default now());
create table if not exists ez_classes (id text primary key, org_id text not null, nom text, niveau text, enseignant text, horaire_debut text, horaire_fin text, jours text, salle text, capacite integer default 15, created_at timestamptz default now());
create table if not exists ez_attendance (id text primary key, org_id text not null, student_id text not null, date text not null, statut text not null, note text, created_at timestamptz default now());
create table if not exists ez_payments (id text primary key, org_id text not null, student_id text not null, mois text not null, montant integer not null, statut text default 'Non payé', date_paiement text, mode_paiement text, notes text, created_at timestamptz default now());
create table if not exists ez_assignments (id text primary key, org_id text not null, titre text not null, matiere text, classe text, date_limite text, description text, created_at timestamptz default now());
create table if not exists ez_grades (id text primary key, org_id text not null, assignment_id text not null, student_id text not null, note numeric(4,1), commentaire text, created_at timestamptz default now());
create table if not exists ez_staff (id text primary key, org_id text not null, prenom text, nom text, role text, matiere text, email text, telephone text, date_embauche text, statut text default 'Actif', created_at timestamptz default now());
create table if not exists notifications (id text primary key, org_id text not null, title text, message text, type text default 'info', read boolean default false, created_at timestamptz default now());
-- Disable RLS for all tables (or add policies):
alter table ez_students disable row level security;
alter table ez_classes disable row level security;
alter table ez_attendance disable row level security;
alter table ez_payments disable row level security;
alter table ez_assignments disable row level security;
alter table ez_grades disable row level security;
alter table ez_staff disable row level security;
alter table notifications disable row level security;`;
    return (
      <div className="max-w-2xl mx-auto mt-8 space-y-4" style={{ fontFamily: 'Quicksand, sans-serif' }}>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle size={22} className="text-rose-500 shrink-0" />
            <h2 className="font-extrabold text-rose-700 text-lg" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Tables EducaZen introuvables dans Supabase
            </h2>
          </div>
          <p className="text-sm text-rose-600 mb-4">
            Les tables <code className="bg-rose-100 px-1 rounded">ez_*</code> n'existent pas encore dans votre base de données.
            C'est pour ça que les données disparaissent — elles ne sont pas enregistrées.
          </p>
          <p className="text-sm font-semibold text-rose-700 mb-2">Comment corriger :</p>
          <ol className="text-sm text-rose-600 space-y-1 list-decimal list-inside mb-4">
            <li>Ouvrez votre <strong>Supabase Dashboard</strong></li>
            <li>Allez dans <strong>SQL Editor</strong> → <strong>New query</strong></li>
            <li>Copiez le SQL ci-dessous et cliquez <strong>Run</strong></li>
            <li>Revenez ici et cliquez <strong>Réessayer</strong></li>
          </ol>
          <div className="relative">
            <pre className="bg-gray-900 text-green-300 text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">{sql}</pre>
            <button
              onClick={() => { navigator.clipboard.writeText(sql); }}
              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1 rounded-lg transition"
            >
              Copier
            </button>
          </div>
          <button
            onClick={() => fetchAll()}
            className="mt-4 w-full py-2.5 rounded-xl font-bold text-white text-sm transition"
            style={{ background: EZ_ACCENT }}
          >
            Réessayer la connexion
          </button>
        </div>
      </div>
    );
  }
  if (dbError) {
    return (
      <div className="max-w-xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-red-700 mb-1">Erreur de base de données</p>
            <p className="text-sm text-red-600">{dbError}</p>
            <button onClick={() => fetchAll()} className="mt-3 text-sm font-semibold text-red-700 underline">Réessayer</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ PARENT VIEW ═══════════════════════════════════════════════════════════
  if (role === 'parent') {
    const childPays = myChild ? payments.filter(p => p.student_id === myChild.id) : [];
    const childAtt = myChild ? attendance.filter(a => a.student_id === myChild.id).slice().reverse() : [];
    const childGrades = myChild ? grades.filter(g => g.student_id === myChild.id) : [];

    return (
      <div className="max-w-2xl mx-auto space-y-5 pb-8" style={{ fontFamily: 'Quicksand, sans-serif' }}>
        <div className="flex items-center gap-3">
          <img src="/educazen.png" alt="EducazenKids" className="h-10 w-auto" onError={e => (e.currentTarget.style.display = 'none')} />
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'Nunito, sans-serif', color: EZ_ACCENT }}>Espace Parent</h1>
            <p className="text-xs text-gray-400">Centre EducazenKids · Agadir</p>
          </div>
        </div>
        {!myChild ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
            <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Aucun enfant associé à ce compte.<br /><span className="text-xs">Contactez l'administration.</span></p>
          </div>
        ) : (
          <>
            {myChild.statut === 'Parti' && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-sm font-semibold">
                <AlertCircle size={18} /><span>Votre enfant a quitté le centre EducazenKids.</span>
              </div>
            )}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF0F5] text-[#C2185B] flex items-center justify-center text-xl font-extrabold" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {initials(myChild.prenom, myChild.nom)}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-extrabold" style={{ fontFamily: 'Nunito, sans-serif' }}>{myChild.prenom} {myChild.nom}</h2>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{myChild.classe}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${profilColors[myChild.profil]}`}>{myChild.profil}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${myChild.statut === 'Actif' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>{myChild.statut}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Mensualité</p>
                <p className="text-xl font-extrabold" style={{ color: EZ_ACCENT, fontFamily: 'Nunito, sans-serif' }}>{myChild.montant_mensuel} MAD</p>
              </div>
            </div>
            {[
              { title: 'Paiements', icon: CreditCard, color: EZ_VIOLET, items: childPays.map(p => ({ left: p.mois, sub: p.date_paiement ? `Payé le ${p.date_paiement}` : '', right: `${p.montant} MAD`, badge: p.statut, badgeStyle: payStyle[p.statut] })) },
              { title: 'Présences', icon: CheckSquare, color: EZ_TEAL, items: childAtt.slice(0, 10).map(a => ({ left: a.date, sub: '', right: '', badge: a.statut, badgeStyle: presenceStyle[a.statut] })) },
              { title: 'Notes', icon: GraduationCap, color: EZ_GOLD, items: childGrades.map(g => { const asn = assignments.find(a => a.id === g.assignment_id); return { left: asn?.titre || '—', sub: `${asn?.matiere || ''} · ${g.commentaire}`, right: `${g.note}/20`, badge: '', badgeStyle: '' }; }) },
            ].map(({ title, icon: Icon, color, items }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                  <Icon size={16} style={{ color }} /><h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>{title}</h3>
                </div>
                {items.length === 0 ? <p className="p-5 text-center text-xs text-gray-400">Aucun enregistrement.</p> : (
                  <div className="divide-y divide-gray-50">
                    {items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3">
                        <div><p className="text-sm font-semibold text-gray-700">{it.left}</p>{it.sub && <p className="text-xs text-gray-400 italic">{it.sub}</p>}</div>
                        <div className="flex items-center gap-2">
                          {it.right && <span className="font-bold text-gray-700 text-sm">{it.right}</span>}
                          {it.badge && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${it.badgeStyle}`}>{it.badge}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  // ═══ ADMIN VIEW ═══════════════════════════════════════════════════════════

  const TABS: { id: EzTab; label: string; icon: any; count?: number }[] = [
    { id: 'dashboard', label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: 'eleves', label: 'Élèves', icon: Users, count: activeStudents.length },
    { id: 'classes', label: 'Classes', icon: GraduationCap },
    { id: 'presences', label: 'Présences', icon: CheckSquare, count: todayAttendance.filter(a => a.statut === 'Absent').length },
    { id: 'paiements', label: 'Paiements', icon: CreditCard, count: nonPayers.length },
    { id: 'devoirs', label: 'Devoirs & Notes', icon: BookMarked },
    { id: 'personnel', label: 'Personnel', icon: UserCog },
  ];

  return (
    <div className="space-y-3 sm:space-y-4 pb-8" style={{ fontFamily: 'Quicksand, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img src="/educazen.png" alt="EducazenKids" className="h-8 sm:h-10 w-auto shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-extrabold text-gray-800 leading-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
              <span className="hidden sm:inline">Tableau de Bord </span><span style={{ color: EZ_ACCENT }}>EducazenKids</span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-gray-400 truncate" style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.1em' }}>Centre Éducatif · Agadir, Maroc</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={fetchAll} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-400">
            <RefreshCw size={14} />
          </button>
          <button onClick={handleSeedData} disabled={seeding}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-white text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-60 whitespace-nowrap"
            style={{ backgroundColor: EZ_VIOLET, fontFamily: 'Nunito, sans-serif' }}>
            <Database size={12} /><span className="hidden xs:inline">{seeding ? 'Chargement...' : 'Données démo'}</span><span className="xs:hidden">{seeding ? '...' : 'Démo'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex gap-1 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch]" style={{scrollbarWidth:'none'}}>
        {TABS.map(t => (
          <EzTabBtn key={t.id} label={t.label} icon={t.icon} active={tab === t.id} onClick={() => setTab(t.id as EzTab)} count={t.count} />
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <EzStatCard label="Élèves Actifs" value={activeStudents.length} sub={`${students.filter(s => s.statut === 'Parti').length} parti(s)`} color={EZ_ACCENT} icon={Users} onClick={() => setTab('eleves')} />
            <EzStatCard label="Présence Auj." value={`${tauxPresence}%`} sub={`${presentCount}/${activeStudents.length} élèves`} color={EZ_TEAL} icon={CheckSquare} onClick={() => setTab('presences')} />
            <EzStatCard label={`Perçu ${filterMois.split(' ')[0]}`} value={`${totalPercu.toLocaleString()} MAD`} sub={`/${totalAttendu.toLocaleString()} attendus`} color={EZ_VIOLET} icon={CreditCard} onClick={() => setTab('paiements')} />
            <EzStatCard label="Personnel Actif" value={staff.filter(s => s.statut === 'Actif').length} sub={`${staff.filter(s => s.statut === 'Congé').length} en congé`} color={EZ_GOLD} icon={UserCog} onClick={() => setTab('personnel')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Unpaid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setTab('paiements')}>
                <div className="flex items-center gap-2"><AlertCircle size={15} className="text-rose-500" /><h3 className="font-extrabold text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>Paiements en Attente</h3></div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold">{nonPayers.length}</span>
              </div>
              {nonPayers.length === 0 ? <p className="p-5 text-center text-xs text-gray-400">Tous les paiements sont à jour ✓</p> : (
                <>
                  {nonPayers.map(p => {
                    const s = students.find(e => e.student_id === p.student_id || e.id === p.student_id);
                    if (!s) return null;
                    return (
                      <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-rose-50/30 transition-colors" onClick={() => setTab('paiements')}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#FFF0F5] text-[#C2185B] flex items-center justify-center text-xs font-bold" style={{ fontFamily: 'Nunito, sans-serif' }}>{initials(s.prenom, s.nom)}</div>
                          <div><p className="text-sm font-semibold text-gray-700">{s.prenom} {s.nom}</p><p className="text-xs text-gray-400">{s.classe}</p></div>
                        </div>
                        <div className="text-right"><p className="text-sm font-bold text-rose-600">{s.montant_mensuel} MAD</p></div>
                      </div>
                    );
                  })}
                  <div className="p-3 bg-rose-50/50 text-xs text-rose-600 font-semibold text-center">
                    Total impayé : {nonPayers.reduce((sum, p) => { const s = students.find(e => e.id === p.student_id); return sum + (s?.montant_mensuel || 0); }, 0).toLocaleString()} MAD
                  </div>
                </>
              )}
            </div>

            {/* Absences */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setTab('presences')}>
                <Clock size={15} style={{ color: EZ_VIOLET }} /><h3 className="font-extrabold text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>Absences Récentes</h3>
              </div>
              {attendance.filter(a => a.statut === 'Absent').length === 0 ? <p className="p-5 text-center text-xs text-gray-400">Aucune absence enregistrée.</p> : (
                attendance.filter(a => a.statut === 'Absent').slice(0, 6).map((a, i) => {
                  const s = students.find(e => e.id === a.student_id);
                  return s ? (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-violet-50/30 transition-colors" onClick={() => setTab('presences')}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarBg[i % 4]}`} style={{ fontFamily: 'Nunito, sans-serif' }}>{initials(s.prenom, s.nom)}</div>
                        <div><p className="text-sm font-semibold text-gray-700">{s.prenom} {s.nom}</p><p className="text-xs text-gray-400">{s.classe}</p></div>
                      </div>
                      <span className="text-xs text-gray-400">{a.date}</span>
                    </div>
                  ) : null;
                })
              )}
            </div>
          </div>

          {/* Departed */}
          {students.filter(s => s.statut === 'Parti').length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-amber-50 flex items-center gap-2">
                <TrendingDown size={15} className="text-amber-600" /><h3 className="font-extrabold text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>Élèves Ayant Quitté le Centre</h3>
              </div>
              {students.filter(s => s.statut === 'Parti').map((s, i) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-amber-50/50 last:border-0 cursor-pointer hover:bg-amber-50/40 transition-colors" onClick={() => openEditStudent(s)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-bold" style={{ fontFamily: 'Nunito, sans-serif' }}>{initials(s.prenom, s.nom)}</div>
                    <div><p className="text-sm font-semibold">{s.prenom} {s.nom}</p><p className="text-xs text-gray-400">{s.classe} · {s.profil}</p></div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">Parti</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ÉLÈVES ── */}
      {tab === 'eleves' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher élève ou parent..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none bg-white" style={{ fontFamily: 'Quicksand, sans-serif' }} />
            </div>
            <select value={filterClasse} onChange={e => setFilterClasse(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              <option value="">Toutes les classes</option>
              {classNames.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              <option value="">Tous statuts</option>
              <option>Actif</option><option>Parti</option><option>Suspendu</option>
            </select>
            <button onClick={openAddStudent}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold shadow-sm whitespace-nowrap"
              style={{ backgroundColor: EZ_ACCENT, fontFamily: 'Nunito, sans-serif' }}>
              <Plus size={15} /> Inscrire un élève
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: 'Quicksand, sans-serif', minWidth: '680px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FFF0F5' }}>
                    {['Élève', 'Classe', 'Profil', 'Parent', 'Contact', 'Mensualité', 'Statut', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: EZ_ACCENT }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map((s, i) => (
                    <tr key={s.id} className="hover:bg-[#FFF0F5]/50 transition-colors cursor-pointer" onClick={() => openEditStudent(s)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarBg[i % 4]}`} style={{ fontFamily: 'Nunito, sans-serif' }}>{initials(s.prenom, s.nom)}</div>
                          <div><p className="font-semibold text-gray-800">{s.prenom} {s.nom}</p><p className="text-xs text-gray-400">{s.date_naissance}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">{s.classe}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${profilColors[s.profil]}`}>{s.profil}</span></td>
                      <td className="px-4 py-3"><p className="text-sm text-gray-700">{s.parent1_prenom} {s.parent1_nom}</p><p className="text-xs text-gray-400">{s.parent1_relation}</p></td>
                      <td className="px-4 py-3"><p className="text-xs text-gray-600 flex items-center gap-1"><Phone size={11} /> {s.parent1_telephone}</p><p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={11} /> {s.parent1_email}</p></td>
                      <td className="px-4 py-3 font-bold" style={{ color: EZ_VIOLET }}>{s.montant_mensuel} MAD</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.statut === 'Actif' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>{s.statut}</span></td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditStudent(s)} className="p-1.5 rounded-lg hover:bg-[#FFF0F5] transition-colors" style={{ color: EZ_ACCENT }}><Pencil size={13} /></button>
                          <button onClick={() => handleDeleteStudent(s.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">Aucun élève trouvé.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50/50 text-xs text-gray-400 text-center">{filteredStudents.length} élève(s) affiché(s) · {activeStudents.length} actif(s)</div>
          </div>
        </div>
      )}

      {/* ── CLASSES ── */}
      {tab === 'classes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <GraduationCap size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="font-bold text-gray-400 mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>Aucune classe</p>
              <p className="text-xs text-gray-400 mb-4">Cliquez sur <strong>Données démo</strong> pour charger les classes, le personnel, les devoirs et les paiements.</p>
              <button onClick={handleSeedData} disabled={seeding} className="px-4 py-2 rounded-xl text-white text-xs font-bold" style={{ backgroundColor: EZ_VIOLET }}>
                <Database size={12} className="inline mr-1" />{seeding ? 'Chargement...' : 'Charger les données démo'}
              </button>
            </div>
          )}
          {classes.map((cls, i) => {
            const enrolled = students.filter(s => s.classe === cls.nom && s.statut === 'Actif');
            const accent = accentList[i % accentList.length];
            return (
              <div key={cls.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setFilterClasse(cls.nom); setTab('eleves'); }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>{cls.nom}</h3>
                    <p className="text-xs text-gray-400">Niveau {cls.niveau}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold" style={{ color: accent, fontFamily: 'Nunito, sans-serif' }}>{enrolled.length}</span>
                    <p className="text-[10px] text-gray-400">/ {cls.capacite}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><GraduationCap size={13} className="text-gray-400" /><span>{cls.enseignant}</span></div>
                  <div className="flex items-center gap-2"><Clock size={13} className="text-gray-400" /><span>{cls.horaire_debut} – {cls.horaire_fin} · {cls.jours}</span></div>
                  <div className="flex items-center gap-2"><Calendar size={13} className="text-gray-400" /><span>Salle : {cls.salle}</span></div>
                </div>
                {enrolled.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50 flex -space-x-2">
                    {enrolled.slice(0, 6).map((s, j) => (
                      <div key={s.id} title={`${s.prenom} ${s.nom}`} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${avatarBg[j % 4]}`} style={{ fontFamily: 'Nunito, sans-serif' }}>
                        {initials(s.prenom, s.nom)}
                      </div>
                    ))}
                    {enrolled.length > 6 && <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 text-gray-500 flex items-center justify-center text-[9px] font-bold">+{enrolled.length - 6}</div>}
                  </div>
                )}
              </div>
            );
          })}
          {classes.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">Aucune classe. Initialisez les données.</div>}
        </div>
      )}

      {/* ── PRÉSENCES ── */}
      {tab === 'presences' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Date :</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-sm rounded-xl border border-gray-200 bg-white" style={{ fontFamily: 'Quicksand, sans-serif' }} />
            </div>
            <div className="flex gap-1.5 text-xs font-semibold flex-wrap">
              <span className="px-2.5 py-1.5 rounded-full bg-teal-50 text-teal-700 whitespace-nowrap">{todayAttendance.filter(a => a.statut === 'Présent').length} Présents</span>
              <span className="px-2.5 py-1.5 rounded-full bg-rose-50 text-rose-600 whitespace-nowrap">{todayAttendance.filter(a => a.statut === 'Absent').length} Absents</span>
              <span className="px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 whitespace-nowrap">{todayAttendance.filter(a => a.statut === 'Retard').length} Retards</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: 'Quicksand, sans-serif', minWidth: '480px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#E8F8F5' }}>
                    {['Élève', 'Classe', 'Profil', 'Statut', 'Marquer'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: EZ_TEAL }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeStudents.map((s, i) => {
                    const att = todayAttendance.find(a => a.student_id === s.id);
                    return (
                      <tr key={s.id} className="hover:bg-[#E8F8F5]/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarBg[i % 4]}`} style={{ fontFamily: 'Nunito, sans-serif' }}>{initials(s.prenom, s.nom)}</div>
                            <span className="font-semibold text-gray-800">{s.prenom} {s.nom}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.classe}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${profilColors[s.profil]}`}>{s.profil}</span></td>
                        <td className="px-4 py-3">
                          {att ? <span className={`text-xs px-2 py-1 rounded-full font-semibold ${presenceStyle[att.statut]}`}>{att.statut}</span>
                            : <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-400">Non marqué</span>}
                        </td>
                        <td className="px-2 sm:px-4 py-3">
                          <div className="flex gap-1">
                            {(['Présent', 'Absent', 'Retard'] as StatutPresence[]).map(st => (
                              <button key={st} onClick={() => markAttendance(s.id, st)}
                                title={st}
                                className={`w-7 h-7 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${att?.statut === st ? presenceStyle[st] + ' ring-1 ring-current' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                {st === 'Présent' ? '✓' : st === 'Absent' ? '✗' : '⏱'}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PAIEMENTS ── */}
      {tab === 'paiements' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-teal-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-teal-100">
              <p className="text-[9px] sm:text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Total Perçu</p>
              <p className="text-lg sm:text-2xl font-extrabold text-teal-700" style={{ fontFamily: 'Nunito, sans-serif' }}>{totalPercu.toLocaleString()}<span className="text-xs font-semibold ml-0.5">MAD</span></p>
            </div>
            <div className="bg-rose-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-rose-100">
              <p className="text-[9px] sm:text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Reste à Collecter</p>
              <p className="text-lg sm:text-2xl font-extrabold text-rose-600" style={{ fontFamily: 'Nunito, sans-serif' }}>{(totalAttendu - totalPercu).toLocaleString()}<span className="text-xs font-semibold ml-0.5">MAD</span></p>
            </div>
            <div className="bg-[#F8F0FF] rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-violet-100">
              <p className="text-[9px] sm:text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Recouvrement</p>
              <p className="text-lg sm:text-2xl font-extrabold text-violet-700" style={{ fontFamily: 'Nunito, sans-serif' }}>{totalAttendu > 0 ? Math.round(totalPercu / totalAttendu * 100) : 0}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-600">Mois :</label>
            <select value={filterMois} onChange={e => setFilterMois(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              {moisList.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: 'Quicksand, sans-serif', minWidth: '580px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F0FF' }}>
                    {['Élève', 'Classe', 'Parent', 'Montant', 'Statut', 'Date', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: EZ_VIOLET }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeStudents.map((s, i) => {
                    const pay = paysMois.find(p => p.student_id === s.id);
                    const statut: StatutPaiement = pay?.statut || 'Non payé';
                    return (
                      <tr key={s.id} className="hover:bg-[#F8F0FF]/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarBg[i % 4]}`} style={{ fontFamily: 'Nunito, sans-serif' }}>{initials(s.prenom, s.nom)}</div>
                            <span className="font-semibold text-gray-800">{s.prenom} {s.nom}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.classe}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{s.parent1_prenom} · {s.parent1_telephone}</td>
                        <td className="px-4 py-3 font-bold" style={{ color: EZ_VIOLET }}>{s.montant_mensuel} MAD</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${payStyle[statut]}`}>{statut}</span></td>
                        <td className="px-4 py-3 text-xs text-gray-400">{pay?.date_paiement || '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => togglePayment(s.id)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${pay?.statut === 'Payé' ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}>
                            {pay?.statut === 'Payé' ? 'Annuler' : '✓ Marquer payé'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── DEVOIRS & NOTES ── */}
      {tab === 'devoirs' && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <BookMarked size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="font-bold text-gray-400 mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>Aucun devoir</p>
              <p className="text-xs text-gray-400 mb-4">Cliquez sur <strong>Données démo</strong> pour charger les devoirs et les notes.</p>
              <button onClick={handleSeedData} disabled={seeding} className="px-4 py-2 rounded-xl text-white text-xs font-bold" style={{ backgroundColor: EZ_VIOLET }}>
                <Database size={12} className="inline mr-1" />{seeding ? 'Chargement...' : 'Charger les données démo'}
              </button>
            </div>
          ) : assignments.map((asn, i) => {
            const asnGrades = grades.filter(g => g.assignment_id === asn.id);
            const moyenne = asnGrades.length > 0 ? (asnGrades.reduce((s, g) => s + Number(g.note), 0) / asnGrades.length).toFixed(1) : '—';
            const accent = accentList[i % accentList.length];
            return (
              <div key={asn.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: accent, borderLeftStyle: 'solid' }}>
                <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>{asn.titre}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${accent}18`, color: accent }}>{asn.matiere}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{asn.classe}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{asn.description} · <span className="text-amber-600 font-semibold">Limite : {asn.date_limite}</span></p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Moyenne classe</p>
                    <p className="text-2xl font-extrabold" style={{ fontFamily: 'Nunito, sans-serif', color: accent }}>{moyenne}{moyenne !== '—' ? '/20' : ''}</p>
                  </div>
                </div>
                {asnGrades.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {asnGrades.map(g => {
                      const s = students.find(e => e.id === g.student_id);
                      return s ? (
                        <div key={g.id} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-[#FFF0F5] text-[#C2185B] flex items-center justify-center text-xs font-bold" style={{ fontFamily: 'Nunito, sans-serif' }}>{initials(s.prenom, s.nom)}</div>
                            <div><p className="text-sm font-semibold text-gray-700">{s.prenom} {s.nom}</p><p className="text-xs text-gray-400 italic">{g.commentaire}</p></div>
                          </div>
                          <span className={`text-lg font-extrabold ${Number(g.note) >= 16 ? 'text-teal-600' : Number(g.note) >= 12 ? 'text-amber-600' : 'text-rose-600'}`} style={{ fontFamily: 'Nunito, sans-serif' }}>{g.note}/20</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : <p className="p-4 text-center text-xs text-gray-400">Aucune note saisie.</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PERSONNEL ── */}
      {tab === 'personnel' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((p, i) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-extrabold ${avatarBg[i % 4]}`} style={{ fontFamily: 'Nunito, sans-serif' }}>{initials(p.prenom, p.nom)}</div>
                <div className="flex-1">
                  <h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>{p.prenom} {p.nom}</h3>
                  <p className="text-xs font-semibold" style={{ color: EZ_ACCENT }}>{p.role}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.statut === 'Actif' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>{p.statut}</span>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-2"><GraduationCap size={12} style={{ color: EZ_VIOLET }} /><span>{p.matiere}</span></div>
                <div className="flex items-center gap-2"><Mail size={12} style={{ color: EZ_TEAL }} /><span className="truncate">{p.email}</span></div>
                <div className="flex items-center gap-2"><Phone size={12} style={{ color: EZ_GOLD }} /><span>{p.telephone}</span></div>
                <div className="flex items-center gap-2"><Calendar size={12} className="text-gray-400" /><span>Depuis {p.date_embauche}</span></div>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <UserCog size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="font-bold text-gray-400 mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>Aucun personnel</p>
              <p className="text-xs text-gray-400 mb-4">Cliquez sur <strong>Données démo</strong> pour charger le personnel.</p>
              <button onClick={handleSeedData} disabled={seeding} className="px-4 py-2 rounded-xl text-white text-xs font-bold" style={{ backgroundColor: EZ_VIOLET }}>
                <Database size={12} className="inline mr-1" />{seeding ? 'Chargement...' : 'Charger les données démo'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════ STUDENT MODAL ══════════ */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ fontFamily: 'Quicksand, sans-serif' }}>
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[95vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 bg-white px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100 flex items-center justify-between z-10 rounded-t-3xl sm:rounded-t-2xl">
              <div>
                <h2 className="text-xl font-extrabold" style={{ fontFamily: 'Nunito, sans-serif', color: EZ_ACCENT }}>
                  {editingStudent ? 'Modifier le dossier' : 'Inscription d\'un élève'}
                </h2>
                <p className="text-xs text-gray-400">Remplissez le formulaire complet</p>
              </div>
              <button onClick={() => setShowStudentModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"><X size={18} /></button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
              {/* Section: Élève */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: EZ_ACCENT, fontFamily: 'Nunito, sans-serif' }}>1</div>
                  <h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>Informations de l'Élève</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <EzInput label="Prénom" value={studentForm.prenom || ''} onChange={v => sf('prenom', v)} required />
                  <EzInput label="Nom" value={studentForm.nom || ''} onChange={v => sf('nom', v)} required />
                  <EzInput label="Date de naissance" value={studentForm.date_naissance || ''} onChange={v => sf('date_naissance', v)} type="date" />
                  <EzSelect label="Sexe" value={studentForm.sexe || 'M'} onChange={v => sf('sexe', v)} options={['M', 'F']} />
                  <EzSelect label="Classe" value={studentForm.classe || 'CP-A'} onChange={v => sf('classe', v)} options={classNames.length > 0 ? classNames : ['CP-A', 'CE1-B', 'CE2-A', 'CM1-A', 'CM2-A']} required />
                  <EzSelect label="Profil" value={studentForm.profil || 'Standard'} onChange={v => sf('profil', v as Profil)} options={['Standard', 'HPI', 'TDAH', 'DYS', 'TSA']} />
                  <EzSelect label="Statut" value={studentForm.statut || 'Actif'} onChange={v => sf('statut', v)} options={['Actif', 'Parti', 'Suspendu']} />
                  <EzInput label="Date d'inscription" value={studentForm.date_inscription || ''} onChange={v => sf('date_inscription', v)} type="date" />
                  <EzInput label="Mensualité (MAD)" value={studentForm.montant_mensuel || 1200} onChange={v => sf('montant_mensuel', Number(v))} type="number" />
                </div>
                <div className="mt-3">
                  <EzLabel>Besoins spéciaux / PAP</EzLabel>
                  <textarea value={studentForm.besoins_speciaux || ''} onChange={e => sf('besoins_speciaux', e.target.value)} rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none text-sm resize-none" style={{ fontFamily: 'Quicksand, sans-serif' }} />
                </div>
                <div className="mt-3">
                  <EzLabel>Notes médicales</EzLabel>
                  <textarea value={studentForm.notes_medicales || ''} onChange={e => sf('notes_medicales', e.target.value)} rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none text-sm resize-none" style={{ fontFamily: 'Quicksand, sans-serif' }} />
                </div>
              </div>

              {/* Section: Parent 1 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: EZ_VIOLET, fontFamily: 'Nunito, sans-serif' }}>2</div>
                  <h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>Parent / Tuteur Principal</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <EzSelect label="Relation" value={studentForm.parent1_relation || 'Mère'} onChange={v => sf('parent1_relation', v)} options={['Mère', 'Père', 'Tuteur légal', 'Grand-parent', 'Autre']} />
                  <div />
                  <EzInput label="Prénom" value={studentForm.parent1_prenom || ''} onChange={v => sf('parent1_prenom', v)} required />
                  <EzInput label="Nom" value={studentForm.parent1_nom || ''} onChange={v => sf('parent1_nom', v)} required />
                  <EzInput label="Email" value={studentForm.parent1_email || ''} onChange={v => sf('parent1_email', v)} type="email" />
                  <EzInput label="Téléphone" value={studentForm.parent1_telephone || ''} onChange={v => sf('parent1_telephone', v)} type="tel" required />
                  <EzInput label="Profession" value={studentForm.parent1_profession || ''} onChange={v => sf('parent1_profession', v)} />
                </div>
              </div>

              {/* Section: Parent 2 (toggle) */}
              <div>
                <button type="button" onClick={() => setShowParent2(!showParent2)}
                  className="flex items-center gap-2 text-sm font-bold transition-colors"
                  style={{ color: EZ_TEAL, fontFamily: 'Nunito, sans-serif' }}>
                  {showParent2 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showParent2 ? 'Masquer le 2ème parent' : '+ Ajouter un 2ème parent / tuteur'}
                </button>
                {showParent2 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: EZ_TEAL, fontFamily: 'Nunito, sans-serif' }}>3</div>
                      <h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>2ème Parent / Tuteur</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <EzSelect label="Relation" value={studentForm.parent2_relation || 'Père'} onChange={v => sf('parent2_relation', v)} options={['Père', 'Mère', 'Tuteur légal', 'Grand-parent', 'Autre']} />
                      <div />
                      <EzInput label="Prénom" value={studentForm.parent2_prenom || ''} onChange={v => sf('parent2_prenom', v)} />
                      <EzInput label="Nom" value={studentForm.parent2_nom || ''} onChange={v => sf('parent2_nom', v)} />
                      <EzInput label="Email" value={studentForm.parent2_email || ''} onChange={v => sf('parent2_email', v)} type="email" />
                      <EzInput label="Téléphone" value={studentForm.parent2_telephone || ''} onChange={v => sf('parent2_telephone', v)} type="tel" />
                    </div>
                  </div>
                )}
              </div>

              {/* Section: Address */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: EZ_GOLD, fontFamily: 'Nunito, sans-serif' }}>{showParent2 ? '4' : '3'}</div>
                  <h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>Adresse</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-1 sm:col-span-2"><EzInput label="Adresse complète" value={studentForm.adresse || ''} onChange={v => sf('adresse', v)} /></div>
                  <EzInput label="Ville" value={studentForm.ville || 'Agadir'} onChange={v => sf('ville', v)} />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            {saveError && (
              <div className="mx-6 mb-2 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{saveError}</p>
              </div>
            )}
            <div className="sticky bottom-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex gap-2 sm:gap-3">
              <button onClick={handleSaveStudent} disabled={saving}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: EZ_ACCENT, fontFamily: 'Nunito, sans-serif' }}>
                <Save size={15} />{saving ? 'Enregistrement...' : editingStudent ? 'Enregistrer les modifications' : 'Inscrire l\'élève'}
              </button>
              <button onClick={() => setShowStudentModal(false)}
                className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
