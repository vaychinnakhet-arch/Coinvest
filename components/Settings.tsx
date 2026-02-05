import React, { useRef, useState } from 'react';
import { AppState, Partner } from '../types';
import { Card, Button, Input } from './ui/Components';
import { Upload, Download, Database, FileJson, CheckCircle2, AlertCircle, RefreshCw, HardDrive, Loader2, Users, Plus, Trash2, Palette, User } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';

interface SettingsProps {
  data: AppState;
  onImport: (data: AppState) => void;
  onAddPartner: (partner: Omit<Partner, 'id'>) => void;
  onDeletePartner: (id: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ data, onImport, onAddPartner, onDeletePartner }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Partner Form State
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerAvatar, setNewPartnerAvatar] = useState('🧑‍💻');
  const [newPartnerColor, setNewPartnerColor] = useState('#818CF8');

  // Colors Palette
  const colorPalette = ['#818CF8', '#34D399', '#F472B6', '#FBBF24', '#60A5FA', '#A78BFA', '#FB7185', '#2DD4BF'];
  // Emoji Palette (Simple subset)
  const emojiPalette = ['👨‍💼', '👩‍💼', '🧑‍💻', '🦸‍♂️', '🧙‍♀️', '🦊', '🐱', '🐶', '🦁', '🐸'];

  // Export Function
  const handleExport = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CoInvest-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.partners && json.projects && json.transactions) {
          onImport(json);
          setImportStatus('success');
          setTimeout(() => setImportStatus('idle'), 3000);
        } else throw new Error("Invalid structure");
      } catch (err) {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreatePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName) return;
    onAddPartner({
      name: newPartnerName,
      avatar: newPartnerAvatar,
      color: newPartnerColor
    });
    setNewPartnerName('');
    // Randomize defaults for next add
    setNewPartnerAvatar(emojiPalette[Math.floor(Math.random() * emojiPalette.length)]);
    setNewPartnerColor(colorPalette[Math.floor(Math.random() * colorPalette.length)]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
           <Database size={32} />
        </div>
        <div>
           <h2 className="text-2xl font-bold text-slate-800">จัดการข้อมูล (Data Management)</h2>
           <p className="text-slate-500">จัดการหุ้นส่วน เชื่อมต่อฐานข้อมูล หรือสำรองข้อมูล</p>
        </div>
      </div>

      {/* Partner Management Section */}
      <Card title="จัดการรายชื่อหุ้นส่วน (Partner Management)" className="border-slate-200">
         <div className="flex flex-col md:flex-row gap-8">
            {/* Form */}
            <div className="w-full md:w-1/3 space-y-4">
               <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                 <Plus size={18} className="text-indigo-500"/> เพิ่มหุ้นส่วนใหม่
               </h4>
               <form onSubmit={handleCreatePartner} className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <Input 
                    label="ชื่อหุ้นส่วน" 
                    value={newPartnerName} 
                    onChange={e => setNewPartnerName(e.target.value)} 
                    placeholder="เช่น คุณสมชาย" 
                    required
                  />
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-2 block">เลือก Avatar</label>
                    <div className="flex gap-2 flex-wrap">
                       {emojiPalette.map(emoji => (
                         <button 
                           key={emoji}
                           type="button"
                           onClick={() => setNewPartnerAvatar(emoji)}
                           className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${newPartnerAvatar === emoji ? 'bg-white shadow-md scale-110' : 'bg-slate-100 hover:bg-slate-200'}`}
                         >
                           {emoji}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-2 block">เลือกสีประจำตัว</label>
                    <div className="flex gap-2 flex-wrap">
                       {colorPalette.map(color => (
                         <button 
                           key={color}
                           type="button"
                           onClick={() => setNewPartnerColor(color)}
                           className={`w-8 h-8 rounded-full transition-all border-2 ${newPartnerColor === color ? 'border-slate-500 scale-110' : 'border-transparent'}`}
                           style={{ backgroundColor: color }}
                         />
                       ))}
                    </div>
                  </div>

                  <Button type="submit" className="w-full">เพิ่มหุ้นส่วน</Button>
               </form>
            </div>

            {/* List */}
            <div className="w-full md:w-2/3">
               <h4 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
                 <Users size={18} className="text-indigo-500"/> รายชื่อหุ้นส่วนปัจจุบัน ({data.partners.length})
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.partners.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: p.color + '20' }}>
                             {p.avatar}
                          </div>
                          <div>
                             <p className="font-bold text-slate-700">{p.name}</p>
                             <div className="w-16 h-1 rounded-full mt-1" style={{ backgroundColor: p.color }}></div>
                          </div>
                       </div>
                       <button 
                         onClick={() => {
                           if(confirm(`ยืนยันการลบหุ้นส่วน "${p.name}"?`)) onDeletePartner(p.id);
                         }}
                         className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                         title="ลบหุ้นส่วน"
                       >
                         <Trash2 size={18}/>
                       </button>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <Download size={24} />
            </div>
            <h3 className="font-bold text-slate-800">Export JSON</h3>
            <p className="text-slate-500 text-sm mb-4">สำรองข้อมูลเก็บไว้ในเครื่อง</p>
            <Button onClick={handleExport} variant="secondary" className="w-full">
               <FileJson className="mr-2" size={16}/> ดาวน์โหลดไฟล์
            </Button>
        </div>

        {/* Import Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${importStatus === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
              {importStatus === 'success' ? <CheckCircle2 size={24}/> : <Upload size={24} />}
            </div>
            <h3 className="font-bold text-slate-800">Import JSON</h3>
            <p className="text-slate-500 text-sm mb-4">กู้คืนข้อมูล (Local Mode เท่านั้น)</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/json" className="hidden" />
            <Button onClick={handleImportClick} variant="secondary" className="w-full">
               <Upload className="mr-2" size={16}/> อัปโหลดไฟล์
            </Button>
        </div>
      </div>

      {/* Database Connection Info */}
      <div className="p-4 bg-slate-100 rounded-xl flex items-center justify-between text-sm">
         <div className="flex items-center gap-3 text-slate-600">
            <HardDrive size={18}/>
            <span>สถานะการเชื่อมต่อ Database:</span>
            <span className={`px-2 py-0.5 rounded font-medium ${supabaseService.isConnected() ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
               {supabaseService.isConnected() ? 'Connected (Realtime)' : 'Local Storage'}
            </span>
         </div>
      </div>

    </div>
  );
};