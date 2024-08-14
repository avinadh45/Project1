const express = require('express')
const adminRoute = express.Router();
const session = require("express-session")
const path = require('path')
 const admincontroller = require('../controller/admincontroller')
 const procontroller = require('../controller/productcontroller')
 const catcontroller = require('../controller/category-controller')
adminRoute.use(session({
    secret: process.env.secret,
    resave: false,
    saveUninitialized: false
}))
const auth = require('../middleware/admin.auth')
const bodyparser = require("body-parser");
const { userInfo } = require('os')
adminRoute.use(express.json());
adminRoute.use(bodyparser.urlencoded({extended:true}))
const multer = require("multer")
const { error } = require('console')
// const adminController = require('../controller/admincontroller')
// adminRoute.set('view engine','ejs');
// adminRoute.set('views','./views/admin')
//  userRoute.use(express.static( 'public'))
 adminRoute.use(express.static('public'))
 
 const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
     cb(null,path.join(__dirname,'../public/productimage'),function(err,success){
        if(err){
            throw err
        }
     })
    },
    filename:function(req,file,cb){
       const name = Date.now()+'-'+file.originalname;
       cb(null,name,function(error,success){
            if(error){
               throw error
            }
       });
    }
 });
const upload = multer({storage:storage})


adminRoute.use( express.static(path.join(__dirname, 'public/assets')))
adminRoute.get('/',auth.isLogout,admincontroller.adminload)
adminRoute.post('/adminlogin',auth.isLogout,admincontroller.verifylogin)
adminRoute.get('/adminhome',auth.isLogin,admincontroller.adminhome)
adminRoute.get('/admin-category',auth.isLogin,catcontroller.adcategory)
adminRoute.get('/user-details',auth.isLogin,admincontroller.userdetails)
adminRoute.patch('/blockuser',admincontroller.blockuser)
adminRoute.patch('/unblockuser',admincontroller.unblockuser)
adminRoute.get('/logout',auth.isLogin,admincontroller.logout)
adminRoute.get('/products',auth.isLogin,procontroller.productpage)
adminRoute.get('/productlist',auth.isLogin,procontroller.productlist)
adminRoute.post('/addProduct',upload.array('image',4),procontroller.addProduct)  
adminRoute.post('/addcategory',catcontroller.addcategory)
adminRoute.get('/getcategory',auth.isLogin,catcontroller.getcategory)
adminRoute.put('/editcategory',auth.isLogin,catcontroller.editcategory)
adminRoute.delete('/deletecategory/:id',auth.isLogin,catcontroller.deletecategory)
adminRoute.patch('/list',catcontroller.list)
adminRoute.patch('/unlist',catcontroller.unlist)
adminRoute.get('/deleteproduct/:id',auth.isLogin,procontroller.deleteproduct)
adminRoute.get('/editproduct/:id',auth.isLogin,procontroller.editpropage)
adminRoute.post('/updateproduct/:id',upload.array('image',3),procontroller.updateProduct)
adminRoute.get('/getProductData',auth.isLogin,procontroller.getproductdata)
adminRoute.patch('/listproduct',procontroller.listProduct)
adminRoute.patch('/unlistproduct',procontroller.unlistProduct)
adminRoute.post('/deleteimage',auth.isLogin,procontroller.deleteSingleImage)
adminRoute.get('/order',auth.isLogin,admincontroller.order)
adminRoute.get('/order-details',auth.isLogin,admincontroller.orderdetails)
adminRoute.patch('/updatestatus',auth.isLogin,admincontroller.updateorder)
adminRoute.get('/coupon',auth.isLogin,admincontroller.listcoupon)
adminRoute.post('/addcoupon',auth.isLogin,admincontroller.addcoupon)
adminRoute.delete('/deletecoupon',auth.isLogin,admincontroller.deletecoupon)
adminRoute.get('/editcoupon',auth.isLogin,admincontroller.couponupdatepage)
adminRoute.post('/updatecoupon',auth.isLogin,admincontroller.updatecoupon)
adminRoute.get('/sales-report',auth.isLogin,admincontroller.salesreport)
adminRoute.get('/sales-weekly',auth.isLogin,admincontroller.weeklysales)
adminRoute.get('/sales-monthly',auth.isLogin,admincontroller.monthlysales)
adminRoute.get('/sales-yearly',auth.isLogin,admincontroller.yearlysales)
adminRoute.get('/sales-all',auth.isLogin,admincontroller.getAllDeliveredOrders)
adminRoute.post('/salesreportsearch',auth.isLogin,admincontroller.getCustomSales)
adminRoute.get('/sales-daily',auth.isLogin,admincontroller.dailySales)
adminRoute.get('/offer',auth.isLogin,admincontroller.adminoffer)
adminRoute.post('/offercreate',auth.isLogin,admincontroller.addoffer)
adminRoute.post('/removeoffer',auth.isLogin,admincontroller.removeoffer)
adminRoute.post('/addcategoryoffer',auth.isLogin,catcontroller.categoryoffer)
adminRoute.post('/removecategoryoffer',auth.isLogin,catcontroller.removeoffer)
adminRoute.get('/download-pdf',auth.isLogin,admincontroller.downloadpdf)
adminRoute.get('/download-excel',auth.isLogin,admincontroller.downloadexcel)
adminRoute.get('/saleschart',auth.isLogin,admincontroller.saleschart)
adminRoute.get('/revenuechart',auth.isLogin,admincontroller.revenueChart)
adminRoute.get('/best-selling-products',auth.isLogin,admincontroller.bestsellingproduct)
adminRoute.get('/return-product',auth.isLogin,admincontroller.getCancelledOrders)
adminRoute.get('/accept-request',auth.isLogin,admincontroller.accept)
adminRoute.post('/processing-return',auth.isLogin,admincontroller.acceptReturnRequest)
adminRoute.get('/reject-order',auth.isLogin,admincontroller.reject)

// adminRoute.get('*',auth.isLogin,admincontroller.admin404)
// adminRoute.get('/combinedchart',auth.isLogin,admincontroller.combinedChart)
// adminRoute.get('*',(req,res)=>{
//    res.render('404admin')
// })

 module.exports=adminRoute