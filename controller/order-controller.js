const Cart = require('../model/cartmodel')
const user = require('../model/usermodel')
const Product = require('../model/productmodel')
const Address = require('../model/addressmodel')
const Order = require('../model/ordermodel')
const Coupon = require('../model/couponmodel')
const Wallet = require('../model/walletmodel')
const crypto = require('crypto')
const mongoose = require('mongoose');
const Razorpay = require('razorpay')
var instance = new Razorpay({
    key_id: process.env.key_id,
    key_secret: process.env.key_secret,
  });




const getorder = async (req, res) => {
    try {
        const userid = req.session.user._id;
        const userCart = await Cart.findOne({ user_id: userid }).populate('items.product_id');
        
        let subtotal = 0;
        let discountTotal = 0;
        let coupon = null;

        if (userCart) {
            subtotal = userCart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

            if (req.session.coupon) {
                coupon = await Coupon.findOne({ couponCode: new RegExp(`^${req.session.coupon}$`, 'i') });
                if (coupon) {
                    discountTotal = subtotal - (subtotal * (coupon.offer / 100));
                } else {
                    discountTotal = subtotal;
                }
            } else {
                discountTotal = subtotal;
            }
        }

        const useraddress = await Address.findOne({ userId: userid });
        res.render('checkout', { useraddress, subtotal, discountTotal, coupon });
    } catch (error) {
        console.error("Error in getorder:", error.message);
        res.status(500).send("Please try again later.");
    }
};


const razorpayorder = async (total) => {
    return new Promise((resolve, reject) => {
        var options = {
            amount: total*100,
            currency: "INR",
            receipt: crypto.randomBytes(10).toString('hex')
        };
        instance.orders.create(options, (err, order) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve(order);
            }
        });
    });
};

const verifyrazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const hmac = crypto.createHmac('sha256', instance.key_secret);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generated_signature = hmac.digest('hex');

        if (generated_signature === razorpay_signature) {
            console.log("this is ",generated_signature);
            console.log("this is from body ",razorpay_signature);
           
            console.log("Signatures match, proceeding with payment verification");
            const orderId =req.session.pendingOrderId
            console.log(`Order ID from session: ${orderId}`); 
            if (!orderId) {
                console.log("Order ID not found in session");
                return res.status(400).json({ success: false, message: 'Order ID not found in session' });
            }

            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            order.paymentstatus = "Paid";
            order.status = "Confirmed";
            await order.save();
            console.log("Order status updated to 'Paid' and 'Confirmed'");
            res.status(200).json({ success: true, message: 'Payment verified and order confirmed', orderId: order._id });
        } else {
            res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

function generateOrderId() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); 
    const randomString = Math.random().toString(36).substring(2, 7).toUpperCase(); 
    return `ORD-${date}-${randomString}`;
}


const order = async (req, res) => {
    console.log("hello in the order");
    try {
        let totalPrice = parseFloat(req.body.totalPrice);
        console.log(totalPrice, "amount for the checkout and the wallet");
        const userId = req.session.user._id;
        console.log(userId, "its jiknuu");
        const { couponCode } = req.body;
        console.log(couponCode, "this is from the body");
        
        const addressId = req.body.addressId;
        const payments = req.body.paymentOption;

        const usercart = await Cart.findOne({ user_id: userId });
        const userdata = await user.findOne({ _id: userId });
        const wallet = await Wallet.findOne({ userId });

        if (usercart) {
            const product = usercart.items.map(items => ({
                product: items.product_id,
                quantity: items.quantity,
                price: items.price,
                totalamount: items.quantity * items.price,
            }));

            for (let i = 0; i < product.length; i++) {
                const products = product[i].product;
                const proqun = product[i].quantity;
                const realproduct = await Product.findOne({ _id: products });
                if (realproduct.countInstock >= proqun) {
                    realproduct.countInstock -= proqun;
                    await realproduct.save();
                }
            }

            const selectedaddress = await Address.findOne({ 'userId': userId, 'Address._id': addressId });
            let couponData = null
            if (couponCode) {
                 couponData = await Coupon.findOne({ couponCode });
                if (!couponData) {
                    return res.status(400).json({ success: false, message: 'Coupon code not found' });
                }

               if (totalPrice < couponData.MinimumAmount) {
                    return res.status(400).json({ success: false, message: 'Total subtotal is below the minimum amount required for this coupon' });
                }

                const couponUsage = userdata.Coupon.find(a => a.couponCode === couponCode);
                if (couponUsage) {
                    return res.status(400).json({ success: false, message: 'You have already used this coupon.' });
                }

                userdata.Coupon.push({ couponCode: couponCode, usagecount: 1 });
                await userdata.save();

                //const couponDiscount = totalPrice * (couponData.offer / 100);
                //totalPrice -= couponDiscount;
                console.log(`Total price after coupon discount: ${totalPrice}`);
            }

            
            const totalAmountInPaise = Math.round(totalPrice);
            console.log(`Total amount in paise: ${totalAmountInPaise}`);


            // const orderId = generateOrderId();


            if (payments === 'COD') {
                const newOrder = new Order({
                    // orderId: orderId,
                    product: product,
                    totalprice: totalPrice,
                    Address: selectedaddress.Address,
                    payment: payments,
                    userId: userId,
                    paymentstatus: "Pending",
                    status: "Confirmed",
                    date: new Date().toLocaleDateString(),
                    placed: new Date(),
                    coupon: couponCode ? couponData._id : null
                });

                await newOrder.save();

                
                req.session.user.cart = Cart;
                usercart.items = [];
                await usercart.save();
                req.session.coupon = null;

                res.status(200).json({ success: true, message: 'Order placed successfully', orderId: newOrder._id });
            } else if (payments === 'wallet') {
                if (wallet && wallet.balance >= totalPrice) {
                    wallet.balance -= totalPrice;
                    await wallet.save();

                    const newOrder = new Order({
                        // orderId: orderId,
                        product: product,
                        totalprice: totalPrice,
                        Address: selectedaddress.Address,
                        payment: payments,
                        userId: userId,
                        paymentstatus: "Paid",
                        status: "Confirmed",
                        date: new Date().toLocaleDateString(),
                        placed: new Date(),
                        coupon: couponCode ? couponData._id : null
                    });
                    await newOrder.save();
                    req.session.user.cart = Cart;
                    usercart.items = [];
                    await usercart.save();
                    req.session.coupon = null;

                    res.status(200).json({ success: true, message: 'Order placed successfully', orderId: newOrder._id });
                } else {
                    res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
                }
            } else if (payments === 'razorpay') {
                console.log("Processing Razorpay payment");
                console.log(`Total amount to be charged: ${totalAmountInPaise} paise`);

                const razorpayOrder = await razorpayorder(totalAmountInPaise);
                   console.log(razorpayOrder,"gggfhgfhgf juumbdtd");
                const newOrder = new Order({
                    // orderId: orderId,
                    product: product,
                    totalprice: totalPrice,
                    Address: selectedaddress.Address,
                    payment: payments,
                    userId: userId,
                    paymentstatus: "Pending",
                    status: "Pending",
                    date: new Date().toLocaleDateString(),
                    placed: new Date(),
                    coupon: couponCode ? couponData._id : null
                });

                await newOrder.save();
                console.log(newOrder, "neworder");
                console.log(newOrder._id, "neworder id");
                req.session.pendingOrderId = newOrder._id;
                usercart.items = [];
                await usercart.save();
                req.session.coupon = null;

                res.status(200).json({
                    success: true,
                    razorpayOrderId: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency
                });
            }
        }
    } catch (error) {
        console.log("Error in order placement:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const OrderSuccess = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log(orderId,"id fo the sucess");
        const order = await Order.findById(orderId);
        console.log( order,"finded the order data");

        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('order-sucess', { order });
        console.log();
    } catch (error) {
        console.log(error);
        res.status(500).send('Server error');
    }
};

const applycoupon = async (req, res) => {
    try {
        console.log("hi from the apply coupon");

        const { coupon, totalsubtotal } = req.body;
        const userId = req.session.user._id;

        const parsedTotalSubtotal = parseFloat(totalsubtotal);
        if (isNaN(parsedTotalSubtotal)) {
          ;
            req.session.coupon = null;
            req.session.discountTotal = null;
            return res.status(400).json({ success: false, message: "Invalid total subtotal" });
        }

        const couponData = await Coupon.findOne({ couponCode: new RegExp(`^${coupon}$`, 'i') });
        if (!couponData) {
           
            req.session.coupon = null;
            req.session.discountTotal = null;
            return res.status(409).json({ success: false, message: 'Coupon code not found' });
        }

        if (parsedTotalSubtotal < couponData.MinimumAmount) {
           
            req.session.coupon = null;
            req.session.discountTotal = null;
            return res.status(400).json({ success: false, message: 'Total subtotal is below the minimum amount required for this coupon' });
        }

        const userData = await user.findOne({ _id: userId });
        const couponUsage = userData.Coupon.find(a => a.couponCode === couponData.couponCode);
        if (couponUsage) {
       
            req.session.coupon = null;
            req.session.discountTotal = null;
            return res.status(404).json({ success: false, message: 'You have already used this coupon.' });
        }

        const discountTotal = parsedTotalSubtotal - (parsedTotalSubtotal * (couponData.offer / 100));
        req.session.coupon = coupon;
        req.session.discountTotal = discountTotal; 
        console.log("Coupon applied successfully", { coupon, discountTotal, session: req.session });
        return res.status(200).json({ success: true, discountTotal });
    } catch (error) {
        console.error("Error applying coupon:", error);
        req.session.coupon = null;
        req.session.discountTotal = null;
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const calculateSubtotal = (cart) => {
    return cart.items.reduce((acc, item) => {
        return acc + item.price * item.quantity;
    }, 0);
};

const removecoupon = async (req, res) => {
    try {
        req.session.coupon = null;
        req.session.discountTotal = null;

        console.log("Coupon removed from session", { session: req.session });

        let userCart = req.session.user.cart;
        console.log("User cart from session", { userCart });

        if (!userCart) {
            const userId = req.session.user._id;
            console.log("Fetching cart for user from database", { userId });
            userCart = await Cart.findOne({ user_id: userId });
            console.log("Fetched cart from database", { userCart });
            if (!userCart) {
                return res.status(404).json({ success: false, message: 'Cart not found' });
            }
        }

        const subtotal = calculateSubtotal(userCart);

        console.log("Subtotal after removing coupon", { subtotal });
        return res.status(200).json({ success: true, subtotal: subtotal });
    } catch (error) {
        console.error("Error removing coupon:", error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const retryPayment = async (req, res) => {
    const { id } = req.query;
    console.log("hi from the retry");

    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.paymentstatus === "Pending") {
            const razorpayOrder = await razorpayorder(order.totalprice);

            
            req.session.pendingOrderId = order._id;
            console.log(`Order ID stored in session: ${req.session.pendingOrderId}`);

            res.status(200).json({
                success: true,
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                orderId: order._id
            });
        } else {
            res.status(400).json({ success: false, message: 'Order already paid or not eligible for retry' });
        }
    } catch (error) {
        console.log("Error in retry payment:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};



const deletesingleproduct = async(req,res)=>{
    try {
        const { orderId, productId } = req.query;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        let removedProduct = null;
        for (let i = 0; i < order.product.length; i++) {
            if (order.product[i].product.toString() === productId) {
                removedProduct = order.product.splice(i, 1)[0];
                break;
            }
        }
        if (removedProduct) {
            await order.save();

            const newSubtotal = order.product.reduce((sum, item) => sum + (item.quantity * item.price), 0);

            let newCouponDiscount = 0;
            if (order.couponCode) {
                const couponData = await Coupon.findOne({ couponCode: new RegExp(`^${order.couponCode}$`, 'i') });
                if (couponData) {
                    newCouponDiscount = newSubtotal * (couponData.offer / 100);
                }
            }

            res.json({
                success: true,
                newSubtotal: newSubtotal,
                newTotalAfterDiscount: newSubtotal - newCouponDiscount,
                newTotal: newSubtotal,
                couponDiscount: newCouponDiscount
            });
        } else {
            res.status(404).json({ success: false, message: 'Product not found in order' });
        }
    } catch (error) {
        console.error('Error removing product:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

module.exports={
    order ,
    getorder,
    razorpayorder,
    verifyrazorpay,
    applycoupon,
    removecoupon,
    OrderSuccess,
    retryPayment,
    deletesingleproduct
}