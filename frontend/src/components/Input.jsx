import React from 'react';

const Input = React.forwardRef(({ 
  type = 'text', 
  placeholder = '', 
  value, 
  onChange, 
  className = '', 
  required = false,
  ...props 
}, ref) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      ref={ref}
      className={`form-control ${className}`}
      style={{
        width: '100%',
        padding: '0.5rem 0.75rem',
        fontSize: '0.875rem',
        lineHeight: '1.25',
        color: '#1f2937',
        backgroundColor: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: '0.375rem',
        transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
      }}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
