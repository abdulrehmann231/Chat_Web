import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { METHODS } from 'http';

dotenv.config();

const app = express();
const __dirname = path.resolve();
const port = 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

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
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 }, // Limit size to 1MB
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  }
});

// Check file type
function checkFileType(file, cb) {
  const filetypes = /wav/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Audio files only!');
  }
}

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
    SELECT u.userid, u.username 
    FROM users u 
    JOIN friends f ON (u.userid = f.userid1 OR u.userid = f.userid2) 
    WHERE (f.userid1 = $1 OR f.userid2 = $1) 
    AND u.userid != $1`, [userId]);
  return friends.rows.map(friend => [friend.username, friend.userid]);
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.userid,
      username: user.username
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');

  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.redirect('/login');
  }
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

app.get('/logout', (req, res) => {
  console.log('Logging out1');
  res.clearCookie('token');
  console.log('Logging out2');
  res.clearCookie('userData');
  console.log('Logging out3');
  res.redirect('/');// it doesnt redirect
});


app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const checkResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkResult.rows.length > 0) {
      res.render('signup.ejs', { message: 'User already exists, try logging in!' });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db.query('INSERT INTO users(username, email, passwordhash) VALUES($1, $2, $3) RETURNING *', [username, email, hashedPassword]);
      const user = result.rows[0];
      const token = generateToken(user);
      res.cookie('token', token, { httpOnly: true });

      const friends = await getFriends(user.userid);
      const users = await db.query('SELECT userid, username FROM users');
      const chats = [['Ahmed', 6], ['zoro', 2], ['kijo', 3]];

      const userData = {
        Friends: friends,
        username: user.username,
        id: user.userid,
        Users: users.rows.map(u => [u.username, u.userid]),
        Chats: chats
      };

      res.cookie('userData', JSON.stringify(userData), { httpOnly: true });
      res.redirect('/chat');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT userid, username, passwordhash FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.passwordhash);
      if (isMatch) {
        const token = generateToken(user);
        res.cookie('token', token, { httpOnly: true });

        const friends = await getFriends(user.userid);
        const users = await db.query('SELECT userid, username FROM users');
        const chats = [['Ahmed', 6], ['zoro', 2], ['kijo', 3]];

        const userData = {
          Friends: friends,
          username: user.username,
          id: user.userid,
          Users: users.rows.map(u => [u.username, u.userid]),
          Chats: chats
        };

        res.cookie('userData', JSON.stringify(userData), { httpOnly: true });
        res.redirect('/chat');
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

app.get('/chat', authenticateToken, (req, res) => {
  const userData = JSON.parse(req.cookies.userData);
  res.render('chat.ejs', userData);
});

app.post('/sendMessage', upload.single('audio'), authenticateToken, async (req, res) => {
  const chatId = req.body.chatId;
  const userId = req.body.userId;
  const text = req.body.texttContent;
  let audioBuffer = null;

  if (!text && !req.file) {
    return res.status(400).send('Error: No message content provided!');
  }

  try {
    if (text === 'null') {
      audioBuffer = req.file.buffer;
    }

    const query = 'INSERT INTO messages (chatid, userid, textcontent, voicecontent) VALUES ($1, $2, $3, $4) RETURNING messageid';
    const result = await db.query(query, [chatId, userId, text, audioBuffer]);

    const savedMessage = {
      messageId: result.rows[0].messageid,
      userId,
      text,
      audioBase64: audioBuffer ? audioBuffer.toString('base64') : null,
      sentAt: formatDate(new Date())
    };

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(savedMessage));
      }
    });

    res.send(`File uploaded and saved with ID: ${result.rows[0].messageid}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.get('/user/:userId/chat/:chatId', authenticateToken, async (req, res) => {
  const { userId, chatId } = req.params;

  try {
    const messages = await db.query('SELECT messageid, userid, textcontent, voicecontent, sentat FROM messages WHERE chatid = $1 ORDER BY sentat ASC', [chatId]);

    const messagesArray = messages.rows.map(message => {
      let audioBase64 = null;
      if (message.voicecontent) {
        audioBase64 = Buffer.from(message.voicecontent).toString('base64');
      }
      
      return [
        message.messageid,
        message.userid,
        message.textcontent,
        audioBase64,
        formatDate(message.sentat)
      ];
    });

    const userData = JSON.parse(req.cookies.userData);
    res.json({ ...userData, messages: messagesArray });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// Express server
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  console.log('client connected');
  // ws.on('message', message => {
  //   console.log(`Received message => ${message}`);
  //   ws.send('Hello! Message received.');
  // });
  ws.on('close', () => {
    console.log('client disconnected');
  });
});
