////////////////////////////
// IMPORT OUR DEPENDENCIES
////////////////////////////
// read our .env file and create environmental variables
require("dotenv").config();
// pull PORT from .env, give default value
// const PORT = process.env.PORT || 8000
// const DATABASE_URL = process.env.DATABASE_URL
const { PORT = 8000, DATABASE_URL } = process.env;
// import express
const express = require("express");
// create application object
const app = express();
// import mongoose
const mongoose = require("mongoose");
// import cors
const cors = require("cors");
// import morgan
const morgan = require("morgan");
//NEW!
// import bcrypt  
const bcrypt = require("bcryptjs")
// import jwt
const jwt = require("jsonwebtoken")

///////////////////////////
// DATABASE CONNECTION
///////////////////////////
// Establish Connection
mongoose.connect(DATABASE_URL);

// Connection Events
mongoose.connection
  .on("open", () => console.log("You are connected to mongoose"))
  .on("close", () => console.log("You are disconnected from mongoose"))
  .on("error", (error) => console.log(error));

////////////////////////////
// Models
////////////////////////////

//NEW!
// USER model for logged in users
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model("User", UserSchema);

// models = PascalCase, singular "People"
// collections, tables =snake_case, plural "peoples"

const peopleSchema = new mongoose.Schema({
  name: String,
  image: String,
  title: String,
  username: String, //NEW!
});

const People = mongoose.model("People", peopleSchema);


//NEW!
////////////////////////////////
// Custom Auth Middleware Function
////////////////////////////////
const authCheck = async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
console.log(token)
    // if there is no token, return an error
    if (!token) {
        res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        //  try to decode token
        const decoded = await jwt.verify(token, process.env.SECRET);
        // Attach the user  the request object for further use in the route handlers
        req.username = decoded.userId;
        // move on to the next piece of middleware
        next();
    } catch (err) {
        res.status(403).json({ message: 'Forbidden' });
    }
}

//////////////////////////////
// Middleware
//////////////////////////////
// cors for preventing cors errors (allows all requests from other origins)
app.use(cors());
// morgan for logging requests
app.use(morgan("dev"));
// express functionality to recognize incoming request objects as JSON objects
app.use(express.json());

////////////////////////////
// ROUTES
////////////////////////////

//NEW!
//////////////////
// AUTH ROUTES
//////////////////

// /signup - POST - receives a username and password and creates a user in the database
app.post("/signup", async (req, res) => {
    try {
        // deconstruct the username and password from the body
        let { username, password } = req.body;
        // hash the password
        password = await bcrypt.hash(password, await bcrypt.genSalt(10));
        // create a new user in the database
        const user = await User.create({ username, password });
        // send the new user as json
        res.json(user);
    } catch (error) {
        res.status(400).json({ error })
    }
})


// /login - POST - receives a username and password, checks them against the database, and returns the user object if they match with a cookie inlcuding a signed JWT
app.post("/login", async (req, res) => {
    console.log(req.body)
    // deconstruct the username and password from the body
    const { username, password } = req.body;
    // search the database for a user with the provided username
    const user = await User.findOne({ username });
    // if no user is found, return an error

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
        
    }
    // Generate a token
    const token = jwt.sign({ userId: user.id }, process.env.SECRET, { expiresIn: '1h' });

    res.json({ token });
});


// "/people"
// INDUCES - INDEX, xNEWx, DELETE, UPDATE, CREATE, xEDITx, SHOW
// IDUCS - INDEX, DESTROY, UPDATE, CREATE, SHOW (FOR AN JSON API)

// INDEX - GET - /people - gets all people
app.get("/people", authCheck, async (req, res) => {
  try {
    // fetch all people from database
    const people = await People.find({ username: req.username }); //NEW!
    // send json of all people
    res.json(people);
  } catch (error) {
    // send error as JSON
    res.status(400).json({ error });
  }
});

// CREATE - POST - /people - create a new person
app.post("/people", authCheck, async (req, res) => {
  try {
    //NEW!
    // add username to req.body to track related user
    req.body.username = req.username

    // create the new person
    const person = await People.create(req.body);
    // send newly created person as JSON
    res.json(person);
  } catch (error) {
    res.status(400).json({ error });
  }
});

// SHOW - GET - /people/:id - get a single person
app.get("/people/:id", authCheck, async (req, res) => {
  try {
    // get a person from the database
    const person = await People.findById(req.params.id);
    // return the person as json
    res.json(person);
  } catch (error) {
    res.status(400).json({ error });
  }
});

// UPDATE - PUT - /people/:id - update a single person
app.put("/people/:id", authCheck, async (req, res) => {
  try {
    // update the person
    const person = await People.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    // send the updated person as json
    res.json(person);
  } catch (error) {
    res.status(400).json({ error });
  }
});

// DESTROY - DELETE - /people/:id - delete a single person
app.delete("/people/:id", authCheck, async (req, res) => {
    try {
        // delete the person
        const person = await People.findByIdAndDelete(req.params.id)
        // send deleted person as json
        res.status(204).json(person)
    } catch(error){
        res.status(400).json({error})
    }
})

// create a test route
app.get("/", (req, res) => {
    res.json({ hello: "world" });
});

////////////////////////////
// LISTENER
////////////////////////////
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
