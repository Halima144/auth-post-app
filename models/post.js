const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,  // 👈 This links to a User
    ref: 'User',                            // 👈 Refers to the User model
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Post', postSchema);
