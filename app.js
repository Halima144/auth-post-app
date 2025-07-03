const express = require('express');
const mongoose = require('mongoose');
const userModel = require('./models/user');
const postModel = require('./models/post');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const JWT_SECRET = "halima_super_secret_123";
const app = express();

mongoose.connect("mongodb://127.0.0.1:27017/miniproject");

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

//  Middleware: Check login
function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.render("login", { error: null });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.render("login", { error: "Session expired. Please login again." });
  }
}

//  Home (register) page
app.get('/', (req, res) => {
  res.render('index'); // index.ejs = register form
});

// Optional: if someone tries /register, redirect to /
app.get('/register', (req, res) => {
  res.redirect('/');
});

// Register user
app.post('/register', async (req, res) => {
  try {
    const { email, password, username, name, age } = req.body;

    // Validation
    if (!email || !password || !username || !name || !age) {
      return res.status(400).send("All fields are required.");
    }

    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).send("Invalid email format.");
    }

    if (password.length < 6) {
      return res.status(400).send("Password must be at least 6 characters.");
    }

    if (username.length < 3) {
      return res.status(400).send("Username must be at least 3 characters.");
    }

    const parsedAge = parseInt(age);
    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 100) {
      return res.status(400).send("Age must be between 10 and 100.");
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) return res.status(400).send("User already registered.");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await userModel.create({
      username,
      name,
      age: parsedAge,
      email,
      password: hashedPassword
    });

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '1d' });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.redirect('/login');

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).send("Server Error");
  }
});

//  Login form
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login user
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', { error: 'Email and password are required.' });
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.render('login', { error: 'Invalid email or password.' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.render('login', { error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user._id }, JWT_SECRET);
  res.cookie("token", token, { httpOnly: true });
  res.redirect("/profile");
});

//  Profile page
app.get('/profile', isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user.id).populate('posts');
  if (!user) return res.redirect('/login');
  res.render("profile", { user, currentUserId: req.user.id });
});

//  Create post
app.get('/post', isLoggedIn, (req, res) => {
  res.render('createPost');
});

app.post('/post', isLoggedIn, async (req, res) => {
  const { title, body } = req.body;
  const post = await postModel.create({ title, body, user: req.user.id });

  await userModel.findByIdAndUpdate(req.user.id, {
    $push: { posts: post._id }
  });

  res.redirect('/profile');
});

// Like/Unlike post
app.get('/like/:id', isLoggedIn, async (req, res) => {
  const post = await postModel.findById(req.params.id);
  if (!post) return res.status(404).send("Post not found");

  const userId = req.user.id;
  const liked = post.likes.includes(userId);

  if (liked) {
    post.likes.pull(userId);
  } else {
    post.likes.push(userId);
  }

  await post.save();
  res.redirect('/profile');
});

//  Edit post
app.get('/edit/:id', isLoggedIn, async (req, res) => {
  const post = await postModel.findById(req.params.id);
  if (!post) return res.status(404).send("Post not found");

  if (String(post.user) !== String(req.user.id)) {
    return res.status(403).send("Unauthorized");
  }

  res.render("editPost", { post });
});

app.post('/edit/:id', isLoggedIn, async (req, res) => {
  const { title, body } = req.body;
  const post = await postModel.findById(req.params.id);

  if (!post) return res.status(404).send("Post not found");

  if (String(post.user) !== String(req.user.id)) {
    return res.status(403).send("Unauthorized");
  }

  post.title = title;
  post.body = body;
  await post.save();

  res.redirect("/profile");
});

//  Logout
app.get('/logout', isLoggedIn, (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.listen(3000, () => {
  console.log(" Server started at http://localhost:3000");
});
