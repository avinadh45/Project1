const session = require("express-session");
const user = require("../model/usermodel");
const Order = require("../model/ordermodel")
const product = require("../model/productmodel")
const Wallet = require('../model/walletmodel')
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Address = require('../model/addressmodel')
const Coupon =  require('../model/couponmodel')
const Category = require('../model/categorymodel')
const PDFDocument = require('pdfkit-table')
const ExcelJS = require('exceljs');
const moment = require('moment');
const { json } = require("body-parser");
const securedpassword = async (password) => {
  try {
    const hashedpassword = await bcrypt.hash(password, 10);
    return hashedpassword;
  } catch (error) {
    console.log(error.message);
  }
};
const adminload = async (req, res) => {
  console.log("admin");
  try {
    res.render("adminlogin");
  } catch (error) {
    console.log(error.message);
  }
  console.log("admin is in login page");
};
// console.log("exit from");
const verifylogin = async (req, res) => {
  console.log("data is here");
  try {
    console.log("data is there");
    const email = req.body.email;
    const password = req.body.password;

    const userData = await user.findOne({ email, isAdmin:  true });

    if (userData) {
      const isPasswordValid = await bcrypt.compare(password, userData.password);

      if (isPasswordValid) {
  
        req.session.user_id = userData._id;
        if (req.session.user_id) {
          return res.redirect("/admin/adminhome");
        }
      }
    }


    res.render("adminlogin", { message: "Email and password are incorrect" });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};



const adminhome = async (req, res) => {
  try {
    console.log("Rendering admin home");

    const topsellingproduct = await bestsellingproduct();
    const topsellingcategory = await bestsellingcategory()
     const orders = await Order.find({Order_verified:true})
     const products = await product.find({Verified:true})
    const revenue = await getRevenueData()
     
    res.render("adminhome",{
       topsellingproduct,
       topsellingcategory,
       revenue,
       orders,
       products
       });
  } catch (error) {
    console.log(error.message);
  }
};

const userdetails = async (req, res) => {
  try {
    const userData = await user.find({ isAdmin: 0 });
    
    res.render("user-details", { user: userData });
  } catch (error) {
    console.log(error.message);
  }
};

const blockuser = async (req, res) => {
  try {
    console.log("user blocked");
    console.log(req.query.id, "my blocking");
    const userdata = await user.findOneAndUpdate(
      { _id: req.query.id },
      {
        $set: {
          Block: true,
        },
      }
    );
    console.log("you are blocke");
    return res.status(200).json({
      success: true,
      // msg:error.message
    });
  } catch (error) {
    console.log(error.message);
  }
};
const unblockuser = async (req, res) => {
  try {
    // console.log('unblocked');
    console.log(req.query.id, "i am unblocking the user");
    const userdata = await user.findOneAndUpdate(
      { _id: req.query.id },
      {
        $set: {
          Block: false,
        },
      }
    );
    console.log("you aare unblocked");
    return res.status(200).json({
      success: true,
      // mEsg:error.message
    });
  } catch (error) {
    console.log(error.message);
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/admin");
  } catch (error) {
    console.log(error.message);
  }
};

const admin404 = async(req,res)=>{
  try {
    res.render('404admin')
  } catch (error) {
    // console.log(error.message);
  }
  }

  const order = async (req, res) => {
    try {
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page, 10);
        }
        const limit = 5;

        const filter = req.query.filter || 'latest';
        let sortOrder = -1;

     
        let filterCondition = { Order_verified: true };
        
        
        if (filter === 'oldest') {
            sortOrder = 1; 
        } else if (['Pending', 'Delivered', 'Cancelled', 'Confirmed'].includes(filter)) {
            filterCondition.status = filter; 
        }

        const orderCount = await Order.countDocuments(filterCondition);
        const totalPages = Math.ceil(orderCount / limit);

        const orderData = await Order.find(filterCondition)
            .sort({ placed: sortOrder })  
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const userdata = await user.find({ isAdmin: 0 });

        res.render('order', {
            orders: orderData,
            users: userdata,
            totalPages,
            currentPage: page,
            filter  
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};



const orderdetails = async(req,res)=>{
  // console.log("controller is here");
  try {
    {
      const orderid=req.query.id
     
     
      const orderData=await Order.findById(orderid)
      
      const userdata=await user.findById(orderData.userId)
     
      const address = await Address.find({userId:orderData.userId})
      // console.log(address,"this is the addresss for the user");
 
      const productIds = orderData.product.map(product => product.product);

      
      const productdata = await product.find({ _id: { $in: productIds } });
  
      res.render('order-details',{user:userdata,orders:orderData,product:productdata,address})
    
    }
    
  } catch (error) {
    console.log(error.message);
  }
}

const updateorder = async (req, res) => {

  console.log("hi from status");
  try {
    const { orderID, newStatus } = req.body;

    if (!orderID || !newStatus) {
      return res.status(400).json({ success: false, message: 'Order ID and new status are required' });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderID },
      { status: newStatus },
      { new: true }
    );

    if (newStatus === 'Cancelled' && updatedOrder) {
      for (const productItem of updatedOrder.products) {
        const productId = productItem.product;
        const quantity = productItem.quantity;

        const product = await product.findById(productId);

        if (product) {
          product.stock += quantity;
          await product.save();
        }
      }
    } else if (newStatus === 'Delivered' && updatedOrder) {
      await Order.findOneAndUpdate(
        { _id: orderID },
        { $set: { paymentstatus: 'paid' } }
      );
    }

    res.status(200).json({ success: true, updatedOrder });
  } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Error updating order status' });
  }
}

const listcoupon = async(reqq,res)=>{
  try {
      const coupons = await Coupon.find({})
      res.render('coupon',{coupons})
  } catch (error) {
    
  }
}


const addcoupon = async (req, res) => {
  try {
      const { couponName, couponCode, usagecount, Description, expirationTime, offer, MinimumAmount } = req.body;

      let errorMessage = '';

      if (!couponName || !couponCode || !usagecount || !Description || !expirationTime || !offer || !MinimumAmount) {
          errorMessage = 'All fields are required.';
          
      } else if (isNaN(usagecount) || usagecount <= 0) {
          errorMessage = 'Usage count must be a positive number.';
      } else if (new Date(expirationTime) < new Date()) {
          errorMessage = 'Expiration time must be a future date.';
      } else if (isNaN(offer) || offer <= 0) {
          errorMessage = 'Offer must be a positive number.';
      } else if (isNaN(MinimumAmount) || MinimumAmount <= 0) {
          errorMessage = 'Minimum amount must be a positive number.';
      }
      const existingCoupon = await Coupon.findOne({ couponCode: new RegExp(`^${couponCode}$`, 'i') });
          console.log(existingCoupon,"this is the existing coupon");
          if (existingCoupon) {
             errorMessage = 'Coupon code already exists.';
        }

      if (errorMessage) {
        const coupons = await Coupon.find({});
          return res.status(400).render('coupon', { errorMessage ,coupons});
      }
      
      const coupon = new Coupon({
          couponCode: couponCode,
          couponName: couponName,
          usagecount: usagecount,
          Description: Description,
          expirationTime: expirationTime,
          offer: offer,
          MinimumAmount: MinimumAmount
      });
      await coupon.save();

      
      res.redirect('/admin/coupon');

  } catch (error) {
      console.error("Error adding coupon:", error);
      res.status(500).send("Internal Server Error");
  }
};
 
const deletecoupon = async(req, res) => {
  try {
    const couponid = req.query.id;
    console.log(couponid, "for the deleting");
    const coupondelete = await Coupon.findOneAndDelete({ _id: couponid });

    if (!coupondelete) {
      console.log("Coupon not found");
      return res.status(404).send("Coupon not found");
    }

    console.log(coupondelete, "this is deleted");
    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.log("Error in deletion:", error.message);
    res.status(500).send("Error in the delete");
  }
}

const couponupdatepage = async(req,res)=>{
   try {
       const coupons = req.query.id
       const coupon = await Coupon.findOne({_id:coupons})
       if(!coupon){
         res.status(404).send("no coupon found")
       }
       res.render('editcoupon',{coupon})
   } catch (error) {
    
   }
}

const updatecoupon = async(req,res)=>{
  try {
     const couponid = req.query.id
     const {couponName,couponCode,usagecount,Description,expirationTime,offer,MinimumAmount} = req.body
     const existingCoupon = await Coupon.findOne({ 
      couponCode: new RegExp(`^${couponCode}$`, 'i'), 
      _id: { $ne: couponid } 
    });

    if (existingCoupon) {
      
      const coupons = await Coupon.find({});
      return res.status(400).render('coupon', { errorMessage: 'Coupon code already exists.', coupons });
    }
     const couponData = await Coupon.findByIdAndUpdate({_id:couponid},{$set:{
      couponName:couponName,
      couponCode:couponCode,
      usagecount:usagecount,
      Description:Description,
      expirationTime:expirationTime,
      offer:offer,
      MinimumAmount:MinimumAmount
     }})
     if(couponData){
      res.redirect('/admin/coupon')
     }
  } catch (error) {
       console.log(error.message);
  }
}

const salesreport = async (req, res) => {
  try {
      const page = parseInt(req.query.page, 10) || 1;
      const pagelimit = 6;
      
      
      const { category = 'all', timeRange = 'Yearly' } = req.query;
      console.log(req.query,"this is the query");

    
      let startDate, endDate = new Date();

      if (timeRange === 'Weekly') {
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); 
      } else if (timeRange === 'Monthly') {
          startDate = new Date();
          startDate.setMonth(endDate.getMonth() - 1); 
      } else if (timeRange === 'Yearly') {
          startDate = new Date();
          startDate.setFullYear(endDate.getFullYear() - 1); 
      } else if (timeRange === 'custom') {
          startDate = new Date(req.query.startDate); 
          endDate = new Date(req.query.endDate); 
      } else {
          startDate = new Date(0); 
      }

      const filter = {
          status: "Delivered",
          paymentstatus: "paid",
          placed: { $gte: startDate, $lte: endDate },
          ...(category && mongoose.Types.ObjectId.isValid(category) && category !== 'all'
              ? { 'product.category': new mongoose.Types.ObjectId(category) }
              : {})
      };

      const numberOfOrders = await Order.countDocuments(filter);
      const totalPages = Math.ceil(numberOfOrders / pagelimit);
      const validPage = Math.min(Math.max(page, 1), totalPages);
      const skip = (validPage - 1) * pagelimit;

      const orders = await Order.find(filter)
          .sort({ placed: -1 }) 
          .skip(skip)
          .limit(pagelimit)
          .lean();

      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.json({
              orders,
              totalPages,
              currentPage: validPage,
          });
      }

      const userData = await user.findOne({ _id: req.session.user_id });
      const categories = await Category.find();

      
      res.render('sales-report', {
          username: userData ? userData.name : 'Guest',
          orders,
          totalPages,
          currentPage: validPage,
          categories,
          category,
          totalOrders: numberOfOrders,
          timeRange, 
      });

  } catch (error) {
      console.error('Error in salesreport function:', error.message);
      res.status(500).send('Server Error: ' + error.message);
  }
};





const weeklysales = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pagelimit = 6;
    
    const startOfWeek = moment().startOf('week').toDate();
    const endOfWeek = moment().endOf('week').toDate();
    
    const category = req.query.category || 'all';
    
    let productIds = [];
    if (category !== 'all') {
      const products = await product.find({ category: new mongoose.Types.ObjectId(category) });
      productIds = products.map(product => product._id);
    }

    const filter = {
      placed: { $gte: startOfWeek, $lte: endOfWeek },
      status: "Delivered",
      paymentstatus:"paid",
    };
    
    if (productIds.length > 0) {
      filter['product.product'] = { $in: productIds };
    }

   
    const numberOfOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(numberOfOrders / pagelimit);
    const validPage = Math.min(Math.max(page, 1), totalPages);

    const skip = (validPage - 1) * pagelimit;

    
    const weeklyOrders = await Order.find(filter)
      .sort({ placed: -1 })
      .skip(skip)
      .limit(pagelimit);

    res.json({
      orders: weeklyOrders,
      totalPages,
      currentPage: validPage,
    });
  } catch (error) {
    console.error("Error retrieving weekly sales:", error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const dailySales = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pagelimit = 6;

    const startOfDay = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();

    const category = req.query.category || 'all';
    let productIds = [];

    if (category !== 'all') {
      const products = await product.find({ category: new mongoose.Types.ObjectId(category) });
      productIds = products.map(product => product._id);
    }

    const filter = {
      placed: { $gte: startOfDay, $lte: endOfDay },
      status: "Delivered",
      paymentstatus: "paid",
    };

    if (productIds.length > 0) {
      filter['product.product'] = { $in: productIds };
    }

  
    const numberOfOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(numberOfOrders / pagelimit);
    const validPage = Math.min(Math.max(page, 1), totalPages);

    const skip = (validPage - 1) * pagelimit;

    const dailyOrders = await Order.find(filter)
      .sort({ placed: -1 })
      .skip(skip)
      .limit(pagelimit);

    res.json({
      orders: dailyOrders,
      totalPages,
      currentPage: validPage,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const monthlysales = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pagelimit = 6;

    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();
    
    const category = req.query.category || 'all';
    let productIds = [];
    
    if (category !== 'all') {
      const products = await product.find({ category: new mongoose.Types.ObjectId(category) });
      productIds = products.map(product => product._id);
    }

    const filter = {
      placed: { $gte: startOfMonth, $lte: endOfMonth },
      status: "Delivered",
      paymentstatus:"paid",
    };
    
    if (productIds.length > 0) {
      filter['product.product'] = { $in: productIds };
    }

    
    const numberOfOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(numberOfOrders / pagelimit);
    const validPage = Math.min(Math.max(page, 1), totalPages);

    const skip = (validPage - 1) * pagelimit;

    const monthOrders = await Order.find(filter)
      .sort({ placed: -1 })
      .skip(skip)
      .limit(pagelimit);

    res.json({
      orders: monthOrders,
      totalPages,
      currentPage: validPage,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const yearlysales = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pagelimit = 6;

    const startOfYear = moment().startOf('year').toDate();
    const endOfYear = moment().endOf('year').toDate();

    const category = req.query.category || 'all';
    let productIds = [];

    if (category !== 'all') {
      const products = await product.find({ category: new mongoose.Types.ObjectId(category) });
      productIds = products.map(product => product._id);
    }

    const filter = {
      placed: { $gte: startOfYear, $lte: endOfYear },
      status: "Delivered",
      paymentstatus: "paid",
    };

    if (productIds.length > 0) {
      filter['product.product'] = { $in: productIds };
    }

  
    const numberOfOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(numberOfOrders / pagelimit);
    const validPage = Math.min(Math.max(page, 1), totalPages);

    const skip = (validPage - 1) * pagelimit;

    const yearlyOrders = await Order.find(filter)
      .sort({ placed: -1 })
      .skip(skip)
      .limit(pagelimit);

    res.json({
      orders: yearlyOrders,
      totalPages,
      currentPage: validPage,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



const getAllDeliveredOrders = async (req, res) => {
  try {
      const allDeliveredOrders = await Order.find({
          status: "Delivered",
          paymentstatus:"paid",
      }).sort({ placed: -1 });

      // console.log("From the backend - All Delivered Orders:", allDeliveredOrders);

      res.json(allDeliveredOrders);
  } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};


const customsales = async (req, res) => {
  try {
      const { startDate, endDate } = req.query;

      const customOrders = await Order.find({
          placed: { $gte: new Date(startDate), $lte: new Date(endDate) },
          status: "Delivered",
          paymentstatus:"paid",
      }).sort({ placed: -1 });
      res.json(customOrders);
  } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};



const getCustomSales = async (req, res) => {
  try {
    const { start, end } = req.query;  
    console.log(req.query, "Received query parameters");

    if (!start || !end) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);


    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

   
    endDate.setHours(23, 59, 59, 999);

 
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    
    const orders = await Order.find({
      placed: {
        $gte: startDate,
        $lte: endDate
      },
      status: 'Delivered',
      paymentstatus: "paid"
    }).skip(skip).limit(limit);

    // console.log('Orders fetched:', orders);

    // Count total orders for pagination
    const totalOrders = await Order.countDocuments({
      placed: {
        $gte: startDate,
        $lte: endDate
      },
      status: 'Delivered'
    });

    const totalPages = Math.ceil(totalOrders / limit);

    // Send the response
    res.json({ orders, currentPage: page, totalPages });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};




const adminoffer = async(req,res)=>{
  try {
    
    res.render('offer')

  } catch (error) {
    console.log(error.message);
  }
}

const addoffer = async(req,res)=>{
  console.log("hi from the addoffer");
  try {
    const productId = req.body.productId
    console.log(productId,"offer for the prod");
    const offer = req.body.offer
    if(offer>95){
      return res.json({success:false,message:"above 95 is not alllowed"})
    }
    const productData = await product.findOne({ _id: productId }).populate('category');
    console.log("Product Data:", productData);

    if (productData.category && productData.category.offer > 0) {
      console.log("Category has the offer");
      return res.json({ success: false, message: "Product already has a category offer" });
    }

    const orginalprice = productData.price
    productData.offer = parseInt(offer)
    productData.orginalprice = orginalprice
    productData.price -=Math.floor(productData.price*(offer / 100));
    await productData.save()
    return res.json({success:true})

  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

const removeoffer = async(req,res)=>{
  // console.log("i am here to remove the offer");
  try {
    const productId = req.body.productId
    const productData = await product.findOne({_id:productId})
    productData.offer = 0 
    const orginalprice = productData.orginalprice
    productData.price = orginalprice
    await productData.save()
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// const createCustomDateRangeFilter = (startDate, endDate) => {
//   if (startDate && endDate) {
//     console.log('Applying Custom Date Range Filter');
//     return {
//       placed: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       },
//       status: "Delivered"
//     };
//   }
//   return null;
// };

const downloadpdf = async (req, res) => {
  try {
    const doc = new PDFDocument();
    const { timeRange, startDate, endDate, category = 'all' } = req.query;

    console.log('Received query params:', req.query);
    console.log(`Start Date: ${startDate}, End Date: ${endDate}, Time Range: ${timeRange}, Category: ${category}`);

    let filter = { status: "Delivered" };

    if (timeRange === 'daily') {
      filter.placed = { $gte: moment().startOf('day').toDate(), $lte: moment().endOf('day').toDate() };
    } else if (timeRange === 'weekly') {
      filter.placed = { $gte: moment().startOf('week').toDate(), $lte: moment().endOf('week').toDate() };
    } else if (timeRange === 'monthly') {
      filter.placed = { $gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate() };
    } else if (timeRange === 'yearly') {
      filter.placed = { $gte: moment().startOf('year').toDate(), $lte: moment().endOf('year').toDate() };
    } else if (timeRange === 'custom' && startDate && endDate) {
      filter.placed = { 
        $gte: new Date(startDate), 
        $lte: moment(endDate).endOf('day').toDate() 
      };
    }

    console.log('Applied filter:', JSON.stringify(filter, null, 2));

    let orderdata = await Order.find(filter).sort({ placed: -1 });
    console.log(`Number of orders found: ${orderdata.length}`);
    
    let productIds = [];
    if (category !== 'all') {
      const products = await product.find({ category: new mongoose.Types.ObjectId(category) });
      productIds = products.map(product => product._id);
    }

    if (productIds.length > 0) {
      filter['product.product'] = { $in: productIds };
    }

   
    // let orderdata = await Order.find(filter).sort({ placed: -1 });

    
    const overallSalesCount = orderdata.length;
    let overallOrderAmount = 0;
    let totalDiscount = 0;
    let totalCouponDeduction = 0;

    
    const detailedOrders = await Promise.all(orderdata.map(async order => {
      let orderDiscount = 0;
      let orderCouponDeduction = 0;

      const products = await product.find({ _id: { $in: order.product.map(p => p.productId) } });
      products.forEach(product => {
        if (product.offer > 0) {
          const discountAmount = product.offerType === 'percentage'
            ? product.price * (product.offer / 100)
            : product.offer;
          orderDiscount += discountAmount;
        }
      });

      if (order.couponCode) {
        const coupon = await Coupon.findOne({ couponCode: order.couponCode });
        if (coupon) {
          orderCouponDeduction = coupon.offer;
        }
      }

      overallOrderAmount += order.totalprice;
      totalDiscount += orderDiscount;
      totalCouponDeduction += orderCouponDeduction;

      return {
        ...order._doc,
        orderDiscount,
        orderCouponDeduction
      };
    }));

    
    const currentdate = new Date();
    const time = currentdate.getTime();
    res.setHeader('Content-Disposition', `attachment; filename="sales_report-${time}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(12).text(`Sales Report - ${currentdate.toLocaleDateString()}`, { align: 'center' }).moveDown();

    doc.fontSize(10).text(`Overall Sales Count: ${overallSalesCount}`).moveDown();
    doc.fontSize(10).text(`Overall Order Amount: ₹${overallOrderAmount.toFixed(2)}`).moveDown();

    const table = {
      headers: ['Order ID', 'Billing Name', 'Date', 'Total',  'Payment Status', 'Payment Method', 'Order Status'],
      rows: detailedOrders.map(order => [
        order._id,
        order.Address[0].name,
        order.date,
        `₹${order.totalprice.toFixed(2)}`,
        order.paymentstatus,
        order.payment,
        order.status
      ])
    };

    doc.table(table, {
      columnSpacing: 10,
      padding: 10,
      columnsSize: [160, 80, 80, 80, 80, 80, 80],
      align: "center",
      prepareHeader: () => doc.font('Helvetica-Bold'),
      prepareRow: (row, i) => doc.font('Helvetica').fontSize(10),
    });

    doc.end();
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const downloadexcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    const { timeRange, startDate, endDate, category = 'all' } = req.query;

    console.log('Received query params:', req.query);
    console.log(`Start Date: ${startDate}, End Date: ${endDate}, Time Range: ${timeRange}, Category: ${category}`);

    let filter = { status: "Delivered" };

    if (timeRange === 'daily') {
      filter.placed = { $gte: moment().startOf('day').toDate(), $lte: moment().endOf('day').toDate() };
    } else if (timeRange === 'weekly') {
      filter.placed = { $gte: moment().startOf('week').toDate(), $lte: moment().endOf('week').toDate() };
    } else if (timeRange === 'monthly') {
      filter.placed = { $gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate() };
    } else if (timeRange === 'yearly') {
      filter.placed = { $gte: moment().startOf('year').toDate(), $lte: moment().endOf('year').toDate() };
    } else if (timeRange === 'custom' && startDate && endDate) {
      filter.placed = { 
        $gte: new Date(startDate), 
        $lte: moment(endDate).endOf('day').toDate() 
      };
    }

    console.log('Applied filter:', JSON.stringify(filter, null, 2));

    const orderdata = await Order.find(filter).sort({ placed: -1 });
    console.log(`Number of orders found: ${orderdata.length}`);

    
    let productIds = [];
    if (category !== 'all') {
      const products = await product.find({ category: new mongoose.Types.ObjectId(category) });
      productIds = products.map(product => product._id);
    }

    if (productIds.length > 0) {
      filter['product.product'] = { $in: productIds };
    }

    
    // const orderdata = await Order.find(filter).sort({ placed: -1 });

    const overallSalesCount = orderdata.length;
    let overallOrderAmount = 0;
    let totalDiscount = 0;
    let totalCouponDeduction = 0;

    const detailedOrders = await Promise.all(orderdata.map(async order => {
      let orderDiscount = 0;
      let orderCouponDeduction = 0;

      const products = await product.find({ _id: { $in: order.product.map(p => p.productId) } });
      products.forEach(product => {
        if (product.offer > 0) {
          const discountAmount = product.offerType === 'percentage'
            ? product.price * (product.offer / 100)
            : product.offer;
          orderDiscount += discountAmount;
        }
      });

      if (order.couponCode) {
        const coupon = await Coupon.findOne({ couponCode: order.couponCode });
        if (coupon) {
          orderCouponDeduction = coupon.offer;
        }
      }

      overallOrderAmount += order.totalprice;
      totalDiscount += orderDiscount;
      totalCouponDeduction += orderCouponDeduction;

      return {
        ...order._doc,
        orderDiscount,
        orderCouponDeduction
      };
    }));

    const currentdate = new Date();
    const time = currentdate.getTime();
    res.setHeader('Content-Disposition', `attachment; filename="sales_report-${time}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    worksheet.addRow(['Sales Report', currentdate.toLocaleDateString()]);
    worksheet.addRow([]);
    worksheet.addRow(['Overall Sales Count', overallSalesCount]);
    worksheet.addRow(['Overall Order Amount', `₹${overallOrderAmount.toFixed(2)}`]);
    // worksheet.addRow(['Total Discount', `₹${totalDiscount.toFixed(2)}`]);
    // worksheet.addRow(['Total Coupon Deduction', `₹${totalCouponDeduction.toFixed(2)}`]);
    worksheet.addRow([]);

    worksheet.addRow(['Order ID', 'Billing Name', 'Date', 'Total', 'Payment Status', 'Payment Method', 'Order Status']);

    detailedOrders.forEach(order => {
      worksheet.addRow([
        order._id,
        order.Address[0].name,
        order.date,
        `₹${order.totalprice.toFixed(2)}`,
        order.paymentstatus,
        order.payment,
        order.status
      ]);
    });

    worksheet.columns.forEach(column => {
      column.width = 20;
    });

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};


const saleschart = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'monthly';

       console.log(timeRange,"this is from the saleschart");
    let dateFormat;
    if (timeRange === 'weekly') {
      dateFormat = { $dateToString: { format: "%Y-%U", date: "$placed" } };
    } else if (timeRange === 'yearly') {
      dateFormat = { $dateToString: { format: "%Y", date: "$placed" } };
    } else {
      dateFormat = { $dateToString: { format: "%Y-%m", date: "$placed" } };
    }

    const saleDate = await Order.aggregate([
      {
        $match: {
          Order_verified: true,
          status: 'Delivered'
        }
      },
      {
        $group: {
          _id: dateFormat, 
          totalSales: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } } 
    ]);

    const labels = saleDate.map(item => item._id);

    const datasets = [{
      label: 'Sales',
      data: saleDate.map(item => item.totalSales)
    }];

    res.json({ labels, datasets });
  } catch (error) {
    console.error('Error fetching sales chart data:', error);
    res.status(500).json({ error: 'Failed to fetch sales chart data' });
  }
};

const revenueChart = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'monthly';
    console.log(timeRange,"this is from the saleschart");
    
    let dateFormat;
    if (timeRange === 'weekly') {
      dateFormat = { $dateToString: { format: "%Y-%U", date: "$placed" } };
    } else if (timeRange === 'yearly') {
      dateFormat = { $dateToString: { format: "%Y", date: "$placed" } };
    } else {
      dateFormat = { $dateToString: { format: "%Y-%m", date: "$placed" } };
    }

    const revenueData = await Order.aggregate([
      {
        $match: {
          Order_verified: true,
          status: 'Delivered',
          paymentstatus: 'paid'
        }
      },
      {
        $group: {
          _id: dateFormat,
          totalRevenue: { $sum: "$totalprice" },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const labels = revenueData.map(item => item._id);

    const datasets = [
      {
        label: 'Revenue',
        data: revenueData.map(item => item.totalRevenue),
      },
      {
        label: 'Orders Count',
        data: revenueData.map(item => item.totalOrders),
      }
    ];

    res.json({ labels, datasets });
  } catch (error) {
    console.error('Error fetching revenue chart data:', error);
    res.status(500).json({ error: 'Failed to fetch revenue chart data' });
  }
};


const bestsellingproduct = async()=>{
  try {

    // console.log("hi from the bestselling");
    
    const products = await product.find({Verified:true})
    // console.log(products,"the bestselling product is here");
     const topsellingproduct = await Order.aggregate([
      {$match:{Order_verified:true}},
      {$unwind:"$product"},
      {$group:{_id:"$product",ordersCount:{$sum:1} } },
      {$limit:3}
     ]);
    //  console.log(topsellingproduct,"this is the top ");
      
      for(const product of products){
        const topproduct = topsellingproduct.find(items => items._id.toString() === product._id.toString())
        if(topproduct){
          product.ordersCount = topproduct.orderCount;
        }else{
          product.ordersCount = 0
        }
      }
      
      products.sort((a, b) => b.totalQuantity - a.totalQuantity);

      return products
  } catch (error) {
    
    console.error('Error fetching top selling products:', error);
    throw new Error('Failed to fetch top selling products');

  }
}

const bestsellingcategory = async () => {
  try {
    const categories = await Category.find({});
    const bestsellingcategory = [];

    for (const category of categories) {
      const products = await product.find({ category: category._id });
      const topsellingcat = await Order.aggregate([
        { $match: { Order_verified: true } },
        { $unwind: "$products" },
        { $match: { "products.Category": category._id } },
        { $group: { _id: "$products.product", ordersCount: { $sum: 1 } } },
        { $sort: { ordersCount: -1 } },
        { $limit: 1 }
      ]);

      for (const product of products) {
        const topproduct = topsellingcat.find(items => items._id.toString() === product._id.toString());
        if (topproduct) {
          product.ordersCount = topproduct.ordersCount;
        } else {
          product.ordersCount = 0;
        }
      }
      bestsellingcategory.push({ category, products });
    }
    return bestsellingcategory;
  } catch (error) {
    console.error('Error fetching best selling categories:', error);
    throw new Error('Failed to fetch best selling categories');
  }
};

const getRevenueData = async () => {
  try {
     
      const revenueData = await Order.aggregate([
          {
              $match: {
                Order_verified: true,
                  $or: [
                      { status: "Delivered" },
                      { paymentstatus: "paid" }
                  ]
              }
          },
          {
              $group: {
                  _id: null,
                  totalRevenue: { $sum: "$totalprice" } 
              }
          }
      ]);

      // console.log(revenueData,"hi from the ");
      return revenueData[0] ? revenueData[0].totalRevenue : 0; 
  } catch (error) {
      console.error('Error fetching revenue data:', error);
      return 0; 
  }
};

const getCancelledOrders = async (req, res) => {
  const perPage = 5;
  const page = parseInt(req.query.page) || 1;

  try {
    const cancelledOrdersCount = await Order.countDocuments({ status: 'Return Requested' });
    const totalPages = Math.ceil(cancelledOrdersCount / perPage);

    const cancelledOrders = await Order.find({ status: 'Return Requested' })
      .skip((page - 1) * perPage)
      .limit(perPage);

      if (cancelledOrders.length === 0) {
        return res.render('return', {
          orders: [], 
          users: [],
          status: 'Return Requested',
          currentPage: page,
          totalPages: totalPages,
          message: 'No cancelled orders found' 
        });
      }
      
    const userIds = [];
    for (let order of cancelledOrders) {
      userIds.push(order.userId);
    }

    const users = await user.find({ _id: { $in: userIds } });

    for (let order of cancelledOrders) {
      order.productDetails = [];
      for (let productItem of order.product) {
        const productId = productItem.product; 
        const productDetail = await product.findById(productId);
        order.productDetails.push(productDetail);
      }
    }

    res.render('return', {
      orders: cancelledOrders,
      users: users,
      status: 'Return Requested',
      currentPage: page,
      totalPages: totalPages,
      message: null
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ message: 'Internal Server Error' });
  }
};


const accept = async(req, res) => {
  try {
    const { id } = req.query;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).send('Order not found');
    }

    order.status = 'Return request Accepted';
    await order.save();

    res.status(200).json({ message: 'Return request accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

const acceptReturnRequest = async(req, res) => {
  try {
    console.log("this is the refund session");
    const orderId = req.query.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    if (order.status !== "Return request Accepted") {
      return res.status(400).send('Return request must be accepted before processing.');
    }

    
    order.status = "Returned";
    await order.save();

    for (const item of order.product) {
      const productItem = await product.findById(item.product);
      if (productItem) {
        productItem.countInstock += item.quantity;
        await productItem.save();
      }
    }

    if (order.payment !== 'COD' && order.paymentstatus.toLowerCase() === 'paid'.toLowerCase()) {
      const userId = order.userId;
      let wallet = await Wallet.findOne({ userId: userId });

      if (!wallet) {
        wallet = new Wallet({
          userId: userId,
          balance: 0,
          history: []
        });
      }

      const refundAmount = order.totalprice;

      if (isNaN(refundAmount) || refundAmount === undefined || refundAmount === null) {
        throw new Error('Invalid totalPrice value');
      }

      wallet.balance += refundAmount;
      wallet.history.push({
        amount: refundAmount,
        type: 'credit',
        reason: 'Order Return'
      });

      await wallet.save();
      console.log("Refund added to wallet");
    }

    res.status(200).send('Product returned and refund processed successfully');
  } catch (error) {
    console.error('Error processing return:', error);
    res.status(500).send('An error occurred while processing the return');
  }
};

const reject = async(req, res) => {
  try {
    const { id } = req.query;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).send('Order not found');
    }

    order.status = 'Rejected by the admin';
    await order.save();

    res.status(200).json({ message: 'Return request rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}  

module.exports = {
  adminload,
  verifylogin,
  adminhome,
  userdetails,
  blockuser,
  unblockuser,
  logout,
  orderdetails,
  order,
  updateorder,
  addcoupon,
  listcoupon,
  deletecoupon,
  updatecoupon,
  couponupdatepage,
  salesreport,
  weeklysales,
  monthlysales,
  yearlysales ,
  getAllDeliveredOrders,
  customsales,
  getCustomSales,
  dailySales,
  adminoffer,
  addoffer,
  removeoffer,
  downloadpdf,
  downloadexcel,
  saleschart,
  bestsellingproduct,
  revenueChart,
  admin404,
  getCancelledOrders,
  accept,
  acceptReturnRequest,
  reject
  
};
