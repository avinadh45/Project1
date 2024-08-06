const express = require('express');
const router = express.Router();
const session = require("express-session");
const path = require('path');
const bodyparser = require("body-parser");
const passport = require("passport")
require('../passport')
const User = require('../model/usermodel')
const usercontroller = require('../controller/usercontroller');
const userprofilecontroller = require('../controller/user-profilecontroller');
const cartcontroller = require('../controller/cartcontroller');
const ordercontroller = require('../controller/order-controller');
const auth = require('../middleware/auth');

// router.use(passport.initialize())
// router.use(passport.session())

router.use(session({
    secret: process.env.secret,
    resave: false,
    saveUninitialized: false
}));


router.use(express.json());
router.use(bodyparser.urlencoded({ extended: true }));

// router.set('view engine', 'ejs');
// router.set('views', './views/user');

router.use(express.static('public'));
router.use(express.static(path.join(__dirname, 'public/assets')));

router.use(passport.initialize())
router.use(passport.session())

router.get('/', usercontroller.loadhome);
router.get('/login/google',passport.authenticate('google',{scope:['email','profile']}))
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), usercontroller.googleauth);
router.get('/register', auth.isLogout, usercontroller.loadregister);
router.post('/register', usercontroller.insertUser);
router.get('/otppage', usercontroller.loadotppage);
router.post('/OTPverify', usercontroller.otpverify);
router.post('/send-otp', usercontroller.sendOTP);
router.post('/resend-otp', usercontroller.resendOTP);
router.get('/login', usercontroller.loginload);
router.post('/login', usercontroller.verifilogin);
router.get('/home', auth.userblocked, auth.isLogin, usercontroller.loadhome);
router.get('/logout', auth.userblocked, auth.isLogin, usercontroller.logout);
router.get('/product-details/:id', auth.isLogin, auth.userblocked, usercontroller.productdet);
router.get('/shop', auth.isLogin, auth.userblocked, usercontroller.displayAllProducts);
router.get('/user-profile', auth.isLogin, auth.userblocked, userprofilecontroller.getprofile);
router.get('/user-address', auth.isLogin, auth.userblocked, userprofilecontroller.getaddress);
router.put('/updateprofile', auth.isLogin, auth.userblocked, userprofilecontroller.updateprofile);
router.post('/user-address', auth.isLogin, auth.userblocked, userprofilecontroller.addaddress);
router.get('/updateAddress', auth.isLogin, auth.userblocked, userprofilecontroller.editaddress);
router.post('/updateAddress', auth.isLogin, auth.userblocked, userprofilecontroller.updateAddress);
router.get('/deleteaddress', auth.isLogin, auth.userblocked, userprofilecontroller.deleteaddress);
router.post('/addtocart', auth.isLogin, auth.userblocked, cartcontroller.addtocart);
router.get('/cart', auth.isLogin, auth.userblocked, cartcontroller.getcart);
router.delete('/deletcart', auth.isLogin, auth.userblocked, cartcontroller.cartdelete);
router.get('/checkout', auth.isLogin, auth.userblocked, cartcontroller.checkout);
router.post('/updatecart', auth.isLogin, auth.userblocked, cartcontroller.updatecart);
router.post('/place-order', auth.isLogin, auth.userblocked, ordercontroller.order);
router.get('/forgotpasswordpage', usercontroller.forgotpasswordpage);
router.post('/forgotpasswordpage', usercontroller.forgotpassword);
router.get('/resetpassword', usercontroller.resetPasswordPage);
router.post('/resetPassword', usercontroller.resetPassword);
router.get('/changepassword', auth.isLogin, auth.userblocked, userprofilecontroller.loadchangepassword);
router.post('/changepassword', auth.isLogin, auth.userblocked, userprofilecontroller.changePassword);
router.get('/search', auth.isLogin, auth.userblocked, usercontroller.searchProduct);
router.get('/orderdetails', auth.isLogin, auth.userblocked, userprofilecontroller.orderdetails);
router.post('/cancel-order/:id', auth.isLogin, auth.userblocked, userprofilecontroller.cancelOrder);
router.post('/return-order/:orderId', auth.isLogin, auth.userblocked, userprofilecontroller.returnorder);
router.get('/wishlist', auth.isLogin, auth.userblocked, usercontroller.getWishlist);
router.get('/add-to-wishlist', auth.isLogin, auth.userblocked, usercontroller.addWishlist);
router.post('/addreview/:id/review',auth.isLogin,auth.userblocked,usercontroller.addProductReview)
router.delete('/deletewhishlist', auth.isLogin, auth.userblocked, usercontroller.deletewishlist);
router.post('/verifyrazorpay', auth.isLogin, ordercontroller.verifyrazorpay);
router.post('/applycoupon', auth.isLogin, auth.userblocked, ordercontroller.applycoupon);
router.post('/removecoupon', auth.isLogin, auth.userblocked, ordercontroller.removecoupon);
router.post('/addtowallet', auth.isLogin, auth.userblocked, userprofilecontroller.Addwallet);
router.post('/verify-payment', auth.isLogin, auth.userblocked, userprofilecontroller.verifyPaymentAndAddToWallet);
router.get('/order-success/:orderId', auth.isLogin, auth.userblocked, ordercontroller.OrderSuccess);
router.get('/retry-payment', auth.isLogin, auth.userblocked, ordercontroller.retryPayment);
router.get('/download-invoice/:orderid', auth.isLogin, auth.userblocked, userprofilecontroller.invoicedownload);
router.post('/applyReferral', auth.isLogin, auth.userblocked, usercontroller.referal);
router.delete('/remove-product',auth.isLogin,ordercontroller.deletesingleproduct)

// router.get('*', (req, res) => {
//     res.status(404).render('404');  
// })
// router.get('*',usercontroller.unknown)


module.exports = router;
