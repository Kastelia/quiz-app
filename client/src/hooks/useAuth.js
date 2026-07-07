import { useAuth } from '../context/AuthContext';

export const useAuth = () => {
  const context = useAuth();
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};