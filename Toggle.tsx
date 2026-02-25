import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled = false }) => {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex items-center w-12 h-7 px-0 border-none rounded-full
        transition-colors duration-300 cursor-pointer
        ${checked ? 'bg-blue-500' : 'bg-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}
      `}
    >
      <span className={`
        inline-block w-5 h-5 bg-white rounded-full transform transition-transform duration-300
        ${checked ? 'translate-x-6' : 'translate-x-0.5'}
      `} />
    </button>
  );
};
