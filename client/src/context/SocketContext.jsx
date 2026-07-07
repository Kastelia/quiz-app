import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (user && !socketRef.current) {
      console.log('🔄 Creating socket for user:', user.id);

      const newSocket = io('http://localhost:3000', {
        query: { userId: user.id },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        forceNew: false,
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);

        if (reason === 'io server disconnect' || reason === 'transport close') {
          setTimeout(() => {
            if (user && socketRef.current) {
              socketRef.current.connect();
            }
          }, 2000);
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        setIsConnected(false);
      });

      socketRef.current = newSocket;
    }

    if (!user && socketRef.current) {
      console.log('🔄 Closing socket connection');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [user]);

  const getSocket = () => socketRef.current;

  const value = {
    socket: socketRef.current,
    isConnected,
    getSocket,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};