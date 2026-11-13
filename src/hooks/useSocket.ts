import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const DEFAULT_INDIA_COORDS = { lat: 28.6139, lng: 77.2090 };

export const useSocket = (userId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && userId) {
      const emitLocation = () => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              // Keep simulated/browser coordinates inside India if outside India bounds
              const inIndia =
                latitude >= 6 && latitude <= 37 && longitude >= 67 && longitude <= 98;
              socket.emit('update_location', {
                userId,
                lat: inIndia ? latitude : DEFAULT_INDIA_COORDS.lat,
                lng: inIndia ? longitude : DEFAULT_INDIA_COORDS.lng,
              });
            },
            () => {
              socket.emit('update_location', {
                userId,
                lat: DEFAULT_INDIA_COORDS.lat,
                lng: DEFAULT_INDIA_COORDS.lng,
              });
            }
          );
        } else {
          socket.emit('update_location', {
            userId,
            lat: DEFAULT_INDIA_COORDS.lat,
            lng: DEFAULT_INDIA_COORDS.lng,
          });
        }
      };

      emitLocation();
      const interval = setInterval(emitLocation, 10000);
      return () => clearInterval(interval);
    }
  }, [socket, userId]);

  return socket;
};
