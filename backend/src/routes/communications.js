const express = require('express');
const router = express.Router();
const { authenticate, isAdminOrSupport } = require('../middleware/auth');
const ctrl = require('../controllers/communicationController');

// Notifications
router.get('/notifications', authenticate, ctrl.getNotifications);
router.put('/notifications/read-all', authenticate, ctrl.markAllRead);
router.delete('/notifications/all', authenticate, ctrl.deleteAllNotifications);
router.put('/notifications/:id/read', authenticate, ctrl.markNotificationRead);
router.delete('/notifications/:id', authenticate, ctrl.deleteNotification);

// Messages
router.get('/messages/unread-count', authenticate, ctrl.getUnreadMessageCount);
router.get('/messages/contacts', authenticate, ctrl.getContactableUsers);
router.get('/messages', authenticate, ctrl.getConversations);
router.get('/messages/:userId', authenticate, ctrl.getMessages);
router.post('/messages', authenticate, ctrl.sendMessage);

// Support Tickets
router.post('/tickets', authenticate, ctrl.createTicket);
router.get('/tickets/my', authenticate, ctrl.getMyTickets);
router.get('/tickets/:id', authenticate, ctrl.getTicketById);
router.post('/tickets/:id/reply', authenticate, ctrl.replyToTicket);
router.get('/tickets', authenticate, isAdminOrSupport, ctrl.getAllTickets);
router.put('/tickets/:id', authenticate, isAdminOrSupport, ctrl.updateTicketStatus);

module.exports = router;
