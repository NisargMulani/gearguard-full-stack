import React from 'react';

const Button = React.forwardRef(({ 
  children, 
  variant = 'primary',
  type = 'button',
  onClick,
  disabled = false,
  isLoading = false,
  className = '',
  ...props 
}, ref) => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25',
    borderRadius: '0.375rem',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    opacity: disabled || isLoading ? 0.7 : 1,
    pointerEvents: disabled || isLoading ? 'none' : 'auto',
  };

  const variantStyles = {
    primary: {
      backgroundColor: '#3b82f6',
      color: 'white',
      '&:hover:not(:disabled)': {
        backgroundColor: '#2563eb',
      },
    },
    secondary: {
      backgroundColor: '#e5e7eb',
      color: '#1f2937',
      '&:hover:not(:disabled)': {
        backgroundColor: '#d1d5db',
      },
    },
    danger: {
      backgroundColor: '#ef4444',
      color: 'white',
      '&:hover:not(:disabled)': {
        backgroundColor: '#dc2626',
      },
    },
  };

  const selectedVariant = variantStyles[variant] || variantStyles.primary;

  return (
    <button
      type={type}
      ref={ref}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`btn ${variant} ${className}`}
      style={{
        ...baseStyles,
        ...selectedVariant,
        '&:hover:not(:disabled)': undefined, // Remove the hover style object
      }}
      {...props}
    >
      {isLoading ? (
        <>
          <span style={{ marginRight: '0.5rem' }}>Loading...</span>
          <span className="spinner" style={{
            width: '1rem',
            height: '1rem',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
