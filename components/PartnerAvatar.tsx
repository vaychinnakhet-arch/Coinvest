import React from 'react';
import { getCartoonAvatar } from '../services/avatarLibrary';

export interface PartnerAvatarProps {
  avatar: string;
  name?: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  onClick?: () => void;
  showHoverHint?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-xl',
  xl: 'w-14 h-14 text-2xl',
  '2xl': 'w-20 h-20 text-3xl',
};

export const PartnerAvatar: React.FC<PartnerAvatarProps> = ({
  avatar,
  name,
  color,
  size = 'md',
  className = '',
  onClick,
  showHoverHint = false,
}) => {
  const cartoon = getCartoonAvatar(avatar);
  const isUrl = avatar && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:'));

  const baseContainer = `relative flex items-center justify-center shrink-0 rounded-2xl transition-all duration-200 select-none ${sizeClasses[size]} ${className}`;
  const clickableClasses = onClick ? 'cursor-pointer hover:scale-105 hover:shadow-md active:scale-95' : '';

  return (
    <div
      onClick={onClick}
      className={`${baseContainer} ${clickableClasses}`}
      style={{ backgroundColor: color ? `${color}18` : '#F1F5F9' }}
      title={onClick ? `คลิกเพื่อเปลี่ยนไอคอนการ์ตูน ${name ? `ของ ${name}` : ''}` : name}
    >
      {cartoon ? (
        <div className="w-full h-full p-0.5 flex items-center justify-center">
          {cartoon.render({ className: "w-full h-full object-contain filter drop-shadow-sm" })}
        </div>
      ) : isUrl ? (
        <img
          src={avatar}
          alt={name || 'Avatar'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-2xl"
          onError={(e) => {
            // Fallback to initial if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <span className="font-bold">{avatar || (name ? name.charAt(0) : '?')}</span>
      )}

      {/* Optional edit badge on hover if clickable */}
      {onClick && showHoverHint && (
        <div className="absolute -bottom-1 -right-1 bg-white border border-slate-200 rounded-full p-1 shadow-sm opacity-0 hover:opacity-100 transition-opacity">
          <span className="text-[10px]">✏️</span>
        </div>
      )}
    </div>
  );
};
