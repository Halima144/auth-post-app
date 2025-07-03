// models/user.js
const mongoose = require('mongoose');

// 1. Pehle schema define karo
const userSchema = new mongoose.Schema({
  username: String,
  name: String,
  age: Number,
  email: String,
  password: String ,
  posts:[ {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post' // 👈 This links the user's posts to the Post model
  }] // ✅ small 'p', to match with req.body.password
});

// 2. Us schema se model banao aur export karo
module.exports = mongoose.model('User', userSchema);
