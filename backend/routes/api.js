const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// In-Memory Storage (replacing MongoDB)
const tempEmails = [];
const messages = [];

// Generate a random email ID
const generateRandomEmail = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let email = '';
  for (let i = 0; i < 10; i++) {
    email += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${email}@tempmail.local`;
};

// POST /api/emails - Create or Connect to a temporary email
router.post('/emails', (req, res) => {
  try {
    const { customAlias } = req.body || {};
    let emailAddress = customAlias ? `${customAlias}@tempmail.local` : generateRandomEmail();
    
    let existingEmail = tempEmails.find(e => e.email === emailAddress);
    if (existingEmail) {
      return res.status(200).json(existingEmail);
    }

    const newEmail = {
      _id: crypto.randomUUID(),
      email: emailAddress,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
    
    tempEmails.push(newEmail);

    // Notify all clients that a new email was generated (for the sender app to sync)
    const io = req.app.get('io');
    io.emit('new_active_email', newEmail);

    res.status(201).json(newEmail);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate email' });
  }
});

// GET /api/emails/latest - Get the most recently generated email
router.get('/emails/latest', (req, res) => {
  try {
    if (tempEmails.length === 0) {
      return res.status(404).json({ error: 'No emails found' });
    }
    // Sort descending by creation date
    const sorted = [...tempEmails].sort((a, b) => b.createdAt - a.createdAt);
    res.status(200).json(sorted[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest email' });
  }
});

// GET /api/emails/:email - Get email details and its messages
router.get('/emails/:email', (req, res) => {
  try {
    let email = tempEmails.find(e => e.email === req.params.email);
    if (!email) {
      email = {
        _id: crypto.randomUUID(),
        email: req.params.email,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
      tempEmails.push(email);
    }

    const emailMessages = messages
      .filter(m => m.tempEmailId === email._id)
      .sort((a, b) => b.createdAt - a.createdAt);
      
    res.status(200).json({ email, messages: emailMessages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email details' });
  }
});

// POST /api/messages - Send a new message
router.post('/messages', (req, res) => {
  try {
    const { emailAddress, sender, subject, message } = req.body;

    let email = tempEmails.find(e => e.email === emailAddress);
    if (!email) {
      email = {
        _id: crypto.randomUUID(),
        email: emailAddress,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
      tempEmails.push(email);
    }

    const newMessage = {
      _id: crypto.randomUUID(),
      tempEmailId: email._id,
      sender,
      subject: subject || '(No subject)',
      message,
      createdAt: new Date()
    };
    
    messages.push(newMessage);

    // Emit the new message to the specific room (emailAddress)
    const io = req.app.get('io');
    io.to(email.email).emit('new_message', newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
