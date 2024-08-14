const mongoose = require('mongoose')
require('dotenv').config();
const  nocache = require('nocache')
// const sharp = require('sharp')
const fs = require('fs')
const path = require('path');
const session = require('express-session');
const passport = require('passport');
require('./passport');
mongoose.connect(process.env.MONGODB_URI, {
  // useNewUrlParser: true, // Recommended options
  // useUnifiedTopology: true,
})
.then(() => {
  console.log("Atlas cloud is connected");
})
.catch((err) => {
  console.error("Error connecting to MongoDB Atlas:", err.message);
});

console.log("loding");
const express = require('express')
const app = express()

app.use(nocache({
    maxAge: 86400
}))

app.set('view engine', 'ejs');

app.use(express.static('public'));

// app.use(session({
//   secret: process.env.secret,
//   resave: false,
//   saveUninitialized: false,
// }));


// app.use(passport.initialize());
// app.use(passport.session());

const userRouter = require('./router/userRouter');
app.use('/', (req, res, next) => {
  app.set('views', path.join(__dirname, 'views/user'));
  next();
}, userRouter);


const adminRouter = require('./router/adminRouter');
app.use('/admin', (req, res, next) => {
  app.set('views', path.join(__dirname, 'views/admin'));
  next();
}, adminRouter);

app.use((req, res, next) => {
  if (req.url.startsWith('/admin')) {
     
      res.status(404).render('404admin');
  } else {
      
      res.status(404).render('404');
  }
});
console.log("hi git");
app.listen(process.env.portnumber, ()=>{console.log("server is running");})
