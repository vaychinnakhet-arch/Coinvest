import React, { useRef, useState, useEffect } from 'react';
import { AppState, Partner } from '../types';
import { Card, Button, Input } from './ui/Components';
import { Upload, Download, Database, FileJson, CheckCircle2, Users, Plus, Trash2, Save, Sheet, Code, Copy, ChevronDown, ChevronUp, Loader2, RotateCcw } from 'lucide-react';
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

  const handleResetUrl = () => {
    if(confirm("ต้องการรีเซ็ต URL เป็นค่าเริ่มต้นของระบบใช่หรือไม่?")) {
        googleSheetsService.resetUrl();
        alert("รีเซ็ตเรียบร้อย กด OK เพื่อรีโหลด");
        window.location.reload();
    }
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
    
    // Ensure Sheets Exist and Headers (Auto-Fix Missing Columns)
    ['Partners', 'Projects', 'Transactions'].forEach(function(name) {
       var s = ss.getSheetByName(name);
       if (!s) {
         s = ss.insertSheet(name);
         if (name === 'Partners') s.appendRow(['id', 'name', 'avatar', 'color']);
         if (name === 'Projects') s.appendRow(['id', 'name', 'description', 'status', 'startDate']);
         if (name === 'Transactions') s.appendRow(['id', 'projectId', 'partnerId', 'type', 'amount', 'date', 'note', 'receiptImage']);
       } else {
         // Auto-fix: Check if 'receiptImage' header exists for Transactions
         if (name === 'Transactions') {
           var lastCol = s.getLastColumn();
           if (lastCol > 0) {
             var headers = s.getRange(1, 1, 1, lastCol).getValues()[0];
             var hasImg = false;
             for(var i=0; i<headers.length; i++) {
               if(headers[i] === 'receiptImage') { hasImg = true; break; }
             }
             // If missing, add it to the next column
             if (!hasImg) {
               s.getRange(1, lastCol + 1).setValue('receiptImage');
             }
           } else {
              // Sheet exists but empty
              s.appendRow(['id', 'projectId', 'partnerId', 'type', 'amount', 'date', 'note', 'receiptImage']);
           }
         }
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
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

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
    alert("✅ คัดลอกโค้ดใหม่แล้ว (เพิ่มระบบแก้หัวตารางอัตโนมัติ)!\n\nกรุณานำไปวางทับใน Apps Script Editor แล้ว Deploy ใหม่อีกครั้งเพื่อแก้ปัญหาภาพหาย");
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
      <Card title="ตั้งค่าการเชื่อมต่อ (Cloud Sync)" className="border-indigo-100 bg-indigo-50/30 shadow-sm !p-6 md:!p-8">
         <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
               <div className="w-full">
                 <Input 
                   label="Google Apps Script URL" 
                   value={scriptUrl} 
                   onChange={e => setScriptUrl(e.target.value)} 
                   placeholder="https://script.google.com/macros/s/.../exec"
                   className="font-mono text-xs md:text-sm"
                 />
               </div>
               <div className="flex gap-3 w-full md:w-auto">
                 <Button onClick={handleSaveUrl} className="whitespace-nowrap flex-1 md:flex-none shadow-indigo-200/50">
                   <Save size={18} className="mr-2"/> บันทึก URL
                 </Button>
                 <Button onClick={handleResetUrl} variant="ghost" className="whitespace-nowrap text-slate-500 hover:text-rose-500 hover:bg-rose-50" title="รีเซ็ตเป็นค่าเริ่มต้น">
                   <RotateCcw size={18} className="mr-2"/> รีเซ็ต
                 </Button>
                 {scriptUrl && (
                   <Button onClick={handleForceSync} disabled={isSyncing} variant="secondary" className="whitespace-nowrap flex-1 md:flex-none">
                     {isSyncing ? <Loader2 size={18} className="animate-spin mr-2"/> : <Database size={18} className="mr-2"/>}
                     Force Upload
                   </Button>
                 )}
               </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300">
                <div 
                   className="flex justify-between items-center cursor-pointer group" 
                   onClick={() => setShowCode(!showCode)}
                >
                  <div className="flex items-center gap-3 text-slate-700 font-bold">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                      <Sheet size={20}/>
                    </div>
                    <span>วิธีการติดตั้ง Google Sheets API (Update Script)</span>
                  </div>
                  <div className="p-2 rounded-full hover:bg-slate-50 transition-colors">
                    {showCode ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                  </div>
                </div>
                
                {showCode && (
                  <div className="mt-4 animate-in slide-in-from-top-2">
                    <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-lg mb-4 border border-amber-200">
                        <strong>⚠️ สำคัญ:</strong> หากคุณพบปัญหา "ข้อมูลไม่ครบ" หรือ "แก้ไขแล้วไม่จำ" หรือ "ภาพหาย" กรุณา Copy โค้ดด้านล่างไปวางทับใน Apps Script Editor แล้ว Deploy ใหม่อีกครั้ง ระบบจะแก้ตารางให้โดยอัตโนมัติ
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
{`// Updated for Receipt Images & Auto-Fix Columns
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
    
    // Ensure Sheets Exist and Headers (Auto-Fix Missing Columns)
    ['Partners', 'Projects', 'Transactions'].forEach(function(name) {
       var s = ss.getSheetByName(name);
       if (!s) {
         s = ss.insertSheet(name);
         if (name === 'Partners') s.appendRow(['id', 'name', 'avatar', 'color']);
         if (name === 'Projects') s.appendRow(['id', 'name', 'description', 'status', 'startDate']);
         if (name === 'Transactions') s.appendRow(['id', 'projectId', 'partnerId', 'type', 'amount', 'date', 'note', 'receiptImage']);
       } else {
         // Auto-fix: Check if 'receiptImage' header exists for Transactions
         if (name === 'Transactions') {
           var lastCol = s.getLastColumn();
           if (lastCol > 0) {
             var headers = s.getRange(1, 1, 1, lastCol).getValues()[0];
             var hasImg = false;
             for(var i=0; i<headers.length; i++) {
               if(headers[i] === 'receiptImage') { hasImg = true; break; }
             }
             // If missing, add it to the next column
             if (!hasImg) {
               s.getRange(1, lastCol + 1).setValue('receiptImage');
             }
           } else {
              // Sheet exists but empty
              s.appendRow(['id', 'projectId', 'partnerId', 'type', 'amount', 'date', 'note', 'receiptImage']);
           }
         }
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
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

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
      <Card title="จัดการรายชื่อหุ้นส่วน (Partner Management)" className="border-slate-100 shadow-sm !p-6 md:!p-8">
         <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
            {/* Form */}
            <div className="w-full md:w-1/3 space-y-6">
               <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg tracking-tight">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Plus size={18}/></div> เพิ่มหุ้นส่วนใหม่
               </h4>
               <form onSubmit={handleCreatePartner} className="space-y-5 p-5 bg-slate-50/50 rounded-3xl border border-slate-100">
                  <Input 
                    label="ชื่อหุ้นส่วน" 
                    value={newPartnerName} 
                    onChange={e => setNewPartnerName(e.target.value)} 
                    placeholder="เช่น คุณสมชาย" 
                    required
                  />
                  
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 block">เลือก Avatar</label>
                    <div className="flex gap-2 flex-wrap">
                       {emojiPalette.map(emoji => (
                         <button 
                           key={emoji}
                           type="button"
                           onClick={() => setNewPartnerAvatar(emoji)}
                           className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all duration-200 ${newPartnerAvatar === emoji ? 'bg-white shadow-md shadow-slate-200/50 scale-110 ring-2 ring-indigo-500 ring-offset-1' : 'bg-white border border-slate-200 hover:bg-slate-50 hover:scale-105'}`}
                         >
                           {emoji}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 block">เลือกสีประจำตัว</label>
                    <div className="flex gap-2.5 flex-wrap">
                       {colorPalette.map(color => (
                         <button 
                           key={color}
                           type="button"
                           onClick={() => setNewPartnerColor(color)}
                           className={`w-8 h-8 rounded-full transition-all duration-200 border-2 ${newPartnerColor === color ? 'border-white shadow-[0_0_0_2px_rgba(99,102,241,1)] scale-110' : 'border-transparent hover:scale-110 shadow-sm'}`}
                           style={{ backgroundColor: color }}
                         />
                       ))}
                    </div>
                  </div>

                  <Button type="submit" className="w-full mt-2 py-3">เพิ่มหุ้นส่วน</Button>
               </form>
            </div>

            {/* List */}
            <div className="w-full md:w-2/3">
               <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-6 text-lg tracking-tight">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={18}/></div> รายชื่อหุ้นส่วนปัจจุบัน ({data.partners.length})
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.partners.map(p => (
                    <div key={p.id} className="flex flex-col p-4 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => {
                             if(confirm(`ยืนยันการลบหุ้นส่วน "${p.name}"?`)) onDeletePartner(p.id);
                           }}
                           className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                           title="ลบหุ้นส่วน"
                         >
                           <Trash2 size={16}/>
                         </button>
                       </div>
                       <div className="flex items-center gap-4 mb-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ring-1 ring-black/5" style={{ backgroundColor: p.color + '15' }}>
                             {p.avatar}
                          </div>
                          <div>
                             <p className="font-bold text-slate-800 text-base">{p.name}</p>
                             <div className="w-8 h-1.5 rounded-full mt-1.5 opacity-80" style={{ backgroundColor: p.color }}></div>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Export Section */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-md transition-all duration-300">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              <Download size={28} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Export JSON</h3>
            <p className="text-slate-500 text-sm mb-6">สำรองข้อมูลเก็บไว้ในเครื่อง</p>
            <Button onClick={handleExport} variant="secondary" className="w-full py-3">
               <FileJson className="mr-2" size={18}/> ดาวน์โหลดไฟล์
            </Button>
        </div>

        {/* Import Section */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-md transition-all duration-300">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 ${importStatus === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
              {importStatus === 'success' ? <CheckCircle2 size={28}/> : <Upload size={28} />}
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Import JSON</h3>
            <p className="text-slate-500 text-sm mb-6">กู้คืนข้อมูลจากไฟล์ Backup</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/json" className="hidden" />
            <Button onClick={handleImportClick} variant="secondary" className="w-full py-3">
               <Upload className="mr-2" size={18}/> อัปโหลดไฟล์
            </Button>
        </div>
      </div>
    </div>
  );
};