const session=require('express-session')
const User = require('../model/usermodel')

const isLogin = async(req,res,next)=>{
  try {
    if(req.session.user){
      // next(); 
      const user = await User.findById(req.session.user._id);
      if (user) {
          req.user = user; 
          return next();
      }
      return res.status(401).json({ message: 'User not found' });
    } 
    else{
       res.redirect('/login');

        // res.redirect('/login',{message:"please login to view this page"})
       
    }
    

  }catch(error){
    console.log(error.message);
  }

}
const isLogout = async(req,res,next)=>{
  try{
      if(req.session.user){
          res.redirect('/home');
      }else{
        next();

      }
    
  
  }catch(error){
    console.log(error.message);
  }

}
const  userblocked = async(req,res,next)=>{
  try {
      
    const user = await User.findOne({_id:req.session.user._id})
    console.log(user);
    if(user&&user.Block===true){
       res.render('login',{message: "you are blocked"})
    }else{
      next()
    }
    
  } catch (error) {
    console.log(error.message);
  }
 
}



module.exports = {
  isLogin,
  isLogout,
  userblocked
  
}