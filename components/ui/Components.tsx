import React, { ReactNode } from 'react';

// Card
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = "", title, action, ...props }) => (
  <div className={`game-panel p-4 sm:p-5 ${className}`} {...props}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-4">
        {title && <h3 className="text-base font-bold tracking-tight text-[#2f3a3d]">{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

// Badge
export const Badge: React.FC<{ children: ReactNode; color?: 'blue' | 'indigo' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'; className?: string }> = ({ children, color = 'gray', className = '' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    green: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    red: 'bg-rose-50 text-rose-600 border border-rose-100',
    yellow: 'bg-amber-50 text-amber-600 border border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border border-purple-100',
    gray: 'bg-slate-50 text-slate-600 border border-slate-200',
  };
  return (
    <span className={`px-3 py-1.25 rounded-full text-[11px] font-bold uppercase tracking-wider ${colors[color]} ${className}`}>
      {children}
    </span>
  );
};

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = "", ...props }) => {
  const baseStyle = "pressable inline-flex items-center justify-center rounded-xl border-2 border-[#2f3a3d] font-bold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#88aeb8] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  
  const variants = {
    primary: "bg-[#d96b5f] text-white shadow-[2px_2px_0_#2f3a3d] hover:bg-[#c95f54]",
    secondary: "bg-[#fffdf7] text-[#2f3a3d] shadow-[2px_2px_0_#2f3a3d] hover:bg-[#f4f0e6]",
    danger: "bg-[#c95757] text-white shadow-[2px_2px_0_#2f3a3d] hover:bg-[#b84c4c]",
    ghost: "border-transparent bg-transparent text-[#566164] hover:bg-[#e9e5da]",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = "", ...props }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-sm font-bold text-[#3e484a]">{label}</label>}
    <input
      className={`w-full rounded-xl border-2 border-[#879092] bg-[#fffdf7] px-4 py-3 text-[#2f3a3d] outline-none transition-all placeholder:text-slate-400 focus:border-[#2f3a3d] focus:ring-3 focus:ring-[#88aeb8]/25 ${className}`}
      {...props}
    />
  </div>
);

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string; disabled?: boolean }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = "", ...props }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-sm font-bold text-[#3e484a]">{label}</label>}
    <select
      className={`w-full appearance-none rounded-xl border-2 border-[#879092] bg-[#fffdf7] px-4 py-3 text-[#2f3a3d] outline-none transition-all focus:border-[#2f3a3d] focus:ring-3 focus:ring-[#88aeb8]/25 ${className}`}
      style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
      {...props}
    >
      {options.map((opt, idx) => (
        <option key={opt.value || idx} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
