
const product = require('../model/productmodel')
const Category = require('../model/categorymodel')
const User = require('../model/usermodel');
const  Cart = require('../model/cartmodel')
const OTP = require('../model/otpmodel');
const nodemailer = require('nodemailer');
const config = require("../config/config")
const bcrypt = require('bcrypt')
const randomString = require('randomstring')
const jwt = require('jsonwebtoken')
const Coupon = require("../model/couponmodel") 
const Wish = require('../model/wishlistmodel')
const Wallet = require('../model/walletmodel')
const securedpassword = async(password)=>{
    try{
        const hashedpassword = await bcrypt.hash(password,10);
        return hashedpassword

    }catch(error){
        console.log(error.message);
    }
}

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.email,
        pass: process.env.password
    }
});

const loadregister = async (req, res) => {
    try {
        console.log("Loading register page");
        res.render('register');
    } catch (error) {
        console.error("Error loading register page:", error.message);
        res.status(500).send('Internal Server Error');
    }
}


const resendpassword = async (name, email, token) => {
    try {
        console.log(email,"for the resendpassword");
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.email,
          pass: process.env.password
        }
      });
  
      const mailOptions = {
        from: process.env.password,
        to: email,
        subject: "Reset your password",
        html: `<p>Hi ${name},</p>
               <p>Please click on the following link to reset your password:</p>
               <a href=https://tempusgems.online/resetpassword?token=${token}">Reset Password</a>`
      };
  
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Mail sent", info.response);
        }
      });
    } catch (error) {
      console.error("Error in sending email:", error);
    }
  };
  

const insertUser = async (req, res) => {
    try {
       console.log(req.body,"this is body");
       
       console.log("email is here for otp",req.body);
        
       const { name, phone, email, password } = req.body;
        
       const existingUser = await User.findOne({ email: email });
       if (existingUser) {
           // console.log(existingUser);
        
           console.error('Email already exists');
           return res.render('register', { message: 'Email already exists. Please use a different email.' });
       }
req.session.email=email
    
       //  const isOTPVerified = await OTP.verifyOTP(email, otp);

       //  if (isOTPVerified) {
                       const hashedPassword = await securedpassword(password);
                       const userData = new User({
                           name,
                           email:req.body.email,
                           password: hashedPassword,
                           phone
                       });
           req.session.userdata=userData
                       
                       //await userData.save();
                       console.log('user created');
           // console.log('OTP verified successfully');
           
          // res.redirect('/otppage');
       
       console.log(email);
               const otp = await OTP.generateAndSaveOTP(email);
       console.log("hlo it is otp page here");
               // Send OTP to user's email
               const mailOptions = {
                   from: process.env.email,
                   to: email,
                   subject: 'Your OTP for Signup',
                   text: `Your OTP for signup is: ${otp}`
               };
       
               await transporter.sendMail(mailOptions);
                //res.status(200).json({ success: true, message: 'OTP sent successfully' });
                console.log('OTP sent successfully to', email);
               
        res.redirect('/otppage')
        //  } else {
           
        //      console.error('Failed to verify OTP');
        //      res.render('register', { message: 'Failed to verify OTP. Please try again.' });
        //  }
    } catch (error) {
        console.error('Error creating user:', error.message);
        res.status(500).send('Error creating user');
    }
}
const loadotppage = async(req,res)=>{
    try {
        res.render('otppage')
    } catch (error) {
        console.log(error.message);
    }
}

const otpverify = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log(otp);
        console.log("verification",req.session.email);
        // if (!otp) {
        //     return res.status(400).send({ otp: "Please enter the OTP" });
        // }
        let email=req.session.email
        console.log(email,"this is the email in the verification");
        // Verify OTP for the user
        const isOTPVerified = await OTP.verifyOTP(email,otp);
        // if(!isOTPVerified){
        //    res.status(400).send({otp:"wrong"}) 
        // }

        const generateReferralCode = () => {
            const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let code = "";
            for (let i = 0; i < 6; i++) {
              code += characters[Math.floor(Math.random() * characters.length)];
            }
            return code;
          }

          const referralCode = generateReferralCode();
          console.log("referralCode :" , referralCode)


         console.log(isOTPVerified,"htthgyg");
         if (isOTPVerified) {
           
            const { name, phone, email, password }= req.session.userdata
            const userData = new User({
                name,
                email,
                password,
                phone,
                referralCode:referralCode
            });
            console.log(userData);
            await userData.save()
             const user = await User.findOne({email})
                         req.session.user=user
                         console.log('-------------------userrrrrr',user);
            console.log('OTP verified successfully !!!');
            res.redirect('/home')
             //res.status(200).json({success:true,message:'otp successfull'});
        
        }
         else {
            
            console.error('Failed to verify OTP');
            res.render('otppage',{message:"Invalid OTP. Please try again."});
        }
    } catch (error) {
        console.error('Error verifying OTP:', error.message);
        res.status(500).send('Error verifying OTP');
    }
}


const loadhome = async (req, res) => {
    try {
         const productdata=await product.find({})
    
    const loggedin = req.session.user
    
    console.log(loggedin,"from the home ");

    const cart = await Cart.findOne({ user_id:loggedin });
    const cartCount = cart ? cart.items.length : 0;
    const wishlist = await Wish.findOne({ userId:loggedin})
    const wishcount = wishlist? wishlist.product.length : 0;

    console.log(cartCount,"cart count is here");
    console.log("hello its me user",loggedin);
        res.render('home',{products:productdata,loggedin,cartCount,wishcount})
        console.log('Rendering home page');
        // res.render('home');
    } catch (error) {
        console.error('Error rendering home page:', error.message);
        res.status(500).send('Internal Server Error');
    }
}

const sendOTP = async (req,res) => {
    try {
        console.log("email is here for otp",req.body);
              
let email=req.body.email
console.log(email);
        const otp = await OTP.generateAndSaveOTP(email);
console.log("hlo it is otp page here");
       
        const mailOptions = {
            from: process.env.email,
            to: email,
            subject: 'Your OTP for Signup',
            text: `Your OTP for signup is: ${otp}`
        };

        await transporter.sendMail(mailOptions);
         res.status(200).json({ success: true, message: 'OTP sent successfully' });
         console.log('OTP sent successfully to', email);
        
        
    } catch (error) {
        console.error('Error sending OTP:', error);
       
    }
};
const resendOTP = async (req, res) => {
    try {
        
        let userId = req.session.email
        console.log(userId,"tfghgjj");

        
        const otp = await OTP.resendOTP(userId);
        console.log(otp,"new");
        if (!otp) {
            return res.status(500).send('Error generating OTP');
        }

        const mailOptions = {
            from: process.env.email,
            to: userId,
            subject: 'Your OTP for Signup',
            text: `Your OTP for signup is: ${otp}`
        };

        await transporter.sendMail(mailOptions);
        // res.status(200).send('OTP resent successfully');
        // console.log("OTP resent successfully");
        
       

    } catch (error) {
        console.error('Error resending OTP:', error);
        res.status(500).send('Error resending OTP');
    }
};

const loginload = async(req,res)=>{
    try{
        if(req.session.user){
            res.redirect('/home')
        }
        else{
     res.render('login')
        }
    }catch(error){
      console.log(error.message);
    }
}

const verifilogin = async(req,res)=>{
    try{
        console.log("data");
    const {email,password} = req.body;
      const user = await User.findOne({email})
      if(!user){
        return res.render('login',{error:"invalid email or pssword"})
      }
      const passwordvalid = await bcrypt.compare(password,user.password)
      if(!passwordvalid){
        return res.render('login',{error:"invalid email or password"})
      }
      if (user.Block) {
        return res.render('login', {message: "Your account is blocked.." });
    }
    // if(passwordvalid&&user.Block===false){
      req.session.user=user;
      res.redirect('/home')
    // }
    }catch(error){
        console.log(error.message);
    }
}

const logout =async (req,res)=>{
    try {
         req.session.destroy()
         res.redirect('/')
    } catch (error) {
     console.log(error.message);   
    }
}
const productdetails = async(req,res)=>{
    try {
        res.render('product-details')
    } catch (error) {
        console.log(error.message);
    }
}

const googleauth = async (req, res) => {
    try {
        const googleUser = req.user;
        const email = googleUser.emails[0].value;
        const user = await User.findOne({ email });
        if (!user) {
            return res.redirect('/signup');
        }
        req.session.user = user;
        res.redirect('/home');
    } catch (error) {
        console.error('Error during Google authentication:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const productdet = async (req, res) => {
    try {
        const user = req.session.user;
        const productid = req.params.id;
        const productdata = await product.findOne({ _id: productid }).populate('category') .populate('reviews.user', 'name');
        console.log(productdata.category, typeof productdata.category, "Category Data for the Product");
        const relatedProducts = await product.find({ category: productdata.category._id,_id: { $ne: productid }}).limit(4);
        console.log(relatedProducts,"related products is here");
        const cart = await Cart.findOne({ user_id: user });
        const cartCount = cart ? cart.items.length : 0;
        const wishlist = await Wish.findOne({ userId: user });
        const wishcount = wishlist ? wishlist.product.length : 0;
        const categorydata = productdata.category ? productdata.category : {};
        const productURL = `https://tempusgems.online/product-details/${productid}`
        res.render('product-details', { products: productdata, category: categorydata, cartCount, wishcount,relatedProducts,productURL });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const displayAllProducts = async (req, res) => {
    try {
        const loggedin = req.session.user;
        const cart = await Cart.findOne({ user_id: loggedin });
        const cartCount = cart ? cart.items.length : 0;
        const wishlist = await Wish.findOne({ userId: loggedin });
        const wishcount = wishlist ? wishlist.product.length : 0;

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page, 10);
        }
        const limit = 6;

        const category = await Category.find();

        const { categoryId, sortByPrice, sortByName, search } = req.query;
        let sortCriteria = {};

        if (sortByPrice) {
            sortCriteria.price = sortByPrice === 'price_asc' ? 1 : -1;
        }

        if (sortByName) {
            sortCriteria.name = sortByName === 'name_asc' ? 1 : -1;
        }

        const query = {
            ...(categoryId && { category: categoryId }),
            ...(search && { name: { $regex: ".*" + search + ".*", $options: 'i' } })
        };

        const productCount = await product.countDocuments(query);
        const totalPages = Math.ceil(productCount / limit);

        const products = await product.find(query)
            .sort(sortCriteria)
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        res.render('shop', { 
            products, 
            category, 
            sortByPrice, 
            sortByName, 
            search, 
            categoryId,
            totalPages, 
            currentPage: page,
            cartCount,
            wishcount 
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const forgotpassword = async (req, res) => {
    console.log("hi from forgetpassword");
    try {
      const email = req.body.email;
      console.log("hi from forget", email);
      const userData = await User.findOne({ email: email });
  
      if (userData) {
        const randomstring = randomString.generate();
        await User.updateOne({ email: email }, { $set: { token: randomstring } });
        await resendpassword(userData.name, userData.email, randomstring);
        console.log(userData.name, "");
  
        res.render('forgotpassword', { message: "Please check your email for password reset instructions." });
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      console.error(error.message);
      res.status(404).send({ success: false, message: "User not found" });
    }
  };


const forgotpasswordpage = async(req,res)=>{
    try {
        res.render('forgotpassword')
    } catch (error) {
       console.log(error.message); 
    }
}

const resetPasswordPage = async (req, res) => {
    const token = req.query.token;
    res.render('resetpassword', { token });
};

const resetPassword = async (req, res) => {
    try {
        const { token, newpassword, confirmpassword } = req.body;

        console.log(req.body,"from the reset password");

        if (newpassword !== confirmpassword) {
            return res.status(400).send({ success: false, message: 'Passwords do not match' });
        }

        const user = await User.findOne({ token });

        if (!user) {
            return res.status(404).send({ success: false, message: 'Invalid token' });
        }

        const hashedPassword = await bcrypt.hash(newpassword, 10);
        user.password = hashedPassword; 
        user.token = undefined; 
        await user.save();
        res.redirect('/')
        // res.status(200).send({ success: true, message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Server error' });
    }
};

const searchProduct = async (req, res) => {
    try {
        const user = req.session.user;
        const search = req.body.search || req.query.search;
        const { sortByPrice, sortByName, categoryId } = req.query;
        const cart = await Cart.findOne({ user_id: user });
        const cartCount = cart ? cart.items.length : 0;
        let sortCriteria = {};
        if (sortByPrice) {
            sortCriteria.price = sortByPrice === 'price_asc' ? 1 : -1;
        }
        if (sortByName) {
            sortCriteria.name = sortByName === 'name_asc' ? 1 : -1;
        }

        let page = parseInt(req.query.page, 10) || 1;
        const limit = 6;
        const wishlist = await Wish.findOne({ userId: user });
        const wishcount = wishlist ? wishlist.product.length : 0;

        const query = {
            ...(categoryId && { category: categoryId }),
            ...(search && { name: { $regex: ".*" + search + ".*", $options: 'i' } })
        };

        const productCount = await product.countDocuments(query);
        const totalPages = Math.ceil(productCount / limit);

        const productdata = await product.find(query)
            .sort(sortCriteria)
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const category = await Category.find();

        res.render('shop', { 
            products: productdata, 
            category, 
            sortByPrice, 
            sortByName, 
            search, 
            categoryId,
            totalPages, 
            currentPage: page,
            cartCount,
            wishcount
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};


const addWishlist = async (req, res) => {
    try {
        const user = req.session.user;
        const productId = req.query.id;

        
        let wishlist = await Wish.findOne({ userId: user });

        if (!wishlist) {
            wishlist = new Wish({ userId: user, product: [] });
        }

        
        const existingProductIndex = wishlist.product.findIndex(item => item.productId.toString() === productId);

        if (existingProductIndex !== -1) {
      
            wishlist.product[existingProductIndex].quantity += 1;
        } else {
         
            wishlist.product.push({ productId, quantity: 1 });
        }

    
        await wishlist.save();
        res.redirect('/wishlist');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const getWishlist = async (req, res) => {
    try {
        const user = req.session.user;

       
        const wishlist = await Wish.findOne({ userId: user }).populate('product.productId');
        const wishlists = await Wish.findOne({ userId:user})
        const wishcount = wishlist? wishlist.product.length : 0;

        res.render('wishlist', { wishlist , wishcount});
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};
const deletewishlist = async (req, res) => {
    try {
        // console.log("controller is here for the delete");
        const user = req.session.user;
        const { productId } = req.body;

        const wishlist = await Wish.findOne({ userId: user });

        if (!wishlist) {
            console.log("no wishlist found");
            return res.status(404).send("Wishlist not found");
        }

        const productIndex = wishlist.product.findIndex((item) => item.productId.toString() === productId);
        if (productIndex !== -1) {
            wishlist.product.splice(productIndex, 1);
            await wishlist.save();
            return res.status(200).send("success");
        } else {
            return res.status(404).send("Product not found in wishlist");
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).send("Internal Server Error");
    }
};

const referal = async (req, res) => {
    try {
        const { referralCode } = req.body;
        const userId = req.session.user._id;

        const referraduser = await User.findOne({ referralCode });

        if (!referraduser) {
            return res.json({ success: false, message: "Invalid referral code" });
        }
        if (referraduser._id.toString() === userId.toString()) {
            return res.json({ success: false, message: "You cannot use your own referral code" });
        }

        const user = await User.findById(userId);
        if (user.alreadyreferred) {
            return res.json({ success: false, message: "Referral code already used" });
        }
        user.alreadyreferred = true;
        await user.save();

       
        let referraduserWallet = await Wallet.findOne({ userId: referraduser._id });
        if (!referraduserWallet) {
            referraduserWallet = new Wallet({ userId: referraduser._id, balance: 0, history: [] });
        }
        referraduserWallet.balance += 100;
        referraduserWallet.history.push({
            amount: 100,
            type: 'credit'
        });
        await referraduserWallet.save();

       
        let userWallet = await Wallet.findOne({ userId });
        if (!userWallet) {
            userWallet = new Wallet({ userId, balance: 0, history: [] });
        }
        userWallet.balance += 100;
        userWallet.history.push({
            amount: 100,
            type: "credit"
        });
        await userWallet.save();

        res.json({ success: true, message: "Referral code applied successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const addProductReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        console.log(req.body,"the body for the review");
        const productId = req.params.id;
        console.log('req.user:', req.user);
        const Product = await product.findById(productId);
     console.log(Product,"this is the product");
        if (Product) {
            const alreadyReviewed = Product.reviews.find(
                (r) => r.user.toString() === req.user._id.toString()
            );
         console.log("hiii this ");
            if (alreadyReviewed) {
                return res.status(400).json({ message: 'Product already reviewed' });
            }

            const review = {
                name: req.user.name,
                rating: Number(rating),
                comment,
                user: req.user._id,
            };
          console.log("hello this ");
            Product.reviews.push(review);
            Product.numReviews = Product.reviews.length;
            Product.rating =
                Product.reviews.reduce((acc, item) => item.rating + acc, 0) /
                Product.reviews.length;

            await Product.save();
            // res.status(200).send({ message: 'Review added' });
            res.redirect(`/product-details/${productId}`);
        } else {
            res.status(404).send({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

module.exports = {
    loadregister,
    insertUser,
    loadhome,
    sendOTP,
    googleauth,
    resendOTP,
    loginload,
    verifilogin,
    logout,
    productdetails,
    productdet,
    loadotppage,
    otpverify,
    displayAllProducts,
    forgotpassword,
    resendpassword,
    forgotpasswordpage,
    resetPasswordPage,
    resetPassword,
    searchProduct,
    addWishlist,
    getWishlist,
    deletewishlist,
    referal,
    addProductReview,
    
};
