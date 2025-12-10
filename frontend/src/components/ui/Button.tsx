import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
  as?: React.ElementType;
  to?: string;
  href?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  as: Component = 'button',
  to,
  href,
  ...props
}: ButtonProps) {
  const baseClasses = 'btn';
  const variantClasses: { [key: string]: string } = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    danger: 'btn-danger',
    warning: 'btn-warning',
    info: 'btn-primary',
  };
  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();
  
  // If using as Link or anchor, extract button-specific props that don't apply
  if (Component !== 'button') {
    // Remove button-specific props that shouldn't be passed to Link/anchor
    const { type, disabled: _, ...restProps } = props as any;
    return (
      <Component
        className={classes}
        to={to}
        href={href}
        style={{ 
          ...(props.style || {}),
          ...(disabled && { opacity: 0.6, cursor: 'not-allowed', pointerEvents: 'none' })
        }}
        {...restProps}
      >
        {isLoading ? (
          <>
            <span className="spinner" style={{ width: '16px', height: '16px', margin: 0, marginRight: '8px' }} />
            Loading...
          </>
        ) : (
          children
        )}
      </Component>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      type={props.type || 'button'}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="spinner" style={{ width: '16px', height: '16px', margin: 0, marginRight: '8px' }} />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}

