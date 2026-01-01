import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: React.ReactNode
}

export default function Select({ label, error, className = '', children, ...props }: SelectProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:ring-blue-500 focus:border-blue-500
          dark:bg-gray-700 dark:border-gray-600 dark:text-white
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

