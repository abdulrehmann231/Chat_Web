import express from "express";
import bodyParser from "body-parser";
import path from "path";
import env from "dotenv";
import pg from "pg";

const app = express();
const __dirname = path.resolve();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect((err)=>{
  if(err){
    console.log(err);
  }
  else{
    console.log("Connected to database");
  }
});

app.get("/",(req,res)=>{
    res.render("homepage.ejs");
});

app.get("/login", (req,res)=>{
 res.render("login.ejs");
});

app.get("/signup",(req,res)=>{
  res.render("signup.ejs");
});


app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (checkResult.rows.length > 0) {
      res.render("signup.ejs", { message: "User already exists , Try loggin in!" });
    } else {
      const result = await db.query("INSERT INTO users(username,email,password) VALUES($1,$2,$3)", [username, email, password]);
      console.log(result);
      res.render("login.ejs");
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;    
  
  const messages = [
    ["Hello",1],
    ["How are you?",2],
    ["I am fine",123],
    ["How are you?",123],
  ];
  
  try {
    const result = await db.query("SELECT id,username FROM users WHERE email = $1 AND password = $2", [email, password]);
    let ID = result.rows[0].id ;
    let username = result.rows[0].username;
    
    const users = await db.query("SELECT username FROM users");
    let friends = await db.query("SELECT username,users.id FROM users,friends WHERE friends.recieverid = users.id OR friends.senderid = users.id AND users.id != $1", [ID]);
    friends = friends.rows;
    
    friends = friends.map(friend => [friend.username,friend.id]);
    console.log(friends);

    const userList = users.rows.map(user => user.username);
    //console.log(userList);
    if (result.rows.length > 0) {
      
      
      console.log("User exists");
      res.render("chat.ejs",{Friends : friends, username : "Ali", id : ID , Messages : messages, Users : userList});
    } else {
      res.render("login.ejs", { message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
  }
});

//saving message to database
app.post("/sendMessage", async (req, res) => { 
  try {
      
    const {Message, UserId, friendName, friendID} = req.body;
    console.log(Message, UserId, friendName, friendID);
  } catch (error) {
    console.log(error);
  }
});


app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
});

