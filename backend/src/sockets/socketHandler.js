// Map to store connected users and their sockets: userId -> Set of socketIds
const userSockets = new Map();

// Save IO reference
let ioInstance = null;

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register user session
    socket.on('register', (userId) => {
      if (userId) {
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);
        socket.userId = userId;
        console.log(`User ${userId} registered to socket ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      if (socket.userId && userSockets.has(socket.userId)) {
        const sockets = userSockets.get(socket.userId);
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(socket.userId);
        }
      }
    });
  });
};

/**
 * Emit a document processing status change to the specific user
 * @param {string} userId - ID of the user who owns the document
 * @param {Object} documentData - The updated document object/info
 */
const emitDocStatus = (userId, documentData) => {
  if (!ioInstance) return;

  const userStringId = userId.toString();
  if (userSockets.has(userStringId)) {
    const socketIds = userSockets.get(userStringId);
    socketIds.forEach((socketId) => {
      ioInstance.to(socketId).emit('document_status_update', {
        documentId: documentData._id,
        status: documentData.status,
        title: documentData.title,
        ocrConfidence: documentData.ocrConfidence,
        category: documentData.category,
        tags: documentData.tags,
        updatedAt: documentData.updatedAt,
        errorMessage: documentData.errorMessage
      });
    });
  }
};

module.exports = {
  initSocket,
  emitDocStatus
};
