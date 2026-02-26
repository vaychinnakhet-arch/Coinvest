import React, { ReactNode } from 'react';

// Card
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = "", title, action, ...props }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 ${className}`} {...props}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-4">
        {title && <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

// Badge
export const Badge: React.FC<{ children: ReactNode; color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' }> = ({ children, color = 'gray' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    red: 'bg-rose-50 text-rose-600 border border-rose-100',
    yellow: 'bg-amber-50 text-amber-600 border border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border border-purple-100',
    gray: 'bg-slate-50 text-slate-600 border border-slate-200',
  };
  return (
    <span className={`px-3 py-1.25 rounded-full text-[11px] font-bold uppercase tracking-wider ${colors[color]}`}>
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
  const baseStyle = "inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200/50 focus:ring-indigo-500",
    secondary: "bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 focus:ring-slate-400 shadow-sm",
    danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-200/50 focus:ring-rose-500",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
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
    {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
    <input
      className={`w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-800 placeholder-slate-400 ${className}`}
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
    {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
    <select
      className={`w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-800 appearance-none ${className}`}
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