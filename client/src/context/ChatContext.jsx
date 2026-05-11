import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import API_URL from '../config';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeRoom, setActiveRoom] = useState('general');
  const [typingUsers, setTypingUsers] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  
  // Use a ref for the socket to avoid cleanup/re-init issues
  const socketRef = useRef(null);

  useEffect(() => {
    if (user && !socketRef.current) {
      // Connect to the socket server
      const newSocket = io(API_URL.replace('/api', ''));

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Listen for global events
      newSocket.on('new-message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('user-typing', ({ user: typingUser }) => {
        setTypingUsers(prev => ({ ...prev, [typingUser.id]: typingUser.name }));
        setTimeout(() => {
          setTypingUsers(prev => {
            const newState = { ...prev };
            delete newState[typingUser.id];
            return newState;
          });
        }, 3000);
      });

      newSocket.on('new-announcement', (announcement) => {
        setAnnouncements(prev => [announcement, ...prev]);
      });

      // Initial data fetch
      fetchAnnouncements();

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [user]);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`${API_URL}/communication/announcements`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (err) {
      console.error('Failed to fetch announcements');
    }
  };

  const joinRoom = (room) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', room);
      setActiveRoom(room);
      // Fetch history
      fetch(`${API_URL}/communication/messages/${room}`)
        .then(res => res.json())
        .then(data => setMessages(data))
        .catch(err => console.error('History fetch failed'));
    }
  };

  const sendMessage = (content, type = 'text') => {
    if (socketRef.current && user) {
      const messageData = {
        room: activeRoom,
        sender: {
          id: user.id || user._id,
          name: user.name,
          avatar: user.avatar,
          role: user.role
        },
        content,
        type
      };
      socketRef.current.emit('send-message', messageData);
    }
  };

  const sendTyping = () => {
    if (socketRef.current && user) {
      socketRef.current.emit('typing', { room: activeRoom, user: { id: user.id || user._id, name: user.name } });
    }
  };

  const broadcastAnnouncement = (title, content, priority = 'Medium') => {
    if (socketRef.current && user?.role === 'Admin') {
      const data = {
        title,
        content,
        priority,
        sender: user.name
      };
      socketRef.current.emit('broadcast-announcement', data);
    }
  };

  return (
    <ChatContext.Provider value={{
      socket,
      messages,
      activeRoom,
      typingUsers,
      announcements,
      joinRoom,
      sendMessage,
      sendTyping,
      broadcastAnnouncement
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
