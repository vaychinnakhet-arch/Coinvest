import React, { useState } from 'react';
import { AppState, Project, Transaction, TransactionType, Partner } from '../types';
import { Card, Button, Input, Select, Badge } from './ui/Components';
import { Plus, FolderOpen, ArrowRight, Trash2, Calendar, FileText, DollarSign, Pencil, X } from 'lucide-react';

interface ProjectsProps {
  data: AppState;
  onAddProject: (p: Omit<Project, 'id'>) => void;
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const Projects: React.FC<ProjectsProps> = ({ data, onAddProject, onAddTransaction, onUpdateTransaction, onDeleteTransaction }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(data.projects.length > 0 ? data.projects[0].id : null);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  
  // New Project State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Transaction Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transType, setTransType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [transAmount, setTransAmount] = useState('');
  const [transPartner, setTransPartner] = useState('');
  const [transNote, setTransNote] = useState('');
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedProject = data.projects.find(p => p.id === selectedProjectId);
  
  // Ensure strict date sorting (Newest -> Oldest)
  const projectTransactions = data.transactions
    .filter(t => t.projectId === selectedProjectId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName) return;
    onAddProject({
      name: newProjectName,
      description: newProjectDesc,
      status: 'planning',
      startDate: new Date().toISOString(),
    });
    setNewProjectName('');
    setNewProjectDesc('');
    setShowNewProjectForm(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !transAmount) return;
    
    if (editingId) {
      // Update Mode
      onUpdateTransaction({
        id: editingId,
        projectId: selectedProjectId,
        type: transType,
        amount: parseFloat(transAmount),
        date: transDate,
        note: transNote,
        partnerId: transPartner || undefined,
      });
      // Exit Edit Mode
      setEditingId(null);
    } else {
      // Create Mode
      onAddTransaction({
        projectId: selectedProjectId,
        type: transType,
        amount: parseFloat(transAmount),
        date: transDate,
        note: transNote,
        partnerId: transPartner || undefined,
      });
    }
    
    // Reset Form common fields
    setTransAmount('');
    setTransNote('');
    
    // Only reset these if we were in editing mode (to clear the state), 
    // otherwise keeping date/type/partner might be convenient for adding multiple items.
    if (editingId) {
      setTransType(TransactionType.EXPENSE);
      setTransPartner('');
      setTransDate(new Date().toISOString().split('T')[0]);
    }
  };

  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
    setTransType(t.type);
    setTransAmount(t.amount.toString());
    setTransDate(t.date);
    setTransNote(t.note);
    setTransPartner(t.partnerId || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTransAmount('');
    setTransNote('');
    setTransDate(new Date().toISOString().split('T')[0]);
    setTransType(TransactionType.EXPENSE);
    setTransPartner('');
  };

  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case TransactionType.INCOME: return 'text-emerald-600 bg-emerald-50';
      case TransactionType.EXPENSE: return 'text-rose-600 bg-rose-50';
      case TransactionType.INVESTMENT: return 'text-indigo-600 bg-indigo-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar List of Projects */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-700">โครงการทั้งหมด</h2>
          <Button size="sm" onClick={() => setShowNewProjectForm(!showNewProjectForm)}>
            <Plus size={16} className="mr-1" /> สร้าง
          </Button>
        </div>

        {showNewProjectForm && (
          <Card className="animate-in slide-in-from-top-4 fade-in duration-300">
            <form onSubmit={handleCreateProject} className="flex flex-col gap-3">
              <Input 
                placeholder="ชื่อโครงการ" 
                value={newProjectName} 
                onChange={e => setNewProjectName(e.target.value)} 
                autoFocus
              />
              <Input 
                placeholder="รายละเอียดสั้นๆ" 
                value={newProjectDesc} 
                onChange={e => setNewProjectDesc(e.target.value)} 
              />
              <div className="flex gap-2 justify-end mt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewProjectForm(false)}>ยกเลิก</Button>
                <Button type="submit" size="sm">บันทึก</Button>
              </div>
            </form>
          </Card>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {data.projects.map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${
                selectedProjectId === p.id 
                  ? 'bg-white border-indigo-400 shadow-md ring-1 ring-indigo-100' 
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold ${selectedProjectId === p.id ? 'text-indigo-700' : 'text-slate-700'}`}>{p.name}</h3>
                <Badge color={p.status === 'active' ? 'green' : 'yellow'}>
                  {p.status === 'active' ? 'กำลังดำเนินงาน' : 'วางแผน'}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2">{p.description || "ไม่มีรายละเอียด"}</p>
            </div>
          ))}
          
          {data.projects.length === 0 && (
            <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <FolderOpen size={32} className="mx-auto mb-2 opacity-50"/>
              <p>ยังไม่มีโครงการ</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area (Selected Project Details) */}
      <div className="w-full lg:w-2/3 flex flex-col h-full overflow-hidden">
        {selectedProject ? (
          <div className="flex flex-col h-full gap-6">
             <Card className="shrink-0 bg-indigo-50 border-indigo-100">
                <h2 className="text-2xl font-bold text-indigo-900 mb-1">{selectedProject.name}</h2>
                <p className="text-indigo-600/80 mb-4">{selectedProject.description}</p>
                <div className="flex gap-4 text-sm text-indigo-700 font-medium">
                  <div className="flex items-center gap-1">
                    <Calendar size={16}/> เริ่ม: {new Date(selectedProject.startDate).toLocaleDateString('th-TH')}
                  </div>
                </div>
             </Card>

             <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                {/* Transaction List */}
                <Card className="flex-1 flex flex-col min-h-0 overflow-hidden" title="รายการเคลื่อนไหว">
                   <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                      {projectTransactions.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                          <FileText size={32} className="mx-auto mb-2 opacity-50"/>
                          <p>ยังไม่มีรายการบันทึก</p>
                        </div>
                      ) : (
                        projectTransactions.map(t => (
                          <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors group ${editingId === t.id ? 'bg-amber-50 border-amber-200' : 'hover:bg-slate-50 border-transparent hover:border-slate-100'}`}>
                             <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTransactionColor(t.type)}`}>
                                   {t.type === TransactionType.INCOME ? <Plus size={18}/> : t.type === TransactionType.INVESTMENT ? <DollarSign size={18}/> : <ArrowRight size={18} className="-rotate-45"/>}
                                </div>
                                <div>
                                   <p className="font-medium text-slate-700">{t.note || (t.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย')}</p>
                                   <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString('th-TH')} • {data.partners.find(p => p.id === t.partnerId)?.name || 'กองกลาง'}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className={`font-bold mr-2 ${
                                  t.type === TransactionType.INCOME ? 'text-emerald-600' : 
                                  t.type === TransactionType.INVESTMENT ? 'text-indigo-600' : 'text-rose-600'
                                }`}>
                                  {t.type === TransactionType.EXPENSE ? '-' : '+'}{t.amount.toLocaleString()}
                                </span>
                                
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); startEditing(t); }}
                                    className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="แก้ไข"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteTransaction(t.id); }}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="ลบ"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </Card>

                {/* Add/Edit Transaction Form */}
                <Card 
                  className={`w-full lg:w-80 shrink-0 h-fit transition-colors duration-300 ${editingId ? 'ring-2 ring-amber-400 border-amber-200' : ''}`} 
                  title={editingId ? "แก้ไขรายการ" : "บันทึกรายการ"}
                  action={editingId && (
                    <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  )}
                >
                   <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                        {[
                          { val: TransactionType.EXPENSE, label: 'รายจ่าย' },
                          { val: TransactionType.INCOME, label: 'รายรับ' },
                          { val: TransactionType.INVESTMENT, label: 'ลงทุน' },
                        ].map(type => (
                          <button
                            key={type.val}
                            type="button"
                            onClick={() => setTransType(type.val as TransactionType)}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                              transType === type.val ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>

                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        label="จำนวนเงิน (THB)"
                        value={transAmount}
                        onChange={e => setTransAmount(e.target.value)}
                        required
                        className="font-mono text-lg"
                      />

                      <Input 
                        type="date" 
                        label="วันที่"
                        value={transDate}
                        onChange={e => setTransDate(e.target.value)}
                        required
                      />

                      <Input 
                        placeholder="เช่น ค่าวัสดุ, ค่าเช่า..." 
                        label="บันทึกช่วยจำ"
                        value={transNote}
                        onChange={e => setTransNote(e.target.value)}
                      />

                      {(transType === TransactionType.INVESTMENT || transType === TransactionType.WITHDRAWAL) && (
                         <Select 
                           label="หุ้นส่วน (ผู้จ่าย)"
                           options={[
                             { value: '', label: '-- เลือกหุ้นส่วน --' },
                             ...data.partners.map(p => ({ value: p.id, label: p.name }))
                           ]}
                           value={transPartner}
                           onChange={e => setTransPartner(e.target.value)}
                           required={transType === TransactionType.INVESTMENT}
                         />
                      )}

                      <div className="flex gap-2 mt-2">
                         {editingId && (
                            <Button type="button" variant="secondary" className="flex-1" onClick={cancelEditing}>
                               ยกเลิก
                            </Button>
                         )}
                         <Button type="submit" className="flex-1" disabled={!transAmount}>
                           {editingId ? 'บันทึกแก้ไข' : 'เพิ่มรายการ'}
                         </Button>
                      </div>
                   </form>
                </Card>
             </div>
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <FolderOpen size={64} className="mb-4 opacity-20"/>
              <p className="text-lg">เลือกโครงการทางซ้ายมือ</p>
              <p className="text-sm">เพื่อดูรายละเอียดและจัดการรายรับรายจ่าย</p>
           </div>
        )}
      </div>
    </div>
  );
};