import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function Card({ children, className = '', title, actions, style }: CardProps) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || actions) && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #ecf0f1'
        }}>
          {title && <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>{title}</h3>}
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}


