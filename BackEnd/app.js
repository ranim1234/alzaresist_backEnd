const express = require("express") ; 
const mongoose = require("mongoose") ; 
const _ = require("lodash") ; 
const jwt = require('jsonwebtoken');

const cors = require("cors") ;  
const User = require("./models/user") ;  
const url = "mongodb+srv://ranim:ranim1234@cluster0.eog9b.mongodb.net/users?retryWrites=true&w=majority" ;  
const app = express() ; 
const { check, validationResult, body } = require('express-validator') ; 

mongoose.connect(url,{useNewUrlParser:true , useUnifiedTopology:true}) 
.then(()=>{
    console.log("connected");
}) 
.catch((err)=>{
console.log(err) ; 
})
app.listen(8000) ; 
app.use(cors()) ;  
app.use(express.json()) ; 
app.use(express.static('public')) ;  
app.use(express.urlencoded({extended:false})) ; 
app.set('view engine','ejs') ;  
const userValidationRules = () => {
    return [
      // password must be at least 5 chars long
      body('password').isLength({ min: 5 }),
      
       body('prenom').not().isEmpty().withMessage('Enter username'),
        body('nom').not().isEmpty(),
        body('email', 'Your email is not valid').isEmail(),
     
    ]
  }
  
  const validate = (req, res, next) => {
    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }
    const extractedErrors = []
    errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }))
  
    return res.status(422).json({
      errors: extractedErrors,
    })
  }


// CORS HEADERS MIDDLEWARE
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");

    res.header(
        'Access-Control-Expose-Headers',+
        'x-access-token, x-refresh-token'
    );

    next();
});


let authenticate = (req, res, next) => {
    let token = req.header('x-access-token');

    // verify the JWT
    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if (err) {
            res.status(401).send(err);
        } else {
            req.user_id = decoded._id;
            next();
        }
    });
}
let verifySession = (req, res, next) => {
    let refreshToken = req.header('x-refresh-token');

    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user) {
            return Promise.reject({
                'error': 'User not found. Make sure that the refresh token and user id are correct'
            });
        }



        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            next();
        } else {
            return Promise.reject({
                'error': 'Refresh token has expired or the session is invalid'
            })
        }

    }).catch((e) => {
        res.status(401).send(e);
    })
}
//app.get('/',(req,res)=>{
   // res.send("hello") ; 
//})
// file same name input 
app.post('/users', userValidationRules(),validate,  (req, res) => {
    // User sign up
    const nom = req.body.nom ; 
    const prenom = req.body.prenom; 
    const email = req.body.email ; 
    const password = req.body.password; 

    const newUser = new User({nom:nom,prenom:prenom,email:email,password:password});
console.log(newUser.email); 
console.log(newUser.password) ; 
    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
 

        return newUser.generateAccessAuthToken().then((accessToken) => {
            return { accessToken, refreshToken }
        });
    }).then((authTokens) => {
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    })
   
})



//user_login 
app.post('/users/login',(req, res) => {
    let email= req.body.email ; 
    let password = req.body.password; 

    User.findByCredentials(email, password).then((user) => { 
        return user.createSession().then((refreshToken) => {
           

            return user.generateAccessAuthToken().then((accessToken) => {
                return { accessToken, refreshToken }
            });
        }).then((authTokens) => {
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    });
})

//get User by id 

app.get("/user/:id",(req,res)=>{

const id = req.params.id ; 
User.findOne({_id:id}).then((user)=>{
res.send(user) ; 


})
.catch((err)=>{

    console.log(err) ; 
})



})
app.patch('/users/:id', authenticate,(req,res)=>{

const  updateObject = req.body;
const id = req.params.id;
User.updateOne({_id  : id}, {$set: updateObject}).then(()=>{res.send("updated succesfully") ; 
})
  
   // console.log(doc) 
   .catch((err)=>{

    console.log(err) ; 
})

}) 
app.post('/user/:id',authenticate, (req,res)=>{
    const id = req.params.id ; 
    User.findByIdAndUpdate(id, req.body, function (err, user) {
        if (err) {
          return next(err);
        } else {
          user.password = req.body.new_password;
          user.save(function (err, user) {
            if (err) {
              res.send("Error: ", err); 
            } else {
              res.send("password updated successfully!");
            }
          })
        }
      });
})
app.delete('/users/:id', authenticate,(req,res)=>{

const id = req.params._id ; 
User.deleteOne(id).then((doc)=>{
res.send(doc) ; 

}).catch((err)=>{

console.log(err) ; 

})


}) 

app.get('/users/me/access-token', verifySession, (req, res) => {
    // we know that the user/caller is authenticated and we have the user_id and user object available to us
    req.userObject.generateAccessAuthToken().then((accessToken) => {
    
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
        console.log(e);
    });
})
