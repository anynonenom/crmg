import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, Users, Calendar, CheckSquare, CreditCard,
  BookOpen, UserCog, Plus, Search, X, Check, Pencil, Trash2,
  Phone, Mail, ChevronRight, AlertCircle, Clock, Star,
  TrendingUp, TrendingDown, GraduationCap, BookMarked, ClipboardList
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type EzTab = 'dashboard' | 'eleves' | 'classes' | 'presences' | 'paiements' | 'devoirs' | 'personnel';

type Profil = 'Standard' | 'HPI' | 'TDAH' | 'DYS' | 'TSA';
type StatutEleve = 'Actif' | 'Parti';
type StatutPresence = 'Présent' | 'Absent' | 'Retard';
type StatutPaiement = 'Payé' | 'Non payé' | 'Partiel';

interface Eleve {
  id: string;
  prenom: string;
  nom: string;
  age: number;
  classe: string;
  profil: Profil;
  nomParent: string;
  emailParent: string;
  telephone: string;
  dateInscription: string;
  statut: StatutEleve;
  montantMensuel: number;
}

interface Classe {
  id: string;
  nom: string;
  enseignant: string;
  niveau: string;
  horaire: string;
  salle: string;
  effectif: number;
  jours: string;
}

interface Presence {
  id: string;
  eleveId: string;
  date: string;
  statut: StatutPresence;
  classe: string;
}

interface Paiement {
  id: string;
  eleveId: string;
  mois: string;
  montant: number;
  statut: StatutPaiement;
  datePaiement?: string;
}

interface Devoir {
  id: string;
  titre: string;
  matiere: string;
  classe: string;
  dateLimite: string;
  description: string;
}

interface Note {
  id: string;
  devoirId: string;
  eleveId: string;
  note: number;
  commentaire: string;
}

interface Personnel {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  matiere: string;
  email: string;
  telephone: string;
  dateEmbauche: string;
  statut: 'Actif' | 'Congé';
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ELEVES: Eleve[] = [
  { id: 'e1', prenom: 'Yasmine', nom: 'Benhaddou', age: 9, classe: 'CE2-A', profil: 'HPI', nomParent: 'Fatima Benhaddou', emailParent: 'parent@educazen.com', telephone: '0661234567', dateInscription: '2025-09-01', statut: 'Actif', montantMensuel: 1200 },
  { id: 'e2', prenom: 'Amine', nom: 'Ouali', age: 8, classe: 'CE1-B', profil: 'TDAH', nomParent: 'Karim Ouali', emailParent: 'karim.ouali@gmail.com', telephone: '0662345678', dateInscription: '2025-09-01', statut: 'Actif', montantMensuel: 1200 },
  { id: 'e3', prenom: 'Inès', nom: 'Sabri', age: 10, classe: 'CM1-A', profil: 'DYS', nomParent: 'Nadia Sabri', emailParent: 'nadia.sabri@gmail.com', telephone: '0663456789', dateInscription: '2025-09-01', statut: 'Actif', montantMensuel: 1400 },
  { id: 'e4', prenom: 'Omar', nom: 'Tazi', age: 7, classe: 'CP-A', profil: 'Standard', nomParent: 'Hassan Tazi', emailParent: 'hassan.tazi@gmail.com', telephone: '0664567890', dateInscription: '2025-09-01', statut: 'Actif', montantMensuel: 1100 },
  { id: 'e5', prenom: 'Salma', nom: 'Cherkaoui', age: 11, classe: 'CM2-A', profil: 'TSA', nomParent: 'Aïcha Cherkaoui', emailParent: 'aicha.cherkaoui@gmail.com', telephone: '0665678901', dateInscription: '2025-09-01', statut: 'Actif', montantMensuel: 1500 },
  { id: 'e6', prenom: 'Mehdi', nom: 'Bennani', age: 8, classe: 'CE1-B', profil: 'Standard', nomParent: 'Said Bennani', emailParent: 'said.bennani@gmail.com', telephone: '0666789012', dateInscription: '2025-10-01', statut: 'Actif', montantMensuel: 1200 },
  { id: 'e7', prenom: 'Lina', nom: 'Alaoui', age: 9, classe: 'CE2-A', profil: 'HPI', nomParent: 'Zineb Alaoui', emailParent: 'zineb.alaoui@gmail.com', telephone: '0667890123', dateInscription: '2025-09-01', statut: 'Actif', montantMensuel: 1200 },
  { id: 'e8', prenom: 'Rayan', nom: 'Fassi', age: 10, classe: 'CM1-A', profil: 'TDAH', nomParent: 'Youssef Fassi', emailParent: 'youssef.fassi@gmail.com', telephone: '0668901234', dateInscription: '2026-01-15', statut: 'Parti', montantMensuel: 1400 },
  { id: 'e9', prenom: 'Douaa', nom: 'Berrada', age: 7, classe: 'CP-A', profil: 'Standard', nomParent: 'Meriem Berrada', emailParent: 'meriem.berrada@gmail.com', telephone: '0669012345', dateInscription: '2025-09-01', statut: 'Actif', montantMensuel: 1100 },
  { id: 'e10', prenom: 'Adam', nom: 'Lahlou', age: 11, classe: 'CM2-A', profil: 'DYS', nomParent: 'Rachid Lahlou', emailParent: 'rachid.lahlou@gmail.com', telephone: '0660123456', dateInscription: '2025-09-01', statut: 'Actif', montantMensuel: 1500 },
];

const MOCK_CLASSES: Classe[] = [
  { id: 'c1', nom: 'CP-A', enseignant: 'Mme. Karima Idrissi', niveau: 'CP', horaire: '08:30 – 12:30', salle: 'Salle 1', effectif: 2, jours: 'Lun – Ven' },
  { id: 'c2', nom: 'CE1-B', enseignant: 'M. Tarik Benali', niveau: 'CE1', horaire: '08:30 – 12:30', salle: 'Salle 2', effectif: 2, jours: 'Lun – Ven' },
  { id: 'c3', nom: 'CE2-A', enseignant: 'Mme. Sanaa Bakkali', niveau: 'CE2', horaire: '08:30 – 13:00', salle: 'Salle 3', effectif: 2, jours: 'Lun – Ven' },
  { id: 'c4', nom: 'CM1-A', enseignant: 'M. Yassine Mourad', niveau: 'CM1', horaire: '08:30 – 13:30', salle: 'Salle 4', effectif: 2, jours: 'Lun – Ven' },
  { id: 'c5', nom: 'CM2-A', enseignant: 'Mme. Hind Zouari', niveau: 'CM2', horaire: '08:30 – 14:00', salle: 'Salle 5', effectif: 2, jours: 'Lun – Ven' },
];

const MOCK_PRESENCES: Presence[] = [
  { id: 'p1', eleveId: 'e1', date: '2026-04-14', statut: 'Présent', classe: 'CE2-A' },
  { id: 'p2', eleveId: 'e2', date: '2026-04-14', statut: 'Retard', classe: 'CE1-B' },
  { id: 'p3', eleveId: 'e3', date: '2026-04-14', statut: 'Présent', classe: 'CM1-A' },
  { id: 'p4', eleveId: 'e4', date: '2026-04-14', statut: 'Absent', classe: 'CP-A' },
  { id: 'p5', eleveId: 'e5', date: '2026-04-14', statut: 'Présent', classe: 'CM2-A' },
  { id: 'p6', eleveId: 'e6', date: '2026-04-14', statut: 'Présent', classe: 'CE1-B' },
  { id: 'p7', eleveId: 'e7', date: '2026-04-14', statut: 'Présent', classe: 'CE2-A' },
  { id: 'p8', eleveId: 'e9', date: '2026-04-14', statut: 'Absent', classe: 'CP-A' },
  { id: 'p9', eleveId: 'e10', date: '2026-04-14', statut: 'Présent', classe: 'CM2-A' },
  { id: 'p10', eleveId: 'e1', date: '2026-04-15', statut: 'Présent', classe: 'CE2-A' },
  { id: 'p11', eleveId: 'e2', date: '2026-04-15', statut: 'Présent', classe: 'CE1-B' },
  { id: 'p12', eleveId: 'e3', date: '2026-04-15', statut: 'Absent', classe: 'CM1-A' },
  { id: 'p13', eleveId: 'e4', date: '2026-04-15', statut: 'Présent', classe: 'CP-A' },
  { id: 'p14', eleveId: 'e5', date: '2026-04-15', statut: 'Présent', classe: 'CM2-A' },
  { id: 'p15', eleveId: 'e9', date: '2026-04-15', statut: 'Retard', classe: 'CP-A' },
  { id: 'p16', eleveId: 'e10', date: '2026-04-15', statut: 'Présent', classe: 'CM2-A' },
  { id: 'p17', eleveId: 'e1', date: '2026-04-16', statut: 'Présent', classe: 'CE2-A' },
  { id: 'p18', eleveId: 'e2', date: '2026-04-16', statut: 'Absent', classe: 'CE1-B' },
];

const MOCK_PAIEMENTS: Paiement[] = [
  { id: 'pay1', eleveId: 'e1', mois: 'Avril 2026', montant: 1200, statut: 'Payé', datePaiement: '2026-04-01' },
  { id: 'pay2', eleveId: 'e2', mois: 'Avril 2026', montant: 1200, statut: 'Non payé' },
  { id: 'pay3', eleveId: 'e3', mois: 'Avril 2026', montant: 1400, statut: 'Payé', datePaiement: '2026-04-02' },
  { id: 'pay4', eleveId: 'e4', mois: 'Avril 2026', montant: 1100, statut: 'Partiel', datePaiement: '2026-04-05' },
  { id: 'pay5', eleveId: 'e5', mois: 'Avril 2026', montant: 1500, statut: 'Payé', datePaiement: '2026-04-01' },
  { id: 'pay6', eleveId: 'e6', mois: 'Avril 2026', montant: 1200, statut: 'Non payé' },
  { id: 'pay7', eleveId: 'e7', mois: 'Avril 2026', montant: 1200, statut: 'Payé', datePaiement: '2026-04-03' },
  { id: 'pay8', eleveId: 'e9', mois: 'Avril 2026', montant: 1100, statut: 'Payé', datePaiement: '2026-04-02' },
  { id: 'pay9', eleveId: 'e10', mois: 'Avril 2026', montant: 1500, statut: 'Non payé' },
  { id: 'pay10', eleveId: 'e1', mois: 'Mars 2026', montant: 1200, statut: 'Payé', datePaiement: '2026-03-01' },
  { id: 'pay11', eleveId: 'e2', mois: 'Mars 2026', montant: 1200, statut: 'Payé', datePaiement: '2026-03-04' },
  { id: 'pay12', eleveId: 'e3', mois: 'Mars 2026', montant: 1400, statut: 'Payé', datePaiement: '2026-03-02' },
  { id: 'pay13', eleveId: 'e4', mois: 'Mars 2026', montant: 1100, statut: 'Non payé' },
  { id: 'pay14', eleveId: 'e5', mois: 'Mars 2026', montant: 1500, statut: 'Payé', datePaiement: '2026-03-01' },
];

const MOCK_DEVOIRS: Devoir[] = [
  { id: 'd1', titre: 'Rédaction – Mon Animal Préféré', matiere: 'Français', classe: 'CE2-A', dateLimite: '2026-04-18', description: 'Écrire un texte de 10 lignes sur votre animal préféré.' },
  { id: 'd2', titre: 'Tables de Multiplication', matiere: 'Mathématiques', classe: 'CE1-B', dateLimite: '2026-04-17', description: 'Apprendre les tables de 6, 7 et 8.' },
  { id: 'd3', titre: 'Lecture – Le Petit Prince', matiere: 'Lecture', classe: 'CM1-A', dateLimite: '2026-04-20', description: 'Lire les chapitres 1 à 5 et répondre aux questions.' },
  { id: 'd4', titre: 'Les Fractions', matiere: 'Mathématiques', classe: 'CM2-A', dateLimite: '2026-04-19', description: 'Exercices page 45 du manuel.' },
  { id: 'd5', titre: 'Dictée Préparée', matiere: 'Français', classe: 'CP-A', dateLimite: '2026-04-16', description: 'Apprendre les 10 mots de la liste.' },
];

const MOCK_NOTES: Note[] = [
  { id: 'n1', devoirId: 'd1', eleveId: 'e1', note: 18, commentaire: 'Excellent travail, très créatif.' },
  { id: 'n2', devoirId: 'd1', eleveId: 'e7', note: 15, commentaire: 'Bon effort, continuer.' },
  { id: 'n3', devoirId: 'd2', eleveId: 'e2', note: 14, commentaire: 'Quelques erreurs, à revoir.' },
  { id: 'n4', devoirId: 'd2', eleveId: 'e6', note: 16, commentaire: 'Très bien!' },
  { id: 'n5', devoirId: 'd3', eleveId: 'e3', note: 17, commentaire: 'Bonne compréhension du texte.' },
  { id: 'n6', devoirId: 'd4', eleveId: 'e5', note: 12, commentaire: 'Des efforts à fournir.' },
  { id: 'n7', devoirId: 'd4', eleveId: 'e10', note: 15, commentaire: 'Bien, attention aux signes.' },
  { id: 'n8', devoirId: 'd5', eleveId: 'e4', note: 19, commentaire: 'Parfait!' },
  { id: 'n9', devoirId: 'd5', eleveId: 'e9', note: 13, commentaire: '3 fautes, à corriger.' },
];

const MOCK_PERSONNEL: Personnel[] = [
  { id: 'st1', prenom: 'Karima', nom: 'Idrissi', role: 'Enseignante', matiere: 'Toutes matières (CP)', email: 'k.idrissi@educazen.com', telephone: '0661100001', dateEmbauche: '2024-09-01', statut: 'Actif' },
  { id: 'st2', prenom: 'Tarik', nom: 'Benali', role: 'Enseignant', matiere: 'Toutes matières (CE1)', email: 't.benali@educazen.com', telephone: '0661100002', dateEmbauche: '2024-09-01', statut: 'Actif' },
  { id: 'st3', prenom: 'Sanaa', nom: 'Bakkali', role: 'Enseignante', matiere: 'Toutes matières (CE2)', email: 's.bakkali@educazen.com', telephone: '0661100003', dateEmbauche: '2025-01-15', statut: 'Actif' },
  { id: 'st4', prenom: 'Yassine', nom: 'Mourad', role: 'Enseignant', matiere: 'Mathématiques & Sciences', email: 'y.mourad@educazen.com', telephone: '0661100004', dateEmbauche: '2024-09-01', statut: 'Actif' },
  { id: 'st5', prenom: 'Hind', nom: 'Zouari', role: 'Psychopédagogue', matiere: 'Accompagnement PAP', email: 'h.zouari@educazen.com', telephone: '0661100005', dateEmbauche: '2024-09-01', statut: 'Actif' },
  { id: 'st6', prenom: 'Rim', nom: 'Kettani', role: 'Art-thérapeute', matiere: 'Art-thérapie', email: 'r.kettani@educazen.com', telephone: '0661100006', dateEmbauche: '2025-02-01', statut: 'Congé' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const profilColor: Record<Profil, string> = {
  Standard: 'bg-gray-100 text-gray-600',
  HPI: 'bg-amber-50 text-amber-700 border border-amber-200',
  TDAH: 'bg-violet-50 text-violet-700 border border-violet-200',
  DYS: 'bg-teal-50 text-teal-700 border border-teal-200',
  TSA: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const presenceBadge: Record<StatutPresence, string> = {
  'Présent': 'bg-teal-50 text-teal-700',
  'Absent': 'bg-rose-100 text-rose-700',
  'Retard': 'bg-amber-50 text-amber-700',
};

const paiementBadge: Record<StatutPaiement, string> = {
  'Payé': 'bg-teal-50 text-teal-700',
  'Non payé': 'bg-rose-100 text-rose-700',
  'Partiel': 'bg-amber-50 text-amber-700',
};

const getInitials = (prenom: string, nom: string) =>
  `${prenom[0]}${nom[0]}`.toUpperCase();

const avatarColors = [
  'bg-[#FFF0F5] text-[#C2185B]',
  'bg-[#F8F0FF] text-[#7B1FA2]',
  'bg-[#E8F8F5] text-[#00897B]',
  'bg-amber-50 text-amber-700',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const EzStatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1" style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.15em' }}>{label}</p>
    <p className="text-3xl font-extrabold mb-1" style={{ fontFamily: 'Nunito, sans-serif', color }}>{value}</p>
    <p className="text-xs text-gray-500" style={{ fontFamily: 'Quicksand, sans-serif' }}>{sub}</p>
  </div>
);

const EzTabBtn = ({ label, icon: Icon, active, onClick }: { label: string; icon: any; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
      active ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
    }`}
    style={{
      fontFamily: 'Nunito, sans-serif',
      backgroundColor: active ? '#C2185B' : undefined,
    }}
  >
    <Icon size={16} />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface EducazenDashboardProps {
  role: 'admin' | 'parent';
  userEmail?: string;
}

export function EducazenDashboard({ role, userEmail }: EducazenDashboardProps) {
  const [tab, setTab] = useState<EzTab>('dashboard');
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterMois, setFilterMois] = useState('Avril 2026');
  const [showAddEleve, setShowAddEleve] = useState(false);
  const [editingEleve, setEditingEleve] = useState<Eleve | null>(null);
  const [eleves, setEleves] = useState<Eleve[]>(MOCK_ELEVES);
  const [presences, setPresences] = useState<Presence[]>(MOCK_PRESENCES);
  const [paiements, setPaiements] = useState<Paiement[]>(MOCK_PAIEMENTS);
  const [personnel, setPersonnel] = useState<Personnel[]>(MOCK_PERSONNEL);
  const [showAddPresence, setShowAddPresence] = useState(false);
  const [selectedDate, setSelectedDate] = useState('2026-04-17');

  // Parent view — find the student linked to this parent email
  const myChild = useMemo(() =>
    userEmail ? eleves.find(e => e.emailParent === userEmail) : null
  , [eleves, userEmail]);

  // ── Computed stats ──
  const activeEleves = eleves.filter(e => e.statut === 'Actif');
  const partiEleves = eleves.filter(e => e.statut === 'Parti');

  const paiementsMois = paiements.filter(p => p.mois === filterMois);
  const totalPercu = paiementsMois.filter(p => p.statut === 'Payé').reduce((s, p) => s + p.montant, 0);
  const totalAttendu = activeEleves.reduce((s, e) => s + e.montantMensuel, 0);
  const nonPayeurs = paiementsMois.filter(p => p.statut === 'Non payé');

  const presencesAujourdhui = presences.filter(p => p.date === selectedDate);
  const tauxPresence = presencesAujourdhui.length > 0
    ? Math.round(presencesAujourdhui.filter(p => p.statut === 'Présent').length / presencesAujourdhui.length * 100)
    : 0;

  // ── Filtered lists ──
  const filteredEleves = useMemo(() =>
    eleves.filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q || e.prenom.toLowerCase().includes(q) || e.nom.toLowerCase().includes(q) || e.nomParent.toLowerCase().includes(q);
      const matchClasse = !filterClasse || e.classe === filterClasse;
      const matchStatut = !filterStatut || e.statut === filterStatut;
      return matchSearch && matchClasse && matchStatut;
    }),
    [eleves, search, filterClasse, filterStatut]
  );

  const moisDisponibles = [...new Set(paiements.map(p => p.mois))];
  const classes = [...new Set(eleves.map(e => e.classe))].sort();

  // ── New student form ──
  const [formEleve, setFormEleve] = useState<Partial<Eleve>>({ profil: 'Standard', statut: 'Actif', montantMensuel: 1200 });

  const handleSaveEleve = () => {
    if (!formEleve.prenom || !formEleve.nom) return;
    if (editingEleve) {
      setEleves(prev => prev.map(e => e.id === editingEleve.id ? { ...e, ...formEleve } as Eleve : e));
    } else {
      const newEleve: Eleve = {
        id: `e${Date.now()}`,
        prenom: formEleve.prenom!,
        nom: formEleve.nom!,
        age: formEleve.age || 8,
        classe: formEleve.classe || 'CP-A',
        profil: (formEleve.profil as Profil) || 'Standard',
        nomParent: formEleve.nomParent || '',
        emailParent: formEleve.emailParent || '',
        telephone: formEleve.telephone || '',
        dateInscription: new Date().toISOString().slice(0, 10),
        statut: 'Actif',
        montantMensuel: formEleve.montantMensuel || 1200,
      };
      setEleves(prev => [...prev, newEleve]);
    }
    setShowAddEleve(false);
    setEditingEleve(null);
    setFormEleve({ profil: 'Standard', statut: 'Actif', montantMensuel: 1200 });
  };

  const handleDeleteEleve = (id: string) => {
    if (confirm('Supprimer cet élève ?')) setEleves(prev => prev.filter(e => e.id !== id));
  };

  const handleMarkPresence = (eleveId: string, statut: StatutPresence) => {
    const existing = presences.find(p => p.eleveId === eleveId && p.date === selectedDate);
    const eleve = eleves.find(e => e.id === eleveId);
    if (existing) {
      setPresences(prev => prev.map(p => p.id === existing.id ? { ...p, statut } : p));
    } else {
      setPresences(prev => [...prev, {
        id: `p${Date.now()}`,
        eleveId,
        date: selectedDate,
        statut,
        classe: eleve?.classe || '',
      }]);
    }
  };

  const handleTogglePaiement = (id: string) => {
    setPaiements(prev => prev.map(p =>
      p.id === id ? { ...p, statut: p.statut === 'Payé' ? 'Non payé' : 'Payé', datePaiement: p.statut !== 'Payé' ? new Date().toISOString().slice(0, 10) : undefined } : p
    ));
  };

  // ─── PARENT VIEW ───────────────────────────────────────────────────────────
  if (role === 'parent') {
    const child = myChild;
    const childPaiements = child ? paiements.filter(p => p.eleveId === child.id) : [];
    const childPresences = child ? presences.filter(p => p.eleveId === child.id) : [];
    const childNotes = child ? MOCK_NOTES.filter(n => n.eleveId === child.id) : [];

    return (
      <div className="space-y-6 max-w-3xl mx-auto" style={{ fontFamily: 'Quicksand, sans-serif' }}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <img src="/educazen.png" alt="EducazenKids" className="h-10 w-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'Nunito, sans-serif', color: '#C2185B' }}>
              Espace Parent
            </h1>
            <p className="text-sm text-gray-500">
              {child ? `${child.prenom} ${child.nom} — ${child.classe}` : 'Bienvenue sur votre espace'}
            </p>
          </div>
        </div>

        {!child ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100">
            <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
            <p>Aucun enfant associé à ce compte. Contactez l'administration.</p>
          </div>
        ) : (
          <>
            {/* Child status */}
            {child.statut === 'Parti' && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700">
                <AlertCircle size={20} />
                <span className="font-semibold">Votre enfant a quitté le centre EducazenKids.</span>
              </div>
            )}

            {/* Child card */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold bg-[#FFF0F5] text-[#C2185B]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  {getInitials(child.prenom, child.nom)}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    {child.prenom} {child.nom}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{child.classe}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${profilColor[child.profil]}`}>{child.profil}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${child.statut === 'Actif' ? 'bg-teal-50 text-teal-700' : 'bg-rose-100 text-rose-700'}`}>{child.statut}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Mensualité</p>
                  <p className="text-lg font-extrabold text-[#C2185B]" style={{ fontFamily: 'Nunito, sans-serif' }}>{child.montantMensuel} MAD</p>
                </div>
              </div>
            </div>

            {/* Payments */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                <CreditCard size={18} className="text-[#C2185B]" />
                <h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>Historique des Paiements</h3>
              </div>
              {childPaiements.length === 0 ? (
                <p className="p-6 text-center text-gray-400 text-sm">Aucun paiement enregistré.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {childPaiements.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="font-semibold text-gray-700">{p.mois}</p>
                        {p.datePaiement && <p className="text-xs text-gray-400">Payé le {p.datePaiement}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-700">{p.montant} MAD</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${paiementBadge[p.statut]}`}>{p.statut}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                <CheckSquare size={18} className="text-[#00897B]" />
                <h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>Présences Récentes</h3>
              </div>
              {childPresences.length === 0 ? (
                <p className="p-6 text-center text-gray-400 text-sm">Aucune présence enregistrée.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {childPresences.slice().reverse().map(p => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3">
                      <p className="font-medium text-gray-700">{p.date}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${presenceBadge[p.statut]}`}>{p.statut}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                <Star size={18} className="text-[#F9A825]" />
                <h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>Notes & Évaluations</h3>
              </div>
              {childNotes.length === 0 ? (
                <p className="p-6 text-center text-gray-400 text-sm">Aucune note enregistrée.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {childNotes.map(n => {
                    const devoir = MOCK_DEVOIRS.find(d => d.id === n.devoirId);
                    return (
                      <div key={n.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="font-semibold text-gray-700">{devoir?.titre}</p>
                          <p className="text-xs text-gray-400">{devoir?.matiere} · {n.commentaire}</p>
                        </div>
                        <span className={`text-lg font-extrabold ${n.note >= 16 ? 'text-[#00897B]' : n.note >= 12 ? 'text-[#F9A825]' : 'text-[#C2185B]'}`} style={{ fontFamily: 'Nunito, sans-serif' }}>
                          {n.note}/20
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── ADMIN VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5" style={{ fontFamily: 'Quicksand, sans-serif' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/educazen.png" alt="EducazenKids" className="h-10 w-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold" style={{ fontFamily: 'Nunito, sans-serif', color: '#2D2D3A' }}>
              Tableau de Bord <span style={{ color: '#C2185B' }}>EducazenKids</span>
            </h1>
            <p className="text-xs text-gray-400" style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.1em' }}>
              Centre Éducatif & Psychosocial · Agadir
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-400 font-medium">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex gap-1 overflow-x-auto">
        <EzTabBtn label="Vue d'ensemble" icon={LayoutDashboard} active={tab === 'dashboard'} onClick={() => setTab('dashboard')} />
        <EzTabBtn label="Élèves" icon={Users} active={tab === 'eleves'} onClick={() => setTab('eleves')} />
        <EzTabBtn label="Classes" icon={GraduationCap} active={tab === 'classes'} onClick={() => setTab('classes')} />
        <EzTabBtn label="Présences" icon={CheckSquare} active={tab === 'presences'} onClick={() => setTab('presences')} />
        <EzTabBtn label="Paiements" icon={CreditCard} active={tab === 'paiements'} onClick={() => setTab('paiements')} />
        <EzTabBtn label="Devoirs & Notes" icon={BookMarked} active={tab === 'devoirs'} onClick={() => setTab('devoirs')} />
        <EzTabBtn label="Personnel" icon={UserCog} active={tab === 'personnel'} onClick={() => setTab('personnel')} />
      </div>

      {/* ─── DASHBOARD TAB ─── */}
      {tab === 'dashboard' && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <EzStatCard label="Élèves Actifs" value={activeEleves.length} sub={`${partiEleves.length} parti(s)`} color="#C2185B" />
            <EzStatCard label="Taux de Présence" value={`${tauxPresence}%`} sub={`${selectedDate}`} color="#00897B" />
            <EzStatCard label="Recouvré (Avril)" value={`${totalPercu.toLocaleString()} MAD`} sub={`sur ${totalAttendu.toLocaleString()} MAD attendus`} color="#7B1FA2" />
            <EzStatCard label="Personnel Actif" value={personnel.filter(s => s.statut === 'Actif').length} sub={`${personnel.filter(s => s.statut === 'Congé').length} en congé`} color="#F9A825" />
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Non-payers */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-500" />
                  <h3 className="font-extrabold text-sm text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>Paiements en Attente</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold">{nonPayeurs.length}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {nonPayeurs.length === 0 ? (
                  <p className="p-5 text-center text-gray-400 text-sm">Tous les paiements sont à jour ✓</p>
                ) : nonPayeurs.map(p => {
                  const eleve = eleves.find(e => e.id === p.eleveId);
                  return eleve ? (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FFF0F5] text-[#C2185B] flex items-center justify-center text-xs font-bold" style={{ fontFamily: 'Nunito, sans-serif' }}>
                          {getInitials(eleve.prenom, eleve.nom)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{eleve.prenom} {eleve.nom}</p>
                          <p className="text-xs text-gray-400">{eleve.classe}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-rose-600">{eleve.montantMensuel} MAD</p>
                        <span className="text-xs text-rose-400">Non payé</span>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
              {nonPayeurs.length > 0 && (
                <div className="p-3 bg-rose-50/50 text-xs text-rose-600 font-semibold text-center">
                  Total impayé : {nonPayeurs.reduce((s, p) => { const e = eleves.find(el => el.id === p.eleveId); return s + (e?.montantMensuel || 0); }, 0).toLocaleString()} MAD
                </div>
              )}
            </div>

            {/* Recent absences */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                <Clock size={16} className="text-[#7B1FA2]" />
                <h3 className="font-extrabold text-sm text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>Absences Récentes</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {presences.filter(p => p.statut === 'Absent').slice(0, 6).map(p => {
                  const eleve = eleves.find(e => e.id === p.eleveId);
                  return eleve ? (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F8F0FF] text-[#7B1FA2] flex items-center justify-center text-xs font-bold" style={{ fontFamily: 'Nunito, sans-serif' }}>
                          {getInitials(eleve.prenom, eleve.nom)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{eleve.prenom} {eleve.nom}</p>
                          <p className="text-xs text-gray-400">{p.classe}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{p.date}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          {/* Students who left */}
          {partiEleves.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-amber-50 flex items-center gap-2">
                <TrendingDown size={16} className="text-amber-600" />
                <h3 className="font-extrabold text-sm text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>Élèves Ayant Quitté le Centre</h3>
              </div>
              <div className="divide-y divide-amber-50/50">
                {partiEleves.map(e => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-bold" style={{ fontFamily: 'Nunito, sans-serif' }}>
                        {getInitials(e.prenom, e.nom)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{e.prenom} {e.nom}</p>
                        <p className="text-xs text-gray-400">{e.classe} · {e.profil}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">Parti</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ELEVES TAB ─── */}
      {tab === 'eleves' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un élève ou parent..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#C2185B] bg-white"
                style={{ fontFamily: 'Quicksand, sans-serif' }}
              />
            </div>
            <select value={filterClasse} onChange={e => setFilterClasse(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none bg-white" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              <option value="">Toutes les classes</option>
              {classes.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none bg-white" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              <option value="">Tous statuts</option>
              <option>Actif</option>
              <option>Parti</option>
            </select>
            <button onClick={() => { setEditingEleve(null); setFormEleve({ profil: 'Standard', statut: 'Actif', montantMensuel: 1200 }); setShowAddEleve(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: '#C2185B', fontFamily: 'Nunito, sans-serif' }}>
              <Plus size={16} /> Inscrire un élève
            </button>
          </div>

          {/* Students table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: 'Quicksand, sans-serif', minWidth: '700px' }}>
                <thead>
                  <tr className="bg-[#FFF0F5]/60">
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#C2185B] uppercase tracking-wider">Élève</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#C2185B] uppercase tracking-wider">Classe</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#C2185B] uppercase tracking-wider hidden sm:table-cell">Profil</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#C2185B] uppercase tracking-wider hidden md:table-cell">Parent</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#C2185B] uppercase tracking-wider">Mensualité</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#C2185B] uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEleves.map((eleve, i) => (
                    <tr key={eleve.id} className="hover:bg-[#FFF0F5]/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarColors[i % avatarColors.length]}`} style={{ fontFamily: 'Nunito, sans-serif' }}>
                            {getInitials(eleve.prenom, eleve.nom)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{eleve.prenom} {eleve.nom}</p>
                            <p className="text-xs text-gray-400">{eleve.age} ans</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">{eleve.classe}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${profilColor[eleve.profil]}`}>{eleve.profil}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-gray-700">{eleve.nomParent}</p>
                        <p className="text-xs text-gray-400">{eleve.telephone}</p>
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ color: '#7B1FA2' }}>{eleve.montantMensuel} MAD</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${eleve.statut === 'Actif' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
                          {eleve.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingEleve(eleve); setFormEleve({ ...eleve }); setShowAddEleve(true); }}
                            className="p-1.5 rounded-lg hover:bg-[#FFF0F5] text-[#C2185B] transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteEleve(eleve.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50/50 text-xs text-gray-400 text-center">
              {filteredEleves.length} élève(s) affiché(s)
            </div>
          </div>
        </div>
      )}

      {/* ─── CLASSES TAB ─── */}
      {tab === 'classes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_CLASSES.map((cls, i) => {
            const classEleves = eleves.filter(e => e.classe === cls.nom && e.statut === 'Actif');
            return (
              <div key={cls.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-extrabold" style={{ fontFamily: 'Nunito, sans-serif', color: '#2D2D3A' }}>{cls.nom}</h3>
                    <p className="text-xs text-gray-400" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Niveau {cls.niveau}</p>
                  </div>
                  <span className="text-2xl font-extrabold" style={{ color: ['#C2185B', '#7B1FA2', '#00897B', '#F9A825'][i % 4], fontFamily: 'Nunito, sans-serif' }}>
                    {classEleves.length}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={14} className="text-gray-400" />
                    <span>{cls.enseignant}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <span>{cls.horaire} · {cls.jours}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-gray-400" />
                    <span>Salle {cls.salle}</span>
                  </div>
                </div>
                {/* Enrolled students */}
                {classEleves.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <div className="flex -space-x-2">
                      {classEleves.slice(0, 5).map((e, j) => (
                        <div key={e.id} title={`${e.prenom} ${e.nom}`}
                          className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold ${avatarColors[j % avatarColors.length]}`} style={{ fontFamily: 'Nunito, sans-serif' }}>
                          {getInitials(e.prenom, e.nom)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── PRESENCES TAB ─── */}
      {tab === 'presences' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-600">Date :</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#C2185B] bg-white"
                style={{ fontFamily: 'Quicksand, sans-serif' }} />
            </div>
            <div className="flex gap-3 text-sm">
              <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 font-semibold">
                {presences.filter(p => p.date === selectedDate && p.statut === 'Présent').length} Présents
              </span>
              <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 font-semibold">
                {presences.filter(p => p.date === selectedDate && p.statut === 'Absent').length} Absents
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
                {presences.filter(p => p.date === selectedDate && p.statut === 'Retard').length} Retards
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: 'Quicksand, sans-serif', minWidth: '500px' }}>
                <thead>
                  <tr className="bg-[#E8F8F5]/60">
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#00897B] uppercase tracking-wider">Élève</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#00897B] uppercase tracking-wider">Classe</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#00897B] uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-xs font-bold text-[#00897B] uppercase tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeEleves.map((eleve, i) => {
                    const p = presences.find(pr => pr.eleveId === eleve.id && pr.date === selectedDate);
                    return (
                      <tr key={eleve.id} className="hover:bg-[#E8F8F5]/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarColors[i % avatarColors.length]}`} style={{ fontFamily: 'Nunito, sans-serif' }}>
                              {getInitials(eleve.prenom, eleve.nom)}
                            </div>
                            <span className="font-semibold text-gray-800">{eleve.prenom} {eleve.nom}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{eleve.classe}</td>
                        <td className="px-4 py-3">
                          {p ? (
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${presenceBadge[p.statut]}`}>{p.statut}</span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-400">Non marqué</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1">
                            {(['Présent', 'Absent', 'Retard'] as StatutPresence[]).map(s => (
                              <button key={s} onClick={() => handleMarkPresence(eleve.id, s)}
                                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${p?.statut === s ? presenceBadge[s] + ' ring-1 ring-current' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                {s === 'Présent' ? '✓' : s === 'Absent' ? '✗' : '⏱'}
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

      {/* ─── PAIEMENTS TAB ─── */}
      {tab === 'paiements' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Total Perçu</p>
              <p className="text-2xl font-extrabold text-teal-700" style={{ fontFamily: 'Nunito, sans-serif' }}>{totalPercu.toLocaleString()} MAD</p>
            </div>
            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
              <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Reste à Collecter</p>
              <p className="text-2xl font-extrabold text-rose-600" style={{ fontFamily: 'Nunito, sans-serif' }}>{(totalAttendu - totalPercu).toLocaleString()} MAD</p>
            </div>
            <div className="bg-[#F8F0FF] rounded-2xl p-4 border border-violet-100">
              <p className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Taux de Recouvrement</p>
              <p className="text-2xl font-extrabold text-violet-700" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {totalAttendu > 0 ? Math.round(totalPercu / totalAttendu * 100) : 0}%
              </p>
            </div>
          </div>

          {/* Month filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-600">Mois :</label>
            <select value={filterMois} onChange={e => setFilterMois(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#C2185B] bg-white" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              {moisDisponibles.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          {/* Payments table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: 'Quicksand, sans-serif', minWidth: '500px' }}>
                <thead>
                  <tr className="bg-[#F8F0FF]/60">
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#7B1FA2] uppercase tracking-wider">Élève</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#7B1FA2] uppercase tracking-wider hidden sm:table-cell">Classe</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#7B1FA2] uppercase tracking-wider">Montant</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#7B1FA2] uppercase tracking-wider">Statut</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#7B1FA2] uppercase tracking-wider hidden md:table-cell">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeEleves.map((eleve, i) => {
                    const pay = paiementsMois.find(p => p.eleveId === eleve.id);
                    const statut: StatutPaiement = pay?.statut || 'Non payé';
                    return (
                      <tr key={eleve.id} className="hover:bg-[#F8F0FF]/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarColors[i % avatarColors.length]}`} style={{ fontFamily: 'Nunito, sans-serif' }}>
                              {getInitials(eleve.prenom, eleve.nom)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{eleve.prenom} {eleve.nom}</p>
                              <p className="text-xs text-gray-400">{eleve.nomParent}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{eleve.classe}</td>
                        <td className="px-4 py-3 font-bold" style={{ color: '#7B1FA2' }}>{eleve.montantMensuel} MAD</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${paiementBadge[statut]}`}>{statut}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{pay?.datePaiement || '—'}</td>
                        <td className="px-4 py-3">
                          {pay ? (
                            <button onClick={() => handleTogglePaiement(pay.id)}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${pay.statut === 'Payé' ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}>
                              {pay.statut === 'Payé' ? 'Annuler' : 'Marquer payé'}
                            </button>
                          ) : (
                            <button onClick={() => {
                              const newPay: Paiement = { id: `pay${Date.now()}`, eleveId: eleve.id, mois: filterMois, montant: eleve.montantMensuel, statut: 'Payé', datePaiement: new Date().toISOString().slice(0, 10) };
                              setPaiements(prev => [...prev, newPay]);
                            }}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-600 hover:bg-teal-100 transition-all">
                              Marquer payé
                            </button>
                          )}
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

      {/* ─── DEVOIRS & NOTES TAB ─── */}
      {tab === 'devoirs' && (
        <div className="space-y-4">
          {MOCK_DEVOIRS.map((devoir, i) => {
            const notesDevoir = MOCK_NOTES.filter(n => n.devoirId === devoir.id);
            const moyenne = notesDevoir.length > 0
              ? (notesDevoir.reduce((s, n) => s + n.note, 0) / notesDevoir.length).toFixed(1)
              : '—';
            const accentColors = ['#C2185B', '#7B1FA2', '#00897B', '#F9A825', '#C2185B'];
            return (
              <div key={devoir.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  style={{ borderLeftWidth: 4, borderLeftColor: accentColors[i % accentColors.length], borderLeftStyle: 'solid' }}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>{devoir.titre}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${accentColors[i % accentColors.length]}15`, color: accentColors[i % accentColors.length] }}>
                        {devoir.matiere}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{devoir.classe}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{devoir.description} · <span className="text-amber-600 font-semibold">Limite : {devoir.dateLimite}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Moyenne</p>
                    <p className="text-xl font-extrabold" style={{ fontFamily: 'Nunito, sans-serif', color: accentColors[i % accentColors.length] }}>{moyenne}{moyenne !== '—' ? '/20' : ''}</p>
                  </div>
                </div>
                {notesDevoir.length > 0 && (
                  <div className="divide-y divide-gray-50">
                    {notesDevoir.map(n => {
                      const eleve = eleves.find(e => e.id === n.eleveId);
                      return eleve ? (
                        <div key={n.id} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-[#FFF0F5] text-[#C2185B] flex items-center justify-center text-xs font-bold" style={{ fontFamily: 'Nunito, sans-serif' }}>
                              {getInitials(eleve.prenom, eleve.nom)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-700">{eleve.prenom} {eleve.nom}</p>
                              <p className="text-xs text-gray-400 italic">{n.commentaire}</p>
                            </div>
                          </div>
                          <span className={`text-lg font-extrabold ${n.note >= 16 ? 'text-[#00897B]' : n.note >= 12 ? 'text-[#F9A825]' : 'text-[#C2185B]'}`} style={{ fontFamily: 'Nunito, sans-serif' }}>
                            {n.note}/20
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
                {notesDevoir.length === 0 && (
                  <p className="p-4 text-center text-xs text-gray-400">Aucune note saisie pour ce devoir.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── PERSONNEL TAB ─── */}
      {tab === 'personnel' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personnel.map((p, i) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-extrabold ${avatarColors[i % avatarColors.length]}`} style={{ fontFamily: 'Nunito, sans-serif' }}>
                    {getInitials(p.prenom, p.nom)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-gray-800" style={{ fontFamily: 'Nunito, sans-serif' }}>{p.prenom} {p.nom}</h3>
                    <p className="text-xs font-semibold" style={{ color: '#C2185B' }}>{p.role}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.statut === 'Actif' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
                      {p.statut}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <BookOpen size={12} className="text-[#7B1FA2]" />
                    <span>{p.matiere}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-[#00897B]" />
                    <span className="truncate">{p.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-[#F9A825]" />
                    <span>{p.telephone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-gray-400" />
                    <span>Depuis le {p.dateEmbauche}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL: Add / Edit Student ─── */}
      {showAddEleve && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ fontFamily: 'Quicksand, sans-serif' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-extrabold" style={{ fontFamily: 'Nunito, sans-serif', color: '#C2185B' }}>
                {editingEleve ? 'Modifier l\'élève' : 'Inscrire un nouvel élève'}
              </h2>
              <button onClick={() => { setShowAddEleve(false); setEditingEleve(null); }} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Prénom', key: 'prenom', type: 'text' },
                { label: 'Nom', key: 'nom', type: 'text' },
                { label: 'Âge', key: 'age', type: 'number' },
                { label: 'Mensualité (MAD)', key: 'montantMensuel', type: 'number' },
                { label: 'Nom du parent', key: 'nomParent', type: 'text' },
                { label: 'Email parent', key: 'emailParent', type: 'email' },
                { label: 'Téléphone', key: 'telephone', type: 'tel' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">{label}</label>
                  <input type={type} value={(formEleve as any)[key] || ''}
                    onChange={e => setFormEleve(prev => ({ ...prev, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#C2185B] text-sm" />
                </div>
              ))}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Classe</label>
                <select value={formEleve.classe || ''} onChange={e => setFormEleve(prev => ({ ...prev, classe: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#C2185B] text-sm bg-white">
                  {classes.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Profil</label>
                <select value={formEleve.profil || 'Standard'} onChange={e => setFormEleve(prev => ({ ...prev, profil: e.target.value as Profil }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#C2185B] text-sm bg-white">
                  {['Standard', 'HPI', 'TDAH', 'DYS', 'TSA'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveEleve}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#C2185B', fontFamily: 'Nunito, sans-serif' }}>
                {editingEleve ? 'Enregistrer' : 'Inscrire l\'élève'}
              </button>
              <button onClick={() => { setShowAddEleve(false); setEditingEleve(null); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
