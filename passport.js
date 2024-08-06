const passport = require("passport")
const Googlestrategy = require("passport-google-oauth2").Strategy

// console.log("Client ID:", process.env.Client_id)
passport.serializeUser((user,done)=>{
    done(null,user);
})
passport.deserializeUser((user,done)=>{
    done(null,user)
})

passport.use(new Googlestrategy ({
    clientID : process.env.Client_id,
    clientSecret : process.env.Client_secret,
    callbackURL:"http://localhost:1010/auth/google/callback",
    passReqToCallback:true
},

function(request,accessToken,refreshTocken,profile,done){
    return done(null,profile)
}
))

