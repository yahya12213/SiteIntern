import React from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  description?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, description }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        {/* Color preview box */}
        <div
          className="w-12 h-10 rounded-lg border-2 border-gray-300 shadow-sm"
          style={{ backgroundColor: value }}
          title={value}
        />

        {/* Color input */}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 h-10 rounded-lg border border-gray-300 cursor-pointer"
        />

        {/* Hex value display */}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const hex = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
              onChange(hex);
            }
          }}
          placeholder="#FFFFFF"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={7}
        />
      </div>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  );
};
