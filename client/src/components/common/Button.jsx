import React from 'react';
import styles from './Button.module.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled,
  type = 'button',
  className = '',
  ...props
}) => {
  return (
    <button
      className={`btn btn-${variant} ${styles.button} ${styles[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;