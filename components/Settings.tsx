import React, { useRef, useState, useEffect } from 'react';
import { AppState, Partner } from '../types';
import { Card, Button, Input } from './ui/Components';
import { Upload, Download, Database, FileJson, CheckCircle2, Link, Users, Plus, Trash2, Save, Sheet, Code, Copy, ChevronDown, ChevronUp, CloudUpload, Loader2 } from 'lucide-react';
import { googleSheetsService } from '../services/googleSheetsService';

interface SettingsProps {
  data: AppState;
  onImport: (data: AppState) => void;
  onAddPartner: (partner: Omit<Partner, 'id'>) => void;
  onDeletePartner: (id: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ data, onImport, onAddPartner, onDeletePartner }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scriptUrl, setScriptUrl] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Partner Form State
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerAvatar, setNewPartnerAvatar] = useState('🧑‍💻');
  const [newPartnerColor, setNewPartnerColor] = useState('#818CF8');

  // Colors Palette
  const colorPalette = ['#818CF8', '#34D399', '#F472B6', '#FBBF24', '#60A5FA', '#A78BFA', '#FB7185', '#2DD4BF'];
  // Emoji Palette (Simple subset)
  const emojiPalette = ['👨‍💼', '👩‍💼', '🧑‍💻', '🦸‍♂️', '🧙‍♀️', '🦊', '🐱', '🐶', '🦁', '🐸'];

  useEffect(() => {
    const savedUrl = googleSheetsService.getUrl();
    if (savedUrl) setScriptUrl(savedUrl);
  }, []);

  const handleSaveUrl = () => {
    googleSheetsService.setUrl(scriptUrl);
    alert("บันทึก URL เรียบร้อย กรุณารีเฟรชหน้าเว็บเพื่อโหลดข้อมูล");
    window.location.reload();
  };

  const handleForceSync = async () => {
    if (!googleSheetsService.isConnected()) {
        alert("กรุณาตั้งค่า Google Sheets URL ก่อน");
        return;
    }

    const confirmSync = confirm(
        "⚠️ ยืนยันการอัปโหลดข้อมูล?\n\n" +
        "ข้อมูลทั้งหมดที่คุณเห็นในหน้านี้ จะถูกนำไปเขียนทับ (Overwrite) ข้อมูลบน Google Sheets ทั้งหมด\n" +
        "ใช้ปุ่มนี้เมื่อคุณ Import JSON มาแล้วแต่ข้อมูลไม่ขึ้น Cloud"
    );

    if (confirmSync) {
        setIsSyncing(true);
        try {
            const result = await googleSheetsService.importData(data);
            if (result.error) {
                throw new Error(JSON.stringify(result.error));
            }
            alert("✅ อัปโหลดข้อมูลขึ้น Google Sheets สำเร็จ!");
        } catch (error) {
            console.error(error);
            alert("❌ เกิดข้อผิดพลาด: " + error);
        } finally {
            setIsSyncing(false);
        }
    }
  };

  const handleCopyCode = () => {
    const code = `
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 30 seconds for other processes to finish
  lock.tryLock(30000);

  try {
    var output = {};
    var action = '';
    var data = null;

    if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
      data = e.parameter;
    } else if (e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      action = body.action;
      data = body.data;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheet(ss, 'Partners');
    ensureSheet(ss, 'Projects');
    ensureSheet(ss, 'Transactions');

    if (action === 'getData') {
      output = getAllData(ss);
    } else if (action === 'importData') {
      // This is the function to overwrite everything
      importAllData(ss, data);
      output = { status: 'success', message: 'Imported successfully' };
    } else if (action === 'addPartner') {
      addPartner(ss, data);
      output = { status: 'success' };
    } else if (action === 'deletePartner') {
      deletePartner(ss, data.id);
      output = { status: 'success' };
    } else if (action === 'addProject') {
      addProject(ss, data);
      output = { status: 'success' };
    } else if (action === 'addTransaction') {
      addTransaction(ss, data);
      output = { status: 'success' };
    } else if (action === 'updateTransaction') {
      updateTransaction(ss, data);
      output = { status: 'success' };
    } else if (action === 'deleteTransaction') {
      deleteTransaction(ss, data.id);
      output = { status: 'success' };
    } else {
      output = { status: 'error', message: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function ensureSheet(ss, name) {
  if (!ss.getSheetByName(name)) ss.insertSheet(name);
}

function getAllData(ss) {
  var pSheet = ss.getSheetByName('Partners');
  var pjSheet = ss.getSheetByName('Projects');
  var tSheet = ss.getSheetByName('Transactions');

  return {
    partners: getRows(pSheet),
    projects: getRows(pjSheet),
    transactions: getRows(tSheet)
  };
}

function getRows(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  var headers = rows[0];
  var data = [];
  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j];
    }
    data.push(obj);
  }
  return data;
}

function importAllData(ss, data) {
  // Clear and rewrite all sheets
  if(data.partners) overwriteSheet(ss, 'Partners', data.partners);
  if(data.projects) overwriteSheet(ss, 'Projects', data.projects);
  if(data.transactions) overwriteSheet(ss, 'Transactions', data.transactions);
}

function overwriteSheet(ss, sheetName, dataArray) {
  var sheet = ss.getSheetByName(sheetName);
  sheet.clear(); // Clear existing content
  
  if (!dataArray || dataArray.length === 0) return;
  
  // Create Headers
  var headers = Object.keys(dataArray[0]);
  sheet.appendRow(headers);
  
  // Map data to array of arrays
  var rows = dataArray.map(function(obj) {
    return headers.map(function(h) {
      var val = obj[h];
      return val === undefined || val === null ? '' : val;
    });
  });
  
  // Write in bulk (much faster than appendRow loop)
  if(rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function addPartner(ss, p) {
  var sheet = ss.getSheetByName('Partners');
  if (sheet.getLastRow() === 0) sheet.appendRow(['id', 'name', 'avatar', 'color']);
  sheet.appendRow([p.id, p.name, p.avatar, p.color]);
}

function deletePartner(ss, id) {
  deleteRowById(ss.getSheetByName('Partners'), id);
}

function addProject(ss, p) {
  var sheet = ss.getSheetByName('Projects');
  if (sheet.getLastRow() === 0) sheet.appendRow(['id', 'name', 'description', 'status', 'startDate']);
  sheet.appendRow([p.id, p.name, p.description, p.status, p.startDate]);
}

function addTransaction(ss, t) {
  var sheet = ss.getSheetByName('Transactions');
  if (sheet.getLastRow() === 0) sheet.appendRow(['id', 'projectId', 'partnerId', 'type', 'amount', 'date', 'note']);
  sheet.appendRow([t.id, t.projectId, t.partnerId, t.type, t.amount, t.date, t.note]);
}

function updateTransaction(ss, t) {
   var sheet = ss.getSheetByName('Transactions');
   var data = sheet.getDataRange().getValues();
   for(var i=1; i<data.length; i++) {
     if(data[i][0] == t.id) {
       sheet.getRange(i+1, 1, 1, 7).setValues([[t.id, t.projectId, t.partnerId, t.type, t.amount, t.date, t.note]]);
       break;
     }
   }
}

function deleteTransaction(ss, id) {
  deleteRowById(ss.getSheetByName('Transactions'), id);
}

function deleteRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}`;
    navigator.clipboard.writeText(code);
    alert("คัดลอกโค้ดแล้ว! นำไปวางใน Google Apps Script Editor ได้เลย");
  };

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
           <p className="text-slate-500">จัดการหุ้นส่วน เชื่อมต่อ Google Sheets หรือสำรองข้อมูล</p>
        </div>
      </div>

      {/* Google Sheets Config */}
      <Card title="ตั้งค่าการเชื่อมต่อ Google Sheets" className="border-green-100 bg-green-50/50">
         <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
               <div className="flex-1 w-full">
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                     <Sheet size={16} className="text-green-600"/> Google Apps Script Web App URL
                  </label>
                  <input 
                    type="text" 
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/..../exec"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                     *ต้อง Deploy Script เป็น Web App และตั้งค่า "Who has access" เป็น "Anyone"
                  </p>
               </div>
               <Button onClick={handleSaveUrl} className="bg-green-600 hover:bg-green-700 shadow-green-200">
                  <Save size={18} className="mr-2"/> บันทึก URL
               </Button>
            </div>

            {/* Manual Sync Button */}
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-green-200 shadow-sm mt-2">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CloudUpload size={20}/>
                   </div>
                   <div>
                      <h4 className="font-bold text-slate-700">อัปโหลดข้อมูลปัจจุบันขึ้น Cloud (Force Sync)</h4>
                      <p className="text-xs text-slate-500">ใช้ปุ่มนี้หาก Import JSON มาแล้วข้อมูลไม่ขึ้นบน Google Sheets</p>
                   </div>
                </div>
                <Button 
                   onClick={handleForceSync} 
                   disabled={isSyncing || !scriptUrl} 
                   className="bg-indigo-600 hover:bg-indigo-700"
                >
                   {isSyncing ? <Loader2 className="animate-spin mr-2" size={16}/> : <CloudUpload className="mr-2" size={16}/>}
                   {isSyncing ? "กำลังอัปโหลด..." : "อัปโหลดทันที"}
                </Button>
            </div>
            
            <div className="pt-4 border-t border-green-200">
                <button 
                  onClick={() => setShowCode(!showCode)}
                  className="text-sm font-semibold text-green-700 flex items-center gap-2 hover:text-green-800 transition-colors"
                >
                  <Code size={16}/> 
                  {showCode ? "ซ่อนโค้ด Google Apps Script (Backend)" : "แสดงโค้ด Google Apps Script (สำหรับอัปเดต Backend)"}
                  {showCode ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                
                {showCode && (
                  <div className="mt-3 bg-slate-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-slate-700">
                       <span className="text-xs text-slate-400 font-mono">Code.gs (Updated)</span>
                       <button onClick={handleCopyCode} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                          <Copy size={12}/> Copy Code
                       </button>
                    </div>
                    <pre className="p-4 text-xs text-slate-300 font-mono overflow-x-auto max-h-96 custom-scrollbar">
{`function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000); // Wait 30s
  try {
    var output = {};
    var action = '';
    var data = null;

    if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
      data = e.parameter;
    } else if (e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      action = body.action;
      data = body.data;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheet(ss, 'Partners');
    ensureSheet(ss, 'Projects');
    ensureSheet(ss, 'Transactions');

    if (action === 'getData') {
      output = getAllData(ss);
    } else if (action === 'importData') {
      importAllData(ss, data); // Critical Function
      output = { status: 'success', message: 'Imported successfully' };
    } else if (action === 'addPartner') {
      addPartner(ss, data);
      output = { status: 'success' };
    } 
    // ... (See full code via Copy button) ...
    // ... (This snippet is abbreviated for display) ... 
    
    // Copy the full code using the button above!
    `}
                    </pre>
                  </div>
                )}
            </div>
         </div>
      </Card>

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
            <p className="text-slate-500 text-sm mb-4">กู้คืนข้อมูลจากไฟล์ Backup</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/json" className="hidden" />
            <Button onClick={handleImportClick} variant="secondary" className="w-full">
               <Upload className="mr-2" size={16}/> อัปโหลดไฟล์
            </Button>
        </div>
      </div>
    </div>
  );
};