import { useSocket } from '../context/SocketContext';

export const useSocket = () => {
  const context = useSocket();
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};