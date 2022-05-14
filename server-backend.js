// Imports:
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const express = require('express');
const multer  = require('multer');
const Pool = require('pg').Pool
const nodemailer = require("nodemailer");
require('dotenv').config({ path: './.piss_off.env' })

const pool = new Pool({
    user: process.env.PSQL_USER,
    host: process.env.PSQL_HOST,
    database: process.env.PSQL_DB1,//change to 'test' for production
    password: process.env.PSQL_PASS,
    port: process.env.PSQL_PORT,
  })
const pool2 = new Pool({
  user: process.env.PSQL_USER,
  host: process.env.PSQL_HOST,
  database:  process.env.PSQL_DB2,
  password: process.env.PSQL_PASS,
  port: process.env.PSQL_PORT,
})

// Date:
let ts = Date.now();
let date_ob = new Date(ts);
let date = date_ob.getDate();
let month = date_ob.getMonth() + 1;
let year = date_ob.getFullYear();
const my_date = month + " / " + date + " / " + year;

// SSL Keys:
const options = {
    key: fs.readFileSync("./server.key","utf8"), // Path key
    cert: fs.readFileSync("./flow-crt.crt","utf8"), // Path to certificate
    ca: [fs.readFileSync("./bundle1.crt","utf8"), fs.readFileSync("./bundle2.crt","utf8"), fs.readFileSync("./bundle3.crt","utf8")]
}

// Express App
const app = express();
const cors = require('cors');
app.use(express.json());
app.use(cors());

// Emailer:
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_SEND,
      pass: process.env.EMAIL_PASSWORD
    }
  });

// Image Upload for post (Server-Side):
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function ( req, file, cb ) {
    cb( null, file.originalname);
    }});
const upload = multer( { storage: storage } );

 //Create Post (Server-Side):
 app.post('/createPost', upload.single('photo'), (request, response) => {
  var title = request.body.title
  var description = request.body.description
  var myfile = request.file
  const file_details = myfile.destination + myfile.filename
  pool.query('INSERT INTO posts (title, description, date, post) VALUES ($1, $2, $3, $4)',
   [title, description, my_date, file_details ], (e, results) => {
      if (e) console.log(e)
      else console.log("POSTED")
  })
  response.sendFile(__dirname+"/views/index.html");
});
// GET ALL Posts (Server DB --> Client)
 app.get("/getPosts", function (request, response){
    pool.query('SELECT * FROM posts ORDER BY id ASC', (error, results) => {
        if (error) throw error
        response.status(200).json(results.rows)
      })
})

// GET Post-Details (String) (Server DB --> Client)
app.get("/cardInfo", function (request, res){
  pool.query('SELECT * FROM posts ORDER BY id DESC LIMIT 3', (error, results) => {
    if (error) throw error
    const title0 = results.rows[0].title
    const desc0 = results.rows[0].description
    const date0 = results.rows[0].date
    const title1 = results.rows[1].title
    const desc1= results.rows[1].description
    const date1 = results.rows[1].date
    const title2 = results.rows[2].title
    const desc2= results.rows[2].description
    const date2 = results.rows[2].date
    const arr = [
      title0,desc0,date0,
      title1,desc1,date1,
      title2,desc2,date2,
    ]
    console.log("SENT info")
    return res.send(arr);
  })
})
// GET Post-1 file reference from DB (Image)
app.get("/card1", function (request, res){
    pool.query('SELECT post FROM posts ORDER BY id DESC LIMIT 1', (error, results) => {
      if (error) throw error
      else { 
          var img = results.rows[0].post.substring(1,)
          var image = __dirname+img 
          console.log(image)
          return res.sendFile(image);
      }
    })
})
// GET Post-2 file reference from DB (Image)
app.get("/card2", function (request, res){
  pool.query('SELECT post FROM posts ORDER BY id DESC LIMIT 2', (error, results) => {
    if (error) throw error
    else {
        var img = results.rows[1].post.substring(1,)
        var image= __dirname+img
        console.log(image)
        return res.sendFile(image);
    }
  })
})
// GET Post-3 file reference from DB (Image)
app.get("/card3", function (request, res){
  pool.query('SELECT post FROM posts ORDER BY id DESC LIMIT 3', (error, results) => {
    if (error) throw error
    else {
      var img = results.rows[2].post.substring(1,)
      var image = __dirname+img 
      console.log(image)
      return res.sendFile(image);
    }
  })
})

//Client-Side Yoga Inquiry ( CLIENT -> DB -> EMAIL ):
app.post('/newClient',(req, res) => {
const data = req.body 
  console.log("Writing:")
  console.log(data)
  pool2.query('INSERT INTO clients (name, phone, email, message, date) VALUES ($1, $2, $3, $4, $5)',
    [data.name, data.phone, data.email, data.message, my_date ], (e, results) => {
      if (e) console.log(e)
      else console.log("POSTED NEW CLIENT")
})
  const mailConfigurations = {
    from: process.env.EMAIL_SEND,
    to: process.env.EMAIL_REC,
    subject: 'Yoga Inquiry!',
    text: 'Someone has inquired into foothills flow!\n\n'
     + data.name +'\n' 
     + data.email + '\n' 
     + data.phone + '\n'
     + data.message + '\n\n'
     + 'Follow up as soon as possible!\n' 
     + 'Good luck! \n -Fonald'
  };

  transporter.sendMail(mailConfigurations, function(error, info){
    if (error) throw Error(error);
       console.log('Email Sent Successfully');
    console.log(info);
});
  res.send("POSTED!");
});

// Fetch all Clients ( DB -> JSON )
app.get('/allClients',(req, res) => {
  pool2.query('SELECT * FROM clients', (e, results) => {
    e ? console.log(e) : console.log(results.rows)
    res.send(results.rows)
    })
})

// Https Express Server
const backend = process.env.BACKEND_PORT;
https.createServer(options, app).listen(backend,() => {
    console.log(process.env.EMAIL_REC)
	console.log('Back-end Server Active\n(https port: ' + backend+')\n');
});


// Backend Web Index
app.get("/", function (request, response){
  response.sendFile(__dirname+"/views/index.html");
});

 //start the server
 //app.listen(8080);
 //console.log("Server running @ http://localhost:8080");
