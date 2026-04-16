import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Upload, Check, Search, Trash2, Eye } from 'lucide-react';
import { supabase, ClientCard, ClientStage } from '../lib/supabase';
import Papa from 'papaparse';

const STAGES: ClientStage[] = ['Emailing', 'Check-in', 'Confirmed', 'Phoning / Calling', 'Replied / Answered'];

const STAGE_COLORS: Record<string, string> = {
  'Emailing': 'bg-blue-50 text-blue-600 border-blue-100',
  'Check-in': 'bg-amber-50 text-amber-600 border-amber-100',
  'Confirmed': 'bg-green-50 text-green-700 border-green-100',
  'Phoning / Calling': 'bg-purple-50 text-purple-600 border-purple-100',
  'Replied / Answered': 'bg-keppel/10 text-keppel border-keppel/20',
};

interface ClientBoardProps {
  currentOrgId: string | null;
  userRole: 'superadmin' | 'admin' | 'client';
}

export const ClientBoard: React.FC<ClientBoardProps> = ({ currentOrgId, userRole }) => {
  const [clients, setClients] = useState<ClientCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [hideDone, setHideDone] = useState(false); // default: show everyone

  const [showManualForm, setShowManualForm] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientCard | null>(null);
  const [editingClient, setEditingClient] = useState<ClientCard | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newClient, setNewClient] = useState<Partial<ClientCard>>({
    stage: 'Emailing',
    done: false,
    amount: 0,
  });

  const fetchClients = async () => {
    setIsLoading(true);
    let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (currentOrgId) query = query.eq('org_id', currentOrgId);
    const { data, error } = await query;
    if (error) setError(error.message);
    else setClients((data as ClientCard[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchClients(); }, [currentOrgId]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    const { data, error } = await supabase.from('clients').insert([{
      ...newClient,
      org_id: currentOrgId,
      order_index: clients.length,
    }]).select();
    if (error) {
      setError(error.message);
    } else if (data) {
      setShowManualForm(false);
      setNewClient({ stage: 'Emailing', done: false, amount: 0 });
      await fetchClients();
    }
    setIsSaving(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setIsSaving(true);
    const { error } = await supabase.from('clients').update({
      full_name: editingClient.full_name,
      email: editingClient.email,
      phone: editingClient.phone,
      amount: editingClient.amount,
      stage: editingClient.stage,
      date_time: editingClient.date_time,
    }).eq('id', editingClient.id);
    if (error) setError(error.message);
    else {
      setEditingClient(null);
      setSelectedClient(null);
      await fetchClients();
    }
    setIsSaving(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const newCards = rows.map((row, i) => ({
          org_id: currentOrgId,
          full_name: row['Full Name'] || row['Name'] || row['full_name'] || 'Unknown',
          email: row['Email'] || row['email'] || '',
          phone: row['Phone'] || row['phone'] || '',
          amount: parseFloat(String(row['Amount'] || row['amount'] || '0').replace(/[^0-9.-]+/, '')) || 0,
          date_time: row['Date & Time'] || row['date_time'] || new Date().toISOString(),
          stage: STAGES.includes(row['Stage'] as ClientStage) ? row['Stage'] : 'Emailing',
          done: false,
          order_index: clients.length + i,
        }));
        const { error } = await supabase.from('clients').insert(newCards);
        if (error) setError(error.message);
        setShowCsvUpload(false);
        await fetchClients();
        setIsLoading(false);
      },
      error: (err) => { setError(err.message); setIsLoading(false); }
    });
  };

  // Toggle done WITHOUT hiding — just marks it visually
  const toggleDone = async (e: React.MouseEvent, client: ClientCard) => {
    e.stopPropagation(); // don't open detail modal
    const newDone = !client.done;
    // Optimistic update
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, done: newDone } : c));
    const { error } = await supabase.from('clients').update({ done: newDone }).eq('id', client.id);
    if (error) {
      // Revert on failure
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, done: !newDone } : c));
      setError(error.message);
    }
  };

  const updateStage = async (e: React.ChangeEvent<HTMLSelectElement>, clientId: string) => {
    e.stopPropagation();
    const newStage = e.target.value as ClientStage;
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, stage: newStage } : c));
    await supabase.from('clients').update({ stage: newStage }).eq('id', clientId);
  };

  const deleteClient = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this client? This cannot be undone.')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) setError(error.message);
    else setClients(prev => prev.filter(c => c.id !== id));
    if (selectedClient?.id === id) setSelectedClient(null);
  };

  const filtered = clients.filter(c => {
    const matchSearch = !search ||
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'all' || c.stage === stageFilter;
    const matchDone = hideDone ? !c.done : true;
    return matchSearch && matchStage && matchDone;
  });

  const totalAmount = filtered.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const doneCount = clients.filter(c => c.done).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Client Board</h1>
          <p className="text-sm text-gray-500">
            {clients.length} clients · MAD {totalAmount.toLocaleString()} pipeline
            {doneCount > 0 && <span className="ml-2 text-keppel font-medium">· {doneCount} completed</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCsvUpload(true)} className="btn bg-gray-100 text-gray-600 flex items-center gap-2 text-sm">
            <Upload size={14} /> Import CSV
          </button>
          <button onClick={() => setShowManualForm(true)} className="btn btn-coral flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Client
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex justify-between">
          {error}
          <button onClick={() => setError(null)}><X size={14}/></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 sm:flex-none">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 w-full sm:w-56"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white w-full sm:w-auto"
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
        >
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => setHideDone(!hideDone)}
          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${hideDone ? 'bg-ink text-white border-ink' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
        >
          {hideDone ? '✓ Hiding Completed' : 'Show All'}
        </button>
      </div>

      {/* Stage pills */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map(s => {
          const count = clients.filter(c => c.stage === s).length;
          return count > 0 ? (
            <button
              key={s}
              onClick={() => setStageFilter(stageFilter === s ? 'all' : s)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${STAGE_COLORS[s]} ${stageFilter === s ? 'ring-2 ring-offset-1 ring-brand-primary' : ''}`}
            >
              {s} <span className="opacity-60">· {count}</span>
            </button>
          ) : null;
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
            <tr>
              <th className="px-4 py-3 w-8">Done</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3 hidden md:table-cell">Contact</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3 hidden sm:table-cell">Amount</th>
              <th className="px-4 py-3 hidden lg:table-cell">Date</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-gray-400 text-sm mb-3">No clients found.</p>
                  <button onClick={() => setShowManualForm(true)} className="btn btn-coral text-xs">
                    <Plus size={12} className="inline mr-1" /> Add First Client
                  </button>
                </td>
              </tr>
            ) : filtered.map(client => (
              <tr
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${client.done ? 'bg-gray-50/50' : ''}`}
              >
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => toggleDone(e, client)}
                    title={client.done ? 'Mark as active' : 'Mark as done'}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      client.done
                        ? 'bg-keppel border-keppel text-white'
                        : 'border-gray-300 hover:border-keppel hover:bg-keppel/5'
                    }`}
                  >
                    {client.done && <Check size={11} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${client.done ? 'text-gray-400 line-through' : 'text-ink'}`}>
                    {client.full_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                  <div className="text-xs">{client.email}</div>
                  <div className="text-xs text-gray-400">{client.phone}</div>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <select
                    className={`text-xs font-bold px-2 py-1 rounded-full border cursor-pointer focus:outline-none ${STAGE_COLORS[client.stage] || 'bg-gray-100 text-gray-500 border-gray-200'}`}
                    value={client.stage}
                    onChange={e => updateStage(e, client.id)}
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 font-bold text-brand-primary hidden sm:table-cell">
                  MAD {Number(client.amount).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                  {client.date_time ? new Date(client.date_time).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSelectedClient(client)}
                      title="View details"
                      className="p-1 text-gray-300 hover:text-brand-primary transition-colors"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={(e) => deleteClient(e, client.id)}
                      title="Delete"
                      className="p-1 text-gray-300 hover:text-red-400 transition-colors"
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

      {/* ── Detail / Edit Modal ── */}
      {selectedClient && !editingClient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedClient(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="font-bold text-xl text-ink">{selectedClient.full_name}</h3>
                <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full border ${STAGE_COLORS[selectedClient.stage]}`}>
                  {selectedClient.stage}
                </span>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-ink"><X size={20} /></button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">Email</span>
                <span className="font-medium">{selectedClient.email || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">Phone</span>
                <span className="font-medium">{selectedClient.phone || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">Amount</span>
                <span className="font-bold text-brand-primary">MAD {Number(selectedClient.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-400">Date</span>
                <span className="font-medium">
                  {selectedClient.date_time ? new Date(selectedClient.date_time).toLocaleString('en-GB') : '—'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Status</span>
                <span className={selectedClient.done ? 'text-keppel font-bold' : 'text-gray-500'}>
                  {selectedClient.done ? '✓ Completed' : 'In Progress'}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingClient({ ...selectedClient })}
                className="btn btn-coral flex-1"
              >
                Edit
              </button>
              <button
                onClick={(e) => deleteClient(e, selectedClient.id)}
                className="btn bg-red-50 text-red-500 border border-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditingClient(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-ink">Edit Client</h3>
              <button onClick={() => setEditingClient(null)} className="text-gray-400 hover:text-ink"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Full Name</label>
                  <input required type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={editingClient.full_name || ''} onChange={e => setEditingClient({ ...editingClient, full_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Email</label>
                  <input type="email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={editingClient.email || ''} onChange={e => setEditingClient({ ...editingClient, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Phone</label>
                  <input type="tel" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={editingClient.phone || ''} onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Amount (MAD)</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={editingClient.amount || ''} onChange={e => setEditingClient({ ...editingClient, amount: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Stage</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={editingClient.stage} onChange={e => setEditingClient({ ...editingClient, stage: e.target.value as ClientStage })}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Date & Time</label>
                  <input type="datetime-local" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={editingClient.date_time?.slice(0, 16) || ''} onChange={e => setEditingClient({ ...editingClient, date_time: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setEditingClient(null)} className="btn bg-gray-100 text-gray-600">Cancel</button>
                <button type="submit" disabled={isSaving} className="btn btn-coral">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showManualForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowManualForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-ink">Add New Client</h3>
              <button onClick={() => setShowManualForm(false)} className="text-gray-400 hover:text-ink"><X size={20} /></button>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Full Name *</label>
                  <input required type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={newClient.full_name || ''} onChange={e => setNewClient({ ...newClient, full_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Email</label>
                  <input type="email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={newClient.email || ''} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Phone</label>
                  <input type="tel" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={newClient.phone || ''} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Amount (MAD)</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={newClient.amount || ''} onChange={e => setNewClient({ ...newClient, amount: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Stage</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={newClient.stage} onChange={e => setNewClient({ ...newClient, stage: e.target.value as ClientStage })}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Date & Time</label>
                  <input type="datetime-local" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={newClient.date_time || ''} onChange={e => setNewClient({ ...newClient, date_time: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowManualForm(false)} className="btn bg-gray-100 text-gray-600">Cancel</button>
                <button type="submit" disabled={isSaving} className="btn btn-coral">
                  {isSaving ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvUpload && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowCsvUpload(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-ink">Import CSV</h3>
              <button onClick={() => setShowCsvUpload(false)} className="text-gray-400 hover:text-ink"><X size={20} /></button>
            </div>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:bg-gray-50 hover:border-brand-primary/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">Click to select a CSV file</p>
              <p className="text-xs mt-2 text-gray-400">Columns: Full Name, Email, Phone, Amount, Stage</p>
              <p className="text-[10px] mt-3 text-brand-primary font-medium">Sample file: sample_clients.csv in project root</p>
            </div>
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          </div>
        </div>
      )}
    </div>
  );
};
