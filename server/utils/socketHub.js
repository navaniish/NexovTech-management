let ioInstance = null;

module.exports = {
  setIo: (io) => {
    ioInstance = io;
    console.log('📡 SOCKET_HUB: Socket.io instance registered successfully.');
  },
  getIo: () => {
    return ioInstance;
  },
  emit: (event, data) => {
    if (ioInstance) {
      ioInstance.emit(event, data);
    } else {
      console.warn(`📡 SOCKET_HUB: Tried to emit event "${event}" but no Socket.io instance is registered.`);
    }
  }
};
