import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import dotenv from 'dotenv';
 import pg from 'pg';
import session from 'express-session';
import bcrypt from 'bcrypt';

dotenv.config();

const app = express();
const __dirname = path.resolve();
const port = 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Database configuration
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT
});

db.connect(err => {
  if (err) {
    console.error('Database connection error', err.stack);
  } else {
    console.log('Connected to database');
  }
});

// Utility functions
const formatDate = dateStr => {
  const date = new Date(dateStr);
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  };
  return date.toLocaleString('en-US', options);
};

const getFriends = async userId => {
  const friends = await db.query(`
    SELECT u.UserID, u.Username 
    FROM Users u 
    JOIN Friends f ON (u.UserID = f.UserID1 OR u.UserID = f.UserID2) 
    WHERE (f.UserID1 = $1 OR f.UserID2 = $1) 
    AND u.UserID != $1`, [userId]);
  return friends.rows.map(friend => [friend.username, friend.userid]);
};

// Routes
app.get('/', (req, res) => {
  res.render('homepage.ejs');
});

app.get('/login', (req, res) => {
  res.render('login.ejs');
});

app.get('/signup', (req, res) => {
  res.render('signup.ejs');
});

app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const checkResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkResult.rows.length > 0) {
      res.render('signup.ejs', { message: 'User already exists, try logging in!' });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query('INSERT INTO users(username,email,passwordhash) VALUES($1,$2,$3)', [username, email, hashedPassword]);
      res.render('login.ejs');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const chats = [['Ahmed', 6], ['zoro', 2], ['kijo', 3]];

  try {
    const result = await db.query('SELECT userid,username,passwordhash FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.passwordhash);
      if (isMatch) {
        const users = await db.query('SELECT userid, username FROM users');
        const userData = {
          Friends: await getFriends(user.userid),
          username: user.username,
          id: user.userid,
          Users: users.rows.map(u => [u.username, u.userid]),
          Chats: chats
        };
        req.session.userData = userData;
        res.render('chat.ejs', userData);
      } else {
        res.render('login.ejs', { message: 'Invalid credentials' });
      }
    } else {
      res.render('login.ejs', { message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.post('/sendMessage', async (req, res) => {
  const { Message, UserId, friendName, friendID } = req.body;
  try {
    console.log(Message, UserId, friendName, friendID);
    // Add logic to save the message to the database
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.get('/user/:userId/chat/:chatId', async (req, res) => {
  const { userId, chatId } = req.params;
  try {
    let messages = await db.query('SELECT messageid,userid,textcontent,voicecontent,sentat FROM messages WHERE chatid = $1 ORDER BY sentat ASC', [chatId]);
    const messagesArray = messages.rows.map(message => [
      message.messageid,
      message.userid,
      message.textcontent,
      message.voicecontent,
      formatDate(message.sentat)
    ]);

    const { Friends, username, id, Users, Chats } = req.session.userData;
    res.render('chat.ejs', { Friends, username, id, Users, Chats, messages: messagesArray });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
