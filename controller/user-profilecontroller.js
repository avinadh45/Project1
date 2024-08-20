const User = require('../model/usermodel');
const Address = require('../model/addressmodel')
const Order = require('../model/ordermodel')
const product = require('../model/productmodel');
const Cart = require('../model/cartmodel')
const { order } = require('./admincontroller');
const Coupon = require('../model/couponmodel')
const Wallet = require('../model/walletmodel')
const wish = require('../model/wishlistmodel')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose');
const crypto = require("crypto");
const Swal = require('sweetalert2');
var easyinvoice = require('easyinvoice');
const Razorpay = require('razorpay')

var instance = new Razorpay({
    key_id: process.env.key_id,
    key_secret: process.env.key_secret,
  });

const securedpassword = async(password)=>{
    try{
        const hashedpassword = await bcrypt.hash(password,10);
        return hashedpassword

    }catch(error){
        console.log(error.message);
    }
}

const getprofile = async(req,res)=>{
    try {
        const userid = req.session.user._id

        console.log(userid,"iduser");

        // const coupons =  await Coupon.find()

         const wishlist = await wish.findOne({userId:userid}) 
         const wishcount = wishlist ? wishlist.product.length : 0;
         console.log(wishcount,"this is the wish count");
        const coupons = await Coupon.find().sort({ created: -1 })

        const Iduser = await User.findOne({_id:userid})

        const address = await Address.findOne({userId:userid})

        const orders = await Order.find({userId:userid }).sort({ placed: -1 }).populate('product.product');

        const cart = await Cart.findOne({ user_id:userid });

        let wallet = await Wallet.findOne({ userId: userid });
        if (!wallet) {
            wallet = { balance: 0, history: [] }; 
        }

       

        const cartCount = cart ? cart.items.length : 0;
    
        res.render('user-profile',{ address,orders,Iduser,cartCount,coupons,wallet,wishcount})

    } catch (error) {
        console.error(error);
    }
}

const getaddress = async(req,res)=>{
    try {
        
          
        res.render('user-address')
    } catch (error) {
       console.error(error); 
    }
}
const addaddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const userdata = await User.findOne({ _id: userId });
        const { name, phone, pincode, state, town, altphone, addresstype, address } = req.body;

        console.log(req.body, "req in the body");

        let userAddress = await Address.findOne({ userId: userdata._id });

        if (!userAddress) {
            const cusAddress = new Address({
                userId: userdata._id,
                Address: [{
                    addresstype: addresstype,
                    name: name,
                    phone: phone,
                    pincode: pincode,
                    state: state,
                    altphone: altphone,
                    town: town,
                    address: address
                }]
            });
            await cusAddress.save();
            console.log(address, "save");
        } else {
            userAddress.Address.push({
                addresstype: addresstype,
                name: name,
                phone: phone,
                pincode: pincode,
                state: state,
                altphone: altphone,
                town: town,
                address: address
            });
            await userAddress.save();
        }
        res.redirect('/user-profile');
    } catch (error) {
        console.error(error);
    }
};

const editaddress = async(req, res) => {
    try {
        const addressId = req.query.id;
        const userId = req.session.user;
        
       
        const user = await Address.findOne({ userId: userId, 'Address._id': addressId });
        
        if (!user) {
            return res.status(404).send("Address not found");
        }
        
        
        const addressToEdit = user.Address.find(addr => addr._id.toString() === addressId);
        
        if (!addressToEdit) {
            return res.status(404).send("Address not found");
        }

        res.render('updateAddress', { addresstoedit: addressToEdit });
    } catch (error) {
        console.error("Error fetching address:", error);
        res.status(500).send("Internal Server Error");
    }
};

const updateAddress = async(req, res) => {
    try {
        const userId = req.session.user;
        const addressId = req.query.id;
        console.log(addressId,"this is the address");
        

        const userAddress = await Address.findOneAndUpdate(
            { userId: userId, 'Address._id': addressId },
            {
                $set: {
                    'Address.$.name': req.body.name,
                    'Address.$.address': req.body.address,
                    'Address.$.phone': req.body.phone,
                    'Address.$.pincode': req.body.pincode,
                    'Address.$.state': req.body.state,
                    'Address.$.town': req.body.town,
                    'Address.$.altphone': req.body.altphone,
                    'Address.$.addresstype': req.body.addresstype
                },
            },
            { new: true }
        );

        console.log(userAddress, "Updated address");

       
        res.redirect('/user-profile');
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).send("Internal Server Error");
    }
}


const deleteaddress = async (req, res) => {
    try {
        const addressId = req.body.id; 
        console.log(addressId, "id for address");
        const deltaddress = await Address.findOne({'Address._id': addressId});
        await Address.updateOne(
            {'Address._id': addressId},
            {
                $pull: {
                    'Address': {
                        _id: addressId
                    }
                }
            }
        );

        console.log(deltaddress);

        res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'An error occurred' });
    }
};


const orderhistory = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const orders = await Order.find({ userId }).populate('product.product');

        res.render('user-profile', {orders});
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};

const loadchangepassword = async(req,res)=>{
    try {
        res.render('changepassword')
    } catch (error) {
        console.log(error.message);
    }
}

const changePassword = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { 'new-password': newPassword, 'confirm-password': confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).send({ success: false, message: 'Passwords do not match' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.updateOne({ _id: userId }, { $set: { password: hashedPassword } });

        res.redirect('/home'); 
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
};

const orderdetails = async (req, res) => {
    try {
        const Id = req.session.user._id;
        const orderId = req.query.id;
        console.log(Id, "in the order details page");
        console.log("Order ID:", orderId);

        const orderData = await Order.findById(orderId).populate('coupon');
        console.log("Order Data:", orderData);

        const userData = await User.findById(orderData.userId);
        console.log("User Data:", userData);

        const productIds = orderData.product.map(product => product.product);
        const productData = await product.find({ _id: { $in: productIds } });
        console.log("Product Data:", productData);

        let productsUsingCoupon = 0;
        orderData.product.forEach(orderProduct => {
            const product = productData.find(p => p._id.equals(orderProduct.product));
            if (product) {
                product.quantity = orderProduct.quantity;
                product.orginalprice = product.orginalprice || 0; 
                product.discountedPrice = product.price || 0; 
                product.discountPercentage = ((product.orginalprice - product.discountedPrice) / product.orginalprice) * 100 || 0; 
                console.log(product.discountPercentage, "this is the discount");
                product.discountAmount = product.orginalprice - product.discountedPrice || 0; 
                if (product.discountPercentage > 0) {
                    productsUsingCoupon += 1;
                }
            }
        });

        const addressData = await Address.findOne({ userId: Id });
        // console.log("Address Data:", addressData);

        const cart = await Cart.findOne({ user_id: Id });
        console.log(orderData.coupon, "this is the coupon for gr");

        let couponDiscount = 0;
        let couponPercentage = 0;
        let discountedTotalPrice = orderData.totalprice;

        if (orderData.coupon) {
            console.log(orderData.coupon, "this is the order data");
            couponDiscount = discountedTotalPrice * (orderData.coupon.offer / 100);
            couponPercentage = orderData.coupon.offer;
            console.log(couponPercentage, "this is the coupon");

            discountedTotalPrice -= couponDiscount;
        }

        res.render('orderdetails', {
            user: userData,
            order: orderData,
            products: productData,
            address: addressData,
            cart,
            couponDiscount: couponDiscount,
            couponPercentage: couponPercentage,
            productsUsingCoupon: productsUsingCoupon,
            discountedTotalPrice: discountedTotalPrice
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Internal Server Error');
    }
};



const cancelOrder = async (req, res) => {
    console.log("hi to cancel the order");
    try {
        const orderId = req.params.id;
        let Id = req.session.user;


        console.log(req.session,"session is here");
       console.log(Id,"for the user to identify");
        console.log(`Order ID: ${orderId}`);

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send('Order not found');
        }

        if (order.status === 'Cancelled') {
            return res.status(400).send('Order is already cancelled');
        }

        order.status = 'Cancelled';
        await order.save();

        for (const item of order.product) {
            const productItem = await  product.findById(item.product);
            //  console.log(productItem,"this id product");
            if (productItem) {
                productItem.countInstock += item.quantity;
                await productItem.save();
            }
        }


        console.log(`Payment method: ${order.payment}, Payment status: ${order.paymentstatus}`);


        if (order.payment !== 'COD' && order.paymentstatus ==="Paid") {
            let wallet = await Wallet.findOne({ userId:Id });

            if (!wallet) {
                wallet = new Wallet({ 
                    userId: Id,
                    balance: 0,
                    history: []
                });
            }

            const refundAmount = order.totalprice;
            console.log(refundAmount,'refund amount is here');
            if (isNaN(refundAmount) || refundAmount === undefined || refundAmount === null) {
                console.error('Invalid totalPrice value:', refundAmount);
                throw new Error('Invalid totalPrice value');
            }

            wallet.balance += refundAmount;
            wallet.history.push({
                amount: refundAmount,
                type: 'credit'
                // orderId: order._id
            });

            await wallet.save();
        }

        res.status(200).send('Order cancelled successfully');
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).send('Internal Server Error');
    }
};

const returnorder = async (req, res) => {
    try {
        console.log("User is requesting a return");
        const orderId = req.params.orderId;
        const { returnReason } = req.body;

        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).send("Order not found");
        }

        if (order.status !== "Delivered") {
            return res.status(400).send('Only delivered orders can be returned');
        }

        order.status = "Return Requested";
        order.returnReason = returnReason;
        await order.save();

        console.log("Return request submitted");

        
        res.status(200).send('Return request submitted successfully');
    } catch (error) {
      console.error('Error returning product:', error);
      res.status(500).send('An error occurred while returning the product');
    }
  };
  
 const Addwallet = async (req, res) => {
    try {
        const amount = parseFloat(req.body.amount);
        const userId = req.session.user._id;
        console.log(userId, "to add the wallet");
        console.log(amount, "amount to be added to the wallet");

        
        const order = await instance.orders.create({
            amount: amount * 100,
            currency: "INR",
            receipt: userId.toString()
        });

       
        res.json({ order });

    } catch (error) {
        console.log(error);
        res.status(500).send("server error");
    }
};

const verifyPaymentAndAddToWallet = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const amount = parseFloat(req.body.amount);
        const userId = req.session.user._id;

        const hmac = crypto.createHmac('sha256', instance.key_secret);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generated_signature = hmac.digest('hex');

        if (generated_signature === razorpay_signature) {
           
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId,
                    balance: amount,
                    history: [{
                        amount: amount,
                        type: 'credit',
                        createdAt: Date.now()
                    }]
                });
            } else {
                wallet.balance += amount;
                wallet.history.push({
                    amount: amount,
                    type: 'credit',
                    createdAt: Date.now()
                });
            }

            await wallet.save();
            res.status(200).json({ success: true, message: 'Wallet balance updated successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("server error");
    }
};

const invoicedownload = async (req, res) => {
    try {
        const orderid = req.params.orderid;
        console.log(orderid, "order id is here");

        const order = await Order.findById(orderid).populate('product.product').populate('coupon');
        console.log(order, "this is the coupon");
        if (!order) {
            return res.status(404).send('Order not found');
        }

        const products = [];
        let totalAmount = 0;
        let totalDiscount = 0;

        for (let i = 0; i < order.product.length; i++) {
            const p = order.product[i];
            const productDetails = await product.findById(p.product); // Fetch the product details
            if (!productDetails) continue; // Skip if no product found

            const originalPrice = productDetails.price || 0;
            const discountAmount = originalPrice * (productDetails.offer / 100 || 0);
            const discountedPrice = originalPrice - discountAmount;
            const couponDiscount = order.coupon ? (discountedPrice * (order.coupon.offer / 100 || 0)) : 0;
            const finalPrice = discountedPrice - couponDiscount;
            const totalPrice = finalPrice * p.quantity;

            products.push({
                quantity: p.quantity,
                description: productDetails.name,
                price: originalPrice.toFixed(2),
                discount: (discountAmount + couponDiscount).toFixed(2),
                totalPrice: totalPrice.toFixed(2)
            });

            totalAmount += totalPrice;
            totalDiscount += discountAmount + couponDiscount;
        }
        console.log(products, "this is the products");

        const data = {
            apiKey: "free",
            mode: "development",
            images: {},
            sender: {
                company: "Avinadh",
                address: "Avinadh kp kochi",
                zip: "1234 AB",
                city: "kochi",
                country: "india"
            },
            client: {
                company: order.Address[0].name,
                address: order.Address[0].address,
                zip: order.Address[0].pincode,
                city: order.Address[0].town,
                country: order.Address[0].state
            },
            information: {
                number: order._id,
                date: order.date,
                dueDate: new Date(order.placed.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
            },
            products: products.map(p => ({
                quantity: p.quantity,
                description: p.description,
                price: p.price,
                discount: p.discount,
                total: p.totalPrice
            })),
            bottomNotice: "Kindly pay your invoice",
            settings: {
                currency: "INR"
            },
            totals: {
                totalPrice: order.totalprice.toFixed(2),
                totalDiscount: totalDiscount.toFixed(2)
            },
            discounts: order.coupon ? [{
                description: `Coupon Discount (${order.coupon.couponCode})`,
                amount: totalDiscount.toFixed(2)
            }] : []
        };

        const result = await easyinvoice.createInvoice(data);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${order._id}.pdf`);
        res.send(Buffer.from(result.pdf, 'base64'));

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const updateprofile = async (req, res) => {
    try {
        const userId = req.session.user._id;
        console.log(userId, "user id for update");
        const { name, phone } = req.body;
        console.log(name, phone, "name and phone here");

        
        if (!phone || phone.length !== 10 || isNaN(phone)) {
            return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = name;
        user.phone = phone;
        await user.save();
        res.status(200).json({ message: 'User information updated successfully' });
    } catch (error) {
        console.error(error, "error in updating");
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    getprofile,
    getaddress,
    addaddress,
    updateAddress,
    editaddress,
    deleteaddress,
    orderhistory,
    changePassword,
    loadchangepassword,
    orderdetails,
    cancelOrder,
    returnorder,
    Addwallet,
 verifyPaymentAndAddToWallet,
    invoicedownload,
    updateprofile
}