import React, { ReactNode } from 'react';

// Card
export const Card: React.FC<{ children: ReactNode; className?: string; title?: string; action?: ReactNode }> = ({ children, className = "", title, action }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 ${className}`}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-4">
        {title && <h3 className="text-lg font-bold text-slate-700">{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

// Badge
export const Badge: React.FC<{ children: ReactNode; color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' }> = ({ children, color = 'gray' }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-rose-100 text-rose-700',
    yellow: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    gray: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
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
  const baseStyle = "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-200 focus:ring-indigo-500",
    secondary: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 focus:ring-slate-400",
    danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-200 focus:ring-rose-500",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
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
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-medium text-slate-600">{label}</label>}
    <input
      className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-slate-800 placeholder-slate-400 ${className}`}
      {...props}
    />
  </div>
);

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = "", ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-medium text-slate-600">{label}</label>}
    <select
      className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-slate-800 ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);