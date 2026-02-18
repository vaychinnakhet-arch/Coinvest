import React, { useRef, useState, useEffect } from 'react';
import { AppState, Partner } from '../types';
import { Card, Button, Input } from './ui/Components';
import { Upload, Download, Database, FileJson, CheckCircle2, Users, Plus, Trash2, Save, Sheet, Code, Copy, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
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
        } catch (error: any) {
            console.error(error);
            alert("❌ เกิดข้อผิดพลาด: " + (error.message || error));
        } finally {
            setIsSyncing(false);
        }
    }
  };

  const handleCopyCode = () => {
    const code = `
function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var output = {};
    var action = '';
    var data = null;

    if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
      if (e.parameter.data) data = JSON.parse(e.parameter.data);
    } else if (e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      action = body.action;
      data = body.data;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Ensure Sheets Exist and Headers
    ['Partners', 'Projects', 'Transactions'].forEach(function(name) {
       var s = ss.getSheetByName(name);
       if (!s) {
         s = ss.insertSheet(name);
         if (name === 'Partners') s.appendRow(['id', 'name', 'avatar', 'color']);
         if (name === 'Projects') s.appendRow(['id', 'name', 'description', 'status', 'startDate']);
         if (name === 'Transactions') s.appendRow(['id', 'projectId', 'partnerId', 'type', 'amount', 'date', 'note', 'receiptImage']);
       }
    });

    if (action === 'getData') {
       output = {
         partners: getSheetData(ss.getSheetByName('Partners')),
         projects: getSheetData(ss.getSheetByName('Projects')),
         transactions: getSheetData(ss.getSheetByName('Transactions'))
       };
    } else if (action === 'importData') {
       // CLEAR ALL DATA
       var sP = ss.getSheetByName('Partners'); sP.clearContents(); sP.appendRow(['id', 'name', 'avatar', 'color']);
       var sPr = ss.getSheetByName('Projects'); sPr.clearContents(); sPr.appendRow(['id', 'name', 'description', 'status', 'startDate']);
       var sTx = ss.getSheetByName('Transactions'); sTx.clearContents(); sTx.appendRow(['id', 'projectId', 'partnerId', 'type', 'amount', 'date', 'note', 'receiptImage']);
       
       // INSERT NEW DATA
       if (data.partners && data.partners.length) {
         var rows = data.partners.map(p => [p.id, p.name, p.avatar, p.color]);
         sP.getRange(2, 1, rows.length, 4).setValues(rows);
       }
       if (data.projects && data.projects.length) {
         var rows = data.projects.map(p => [p.id, p.name, p.description, p.status, p.startDate]);
         sPr.getRange(2, 1, rows.length, 5).setValues(rows);
       }
       if (data.transactions && data.transactions.length) {
         var rows = data.transactions.map(t => [t.id, t.projectId, t.partnerId || '', t.type, t.amount, t.date, t.note || '', t.receiptImage || '']);
         sTx.getRange(2, 1, rows.length, 8).setValues(rows);
       }
       output = { status: 'success' };
    } 
    else if (action === 'addTransaction') {
       var s = ss.getSheetByName('Transactions');
       s.appendRow([data.id, data.projectId, data.partnerId || '', data.type, data.amount, data.date, data.note || '', data.receiptImage || '']);
       output = { status: 'success' };
    }
    else if (action === 'addProject') {
       var s = ss.getSheetByName('Projects');
       s.appendRow([data.id, data.name, data.description || '', data.status, data.startDate]);
       output = { status: 'success' };
    }
    else if (action === 'addPartner') {
       var s = ss.getSheetByName('Partners');
       s.appendRow([data.id, data.name, data.avatar, data.color]);
       output = { status: 'success' };
    }
    else if (action === 'updateTransaction') {
       var s = ss.getSheetByName('Transactions');
       var values = s.getDataRange().getValues();
       output = { status: 'not_found' };
       // Start from 1 to skip header
       for (var i = 1; i < values.length; i++) {
         if (String(values[i][0]) === String(data.id)) {
           // Update Row (1-indexed, so i+1)
           s.getRange(i + 1, 1, 1, 8).setValues([[
             data.id, 
             data.projectId, 
             data.partnerId || '', 
             data.type, 
             data.amount, 
             data.date, 
             data.note || '',
             data.receiptImage || ''
           ]]);
           output = { status: 'success' };
           break;
         }
       }
    }
    else if (action === 'deleteTransaction') {
       var s = ss.getSheetByName('Transactions');
       var values = s.getDataRange().getValues();
       output = { status: 'not_found' };
       for (var i = 1; i < values.length; i++) {
         if (String(values[i][0]) === String(data.id)) {
           s.deleteRow(i + 1);
           output = { status: 'success' };
           break;
         }
       }
    }
    else if (action === 'deletePartner') {
        var s = ss.getSheetByName('Partners');
        var values = s.getDataRange().getValues();
        for (var i = 1; i < values.length; i++) {
            if (String(values[i][0]) === String(data.id)) {
                s.deleteRow(i + 1);
                output = { status: 'success' };
                break;
            }
        }
    }
    else {
        output = { status: 'unknown_action' };
    }

    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getSheetData(sheet) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}`;
    navigator.clipboard.writeText(code);
    alert("✅ คัดลอกโค้ดใหม่แล้ว (รองรับรูปภาพ)!\n\nกรุณานำไปวางทับใน Google Apps Script Editor แล้วกด 'Deploy' -> 'New deployment' เพื่ออัปเดตระบบ Backend");
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
    setNewPartnerAvatar(emojiPalette[Math.floor(Math.random() * emojiPalette.length)]);
    setNewPartnerColor(colorPalette[Math.floor(Math.random() * colorPalette.length)]);
  };

  const handleExport = () => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `CoInvest_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files.length > 0) {
        fileReader.readAsText(e.target.files[0], "UTF-8");
        fileReader.onload = (event) => {
            try {
                if (event.target?.result) {
                    const parsedData = JSON.parse(event.target.result as string);
                    if (parsedData.partners && parsedData.projects && parsedData.transactions) {
                        onImport(parsedData);
                        setImportStatus('success');
                        setTimeout(() => setImportStatus('idle'), 3000);
                    } else {
                        throw new Error("Invalid structure");
                    }
                }
            } catch (err) {
                console.error(err);
                setImportStatus('error');
                alert("ไฟล์ไม่ถูกต้อง");
            }
        };
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Cloud Sync Config */}
      <Card title="ตั้งค่าการเชื่อมต่อ (Cloud Sync)" className="border-indigo-100 bg-indigo-50/30">
         <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
               <Input 
                 label="Google Apps Script URL" 
                 value={scriptUrl} 
                 onChange={e => setScriptUrl(e.target.value)} 
                 placeholder="https://script.google.com/macros/s/.../exec"
                 className="font-mono text-xs"
               />
               <div className="flex gap-2">
                 <Button onClick={handleSaveUrl} className="whitespace-nowrap">
                   <Save size={16} className="mr-1"/> บันทึก URL
                 </Button>
                 {scriptUrl && (
                   <Button onClick={handleForceSync} disabled={isSyncing} variant="secondary" className="whitespace-nowrap">
                     {isSyncing ? <Loader2 size={16} className="animate-spin mr-1"/> : <Database size={16} className="mr-1"/>}
                     Force Upload
                   </Button>
                 )}
               </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div 
                   className="flex justify-between items-center cursor-pointer" 
                   onClick={() => setShowCode(!showCode)}
                >
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Sheet size={20} className="text-green-600"/>
                    <span>วิธีการติดตั้ง Google Sheets API (Update Script)</span>
                  </div>
                  {showCode ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                </div>
                
                {showCode && (
                  <div className="mt-4 animate-in slide-in-from-top-2">
                    <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-lg mb-4 border border-amber-200">
                        <strong>⚠️ สำคัญ:</strong> หากคุณพบปัญหา "ข้อมูลไม่ครบ" หรือ "แก้ไขแล้วไม่จำ" กรุณา Copy โค้ดด้านล่างไปวางทับใน Apps Script Editor แล้ว Deploy ใหม่อีกครั้ง
                    </div>
                    <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2 mb-4 ml-2">
                      <li>สร้าง Google Sheet ใหม่</li>
                      <li>ไปที่ <strong>Extensions {'>'} Apps Script</strong></li>
                      <li>ลบโค้ดเก่าออก แล้ววางโค้ดด้านล่างลงไป (กด Copy)</li>
                      <li>กด <strong>Deploy {'>'} New deployment</strong></li>
                      <li>เลือก type เป็น <strong>Web app</strong></li>
                      <li>ตั้งค่า <strong>Who has access</strong> เป็น <strong>Anyone</strong> (สำคัญ!)</li>
                      <li>กด Deploy แล้วนำ URL มาวางในช่องด้านบน</li>
                    </ol>
                    <div className="relative">
                      <button 
                        onClick={handleCopyCode}
                        className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white text-slate-500 rounded-lg shadow-sm border border-slate-200 transition-all"
                        title="Copy Code"
                      >
                        <Copy size={16}/>
                      </button>
                      <pre className="bg-slate-800 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto custom-scrollbar h-64">
{`// Updated for Receipt Images
function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var output = {};
    var action = '';
    var data = null;

    if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
      if (e.parameter.data) data = JSON.parse(e.parameter.data);
    } else if (e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      action = body.action;
      data = body.data;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Ensure Sheets Exist
    ['Partners', 'Projects', 'Transactions'].forEach(function(name) {
       var s = ss.getSheetByName(name);
       if (!s) {
         s = ss.insertSheet(name);
         if (name === 'Partners') s.appendRow(['id', 'name', 'avatar', 'color']);
         if (name === 'Projects') s.appendRow(['id', 'name', 'description', 'status', 'startDate']);
         // Added receiptImage column
         if (name === 'Transactions') s.appendRow(['id', 'projectId', 'partnerId', 'type', 'amount', 'date', 'note', 'receiptImage']);
       }
    });

    if (action === 'getData') {
       output = {
         partners: getSheetData(ss.getSheetByName('Partners')),
         projects: getSheetData(ss.getSheetByName('Projects')),
         transactions: getSheetData(ss.getSheetByName('Transactions'))
       };
    } else if (action === 'importData') {
       // CLEAR ALL DATA
       var sP = ss.getSheetByName('Partners'); sP.clearContents(); sP.appendRow(['id', 'name', 'avatar', 'color']);
       var sPr = ss.getSheetByName('Projects'); sPr.clearContents(); sPr.appendRow(['id', 'name', 'description', 'status', 'startDate']);
       var sTx = ss.getSheetByName('Transactions'); sTx.clearContents(); sTx.appendRow(['id', 'projectId', 'partnerId', 'type', 'amount', 'date', 'note', 'receiptImage']);
       
       // INSERT NEW DATA
       if (data.partners && data.partners.length) {
         var rows = data.partners.map(p => [p.id, p.name, p.avatar, p.color]);
         sP.getRange(2, 1, rows.length, 4).setValues(rows);
       }
       if (data.projects && data.projects.length) {
         var rows = data.projects.map(p => [p.id, p.name, p.description, p.status, p.startDate]);
         sPr.getRange(2, 1, rows.length, 5).setValues(rows);
       }
       if (data.transactions && data.transactions.length) {
         var rows = data.transactions.map(t => [t.id, t.projectId, t.partnerId || '', t.type, t.amount, t.date, t.note || '', t.receiptImage || '']);
         sTx.getRange(2, 1, rows.length, 8).setValues(rows);
       }
       output = { status: 'success' };
    } 
    else if (action === 'addTransaction') {
       var s = ss.getSheetByName('Transactions');
       s.appendRow([data.id, data.projectId, data.partnerId || '', data.type, data.amount, data.date, data.note || '', data.receiptImage || '']);
       output = { status: 'success' };
    }
    else if (action === 'updateTransaction') {
       var s = ss.getSheetByName('Transactions');
       var values = s.getDataRange().getValues();
       output = { status: 'not_found' };
       for (var i = 1; i < values.length; i++) {
         if (String(values[i][0]) === String(data.id)) {
           // Update Row (1-indexed) including image
           s.getRange(i + 1, 1, 1, 8).setValues([[
             data.id, 
             data.projectId, 
             data.partnerId || '', 
             data.type, 
             data.amount, 
             data.date, 
             data.note || '',
             data.receiptImage || ''
           ]]);
           output = { status: 'success' };
           break;
         }
       }
    }
    else if (action === 'deleteTransaction') {
       var s = ss.getSheetByName('Transactions');
       var values = s.getDataRange().getValues();
       output = { status: 'not_found' };
       for (var i = 1; i < values.length; i++) {
         if (String(values[i][0]) === String(data.id)) {
           s.deleteRow(i + 1);
           output = { status: 'success' };
           break;
         }
       }
    }
    else if (action === 'addProject') {
       var s = ss.getSheetByName('Projects');
       s.appendRow([data.id, data.name, data.description || '', data.status, data.startDate]);
       output = { status: 'success' };
    }
    else if (action === 'addPartner') {
       var s = ss.getSheetByName('Partners');
       s.appendRow([data.id, data.name, data.avatar, data.color]);
       output = { status: 'success' };
    }
    else if (action === 'deletePartner') {
        var s = ss.getSheetByName('Partners');
        var values = s.getDataRange().getValues();
        for (var i = 1; i < values.length; i++) {
            if (String(values[i][0]) === String(data.id)) {
                s.deleteRow(i + 1);
                output = { status: 'success' };
                break;
            }
        }
    }
    else {
        output = { status: 'unknown_action' };
    }

    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getSheetData(sheet) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}`}
                      </pre>
                    </div>
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