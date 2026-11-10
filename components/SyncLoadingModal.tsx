import React, { useState, useEffect } from 'react';
import { Cloud, Loader2, CheckCircle2, FolderKanban, Users, FileText, AlertCircle, ArrowRight } from 'lucide-react';

interface SyncLoadingModalProps {
  isLoading: boolean;
  syncError?: boolean;
  hasCachedData?: boolean;
  onDismiss?: () => void;
}

export const SyncLoadingModal: React.FC<SyncLoadingModalProps> = ({
  isLoading,
  syncError = false,
  hasCachedData = false,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(isLoading);
  const [showSkip, setShowSkip] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setVisible(true);
      setIsSuccess(false);
      timer = setTimeout(() => {
        setShowSkip(true);
      }, 2500);
    } else if (visible && !syncError) {
      // Brief success animation before closing modal
      setIsSuccess(true);
      const closeTimer = setTimeout(() => {
        setVisible(false);
        setIsSuccess(false);
      }, 650);
      return () => clearTimeout(closeTimer);
    } else if (!isLoading && syncError) {
      // Keep visible so user can see sync error and click dismiss
      setShowSkip(true);
    } else {
      setVisible(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading, syncError, visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-[340px] sm:max-w-sm rounded-[20px] border-2 border-[#2f3a3d] bg-[#fffdf7] p-5 sm:p-6 text-center shadow-[6px_6px_0_#2f3a3d] animate-in zoom-in-95 duration-200">
        
        {/* Top badge */}
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#2f3a3d]/20 bg-[#f5efe2] px-3 py-1 text-[11px] font-bold text-[#2f3a3d]">
          <span className={`h-2 w-2 rounded-full ${isSuccess ? 'bg-[#7b9e87]' : syncError ? 'bg-[#d96b5f]' : 'bg-[#e7be69] animate-ping'}`} />
          <span>COINVEST CLOUD SYNC</span>
        </div>

        {/* Central Animated Icon Card */}
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#2f3a3d] bg-[#fdf8ee] shadow-[3px_3px_0_#2f3a3d]">
          {isSuccess ? (
            <CheckCircle2 size={40} className="text-[#7b9e87] animate-in zoom-in duration-200" />
          ) : syncError ? (
            <AlertCircle size={40} className="text-[#d96b5f]" />
          ) : (
            <>
              <Cloud size={36} className="text-[#2f3a3d]" />
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#2f3a3d] bg-[#e7be69]">
                <Loader2 size={16} className="animate-spin text-[#2f3a3d]" />
              </div>
            </>
          )}
        </div>

        {/* Text */}
        <h3 className="text-base sm:text-lg font-bold leading-tight text-[#2f3a3d]">
          {isSuccess
            ? 'โหลดข้อมูลล่าสุดสำเร็จ!'
            : syncError
            ? 'การเชื่อมต่อคลาวด์ขัดข้อง'
            : 'กำลังซิงค์ข้อมูล Google Sheets'}
        </h3>
        <p className="mt-1.5 text-xs font-medium leading-relaxed text-[#687477]">
          {isSuccess
            ? 'ข้อมูลโครงการและรายการบัญชีอัปเดตเรียบร้อยแล้ว'
            : syncError
            ? 'ระบบจะสลับไปใช้ข้อมูลสำรองในเครื่องของคุณแทน'
            : 'กำลังดึงข้อมูลบัญชี โครงการ และผู้ถือหุ้นล่าสุดจากคลาวด์...'}
        </p>

        {/* Animated Progress Bar */}
        {!isSuccess && !syncError && (
          <div className="mt-4 overflow-hidden rounded-full border-2 border-[#2f3a3d] bg-[#eee8da] p-0.5">
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#e7be69] via-[#7b9e87] to-[#88aeb8] animate-pulse" />
          </div>
        )}

        {/* Status items */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-left">
          <div className="flex items-center gap-1.5 rounded-lg border border-[#cfd4cd] bg-[#fffdf7] p-2 text-[10px] font-bold text-[#2f3a3d]">
            <FolderKanban size={13} className="text-[#88aeb8] flex-shrink-0" />
            <span className="truncate">โครงการ</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-[#cfd4cd] bg-[#fffdf7] p-2 text-[10px] font-bold text-[#2f3a3d]">
            <Users size={13} className="text-[#e7be69] flex-shrink-0" />
            <span className="truncate">ผู้ถือหุ้น</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-[#cfd4cd] bg-[#fffdf7] p-2 text-[10px] font-bold text-[#2f3a3d]">
            <FileText size={13} className="text-[#7b9e87] flex-shrink-0" />
            <span className="truncate">บัญชี</span>
          </div>
        </div>

        {/* Dismiss / Skip button */}
        {((showSkip && hasCachedData) || syncError) && (
          <button
            onClick={() => {
              setVisible(false);
              if (onDismiss) onDismiss();
            }}
            className="pressable mt-5 inline-flex items-center gap-1.5 rounded-xl border-2 border-[#2f3a3d] bg-[#eee8da] px-4 py-2 text-xs font-bold text-[#2f3a3d] hover:bg-[#e2dacf] shadow-[2px_2px_0_#2f3a3d]"
          >
            <span>{syncError ? 'เข้าสู่แอพ (ใช้ข้อมูลในเครื่อง)' : 'ดูข้อมูลในเครื่องก่อน'}</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
