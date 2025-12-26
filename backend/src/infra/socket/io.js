import { Server } from 'socket.io';

let ioInstance;

export const initSocket = (server, allowedOrigins = ['*']) => {
  ioInstance = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST']
    }
  });
  return ioInstance;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized');
  }
  return ioInstance;
};
