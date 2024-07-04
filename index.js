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
      const result = await db.query("INSERT INTO users(username,email,passwordhash) VALUES($1,$2,$3)", [username, email, password]);
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
  const chats =[
    ["Ahmed",1],
    ["zoro",2],
    ["kijo",3],
  ];
  //database check needed : TODO
  try {
    const result = await db.query("SELECT userid,username FROM users WHERE email = $1 AND passwordhash = $2", [email, password]);
    
    if (result.rows.length > 0) {
      let ID = result.rows[0].userid;
      let username = result.rows[0].username;
      //let friends=["ali","ahmed","abdullah"];
      let users = await db.query("SELECT userid, username FROM users");
      users = users.rows;
      users = users.map(user => [user.username,user.userid]);
      console.log(users);
      
      console.log("User exists");
      let friends = await db.query("SELECT u.UserID, u.Username FROM Users u JOIN Friends f ON (u.UserID = f.UserID1 OR u.UserID = f.UserID2) WHERE (f.UserID1 = $1 OR f.UserID2 = $1) AND u.UserID != $1;", [ID]);
      friends = friends.rows;
      friends = friends.map(friend => [friend.username,friend.userid]);
      console.log(friends);

      
      
      console.log("User exists");
      res.render("chat.ejs",{Friends : friends, username : username, id : ID , Messages : messages, Chats : chats });
      
    } else {
      res.render("login.ejs", { message: "Invalid credentials" });
    }
    
 
    
    
    // let chats = await db.query("Select * from conversation where creator = $1 OR chatterid = $2" , [ID,ID]);
    // chats = chats.rows;
    // let NumOfChats = chats.rowCount;
    // let ChatArrays =[];
    // for(let i=0;i < NumOfChats;i++)
    // {
       
    // }

    
   
    
    // console.log(friends);

    // const userList = users.rows.map(user => user.username);
    // console.log(userList);
    // let userList=[];
    // for(let j=0;j< users.rowCount;j++){
    //   userList.push([users.rows[j].username,users.rows[j].id])
    // }

  } catch (error) {
    console.log(error);
  }
});

app.get("/getchat", (req,res)=>{
  console.log("getchat");
  //res.render("chat.ejs",{Friends : friends, username : username, id : ID , Messages : messages, Chats : chats });
  //res.send("Hello");
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

