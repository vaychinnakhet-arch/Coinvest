import React, { useState } from 'react';
import { X, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
import { CARTOON_AVATARS, CartoonAvatar } from '../services/avatarLibrary';
import { PartnerAvatar } from './PartnerAvatar';
import { Partner } from '../types';

interface AvatarPickerModalProps {
  partner: Partner;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newAvatar: string) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  partner,
  isOpen,
  onClose,
  onSave,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState(partner.avatar || 'businessman');
  const [activeCategory, setActiveCategory] = useState<'all' | 'professional' | 'characters' | 'animals'>('all');
  const [customUrl, setCustomUrl] = useState(
    partner.avatar.startsWith('http') ? partner.avatar : ''
  );
  const [showUrlInput, setShowUrlInput] = useState(false);

  if (!isOpen) return null;

  const filteredAvatars = activeCategory === 'all'
    ? CARTOON_AVATARS
    : CARTOON_AVATARS.filter(a => a.category === activeCategory);

  const handleSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    setCustomUrl('');
  };

  const handleApplyUrl = () => {
    if (customUrl.trim()) {
      setSelectedAvatar(customUrl.trim());
    }
  };

  const handleConfirm = () => {
    const finalAvatar = customUrl.trim() || selectedAvatar;
    onSave(finalAvatar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#fffdf7] border-2 border-[#2f3a3d] w-full max-w-xl rounded-2xl shadow-[6px_6px_0_#2f3a3d] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b-2 border-[#2f3a3d] flex items-center justify-between bg-[#f5efe2]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">เลือกไอคอนการ์ตูน</h3>
              <p className="text-xs text-slate-600">
                สำหรับ <strong className="text-indigo-700">{partner.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-4">
          <div className="relative">
            <PartnerAvatar
              avatar={customUrl.trim() || selectedAvatar}
              name={partner.name}
              color={partner.color}
              size="2xl"
              className="border-2 border-[#2f3a3d] shadow-[2px_2px_0_#2f3a3d]"
            />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">ตัวอย่างการแสดงผล</p>
            <h4 className="text-base font-bold text-slate-800">{partner.name}</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกเลือกตัวการ์ตูนด้านล่างที่ต้องการ แล้วกดปุ่ม &quot;บันทึกไอคอน&quot;
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 p-3 bg-[#fbf8f1] border-b border-slate-200 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: 'ทั้งหมด (All)' },
            { id: 'professional', label: '👔 อาชีพ & ทำงาน' },
            { id: 'characters', label: '⚡ ฮีโร่ & แฟนตาซี' },
            { id: 'animals', label: '🐾 สัตว์นำโชค' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors border ${
                activeCategory === tab.id
                  ? 'bg-[#2f3a3d] text-white border-[#2f3a3d]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors border flex items-center gap-1 ${
              showUrlInput
                ? 'bg-indigo-600 text-white border-indigo-700'
                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            <ImageIcon size={14} /> ใส่ URL ภาพ
          </button>
        </div>

        {/* Custom URL Input Accordion */}
        {showUrlInput && (
          <div className="p-3 bg-indigo-50/70 border-b border-indigo-100 flex gap-2 animate-in slide-in-from-top-2 duration-150">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="วาง URL รูปภาพการ์ตูนภายนอก (https://...)"
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
            />
            <button
              onClick={handleApplyUrl}
              className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap"
            >
              ใช้ภาพนี้
            </button>
          </div>
        )}

        {/* Cartoon Grid */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {filteredAvatars.map((item) => {
            const isSelected = selectedAvatar === item.id || (!customUrl && item.emojiMatch.includes(selectedAvatar));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-150 text-center ${
                  isSelected
                    ? 'border-[#2f3a3d] bg-amber-100/60 shadow-[3px_3px_0_#2f3a3d] scale-[1.03]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="w-14 h-14 mb-2 flex items-center justify-center">
                  {item.render({ className: "w-full h-full object-contain filter drop-shadow-sm" })}
                </div>
                <span className="text-[11px] font-bold text-slate-700 line-clamp-1 leading-tight">
                  {item.name}
                </span>

                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#2f3a3d] text-white flex items-center justify-center text-[10px] shadow-sm">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t-2 border-[#2f3a3d] bg-[#f5efe2] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 text-sm font-bold bg-[#2f3a3d] text-white rounded-xl shadow-[2px_2px_0_#1a2022] hover:bg-[#1f2729] active:translate-y-0.5 transition-all flex items-center gap-2"
          >
            <Check size={16} strokeWidth={2.5} /> บันทึกไอคอน
          </button>
        </div>

      </div>
    </div>
  );
};
