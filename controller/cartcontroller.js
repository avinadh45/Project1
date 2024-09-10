const cart = require("../model/cartmodel")
const user = require("../model/usermodel")
const product = require('../model/productmodel')
const Address = require('../model/addressmodel')
const Coupon = require("../model/couponmodel")
const mongoose=require('mongoose')

const getcart = async (req, res) => {
  
    try {
        const userId = req.session.user;
     console.log("hi");
      
        const userCart = await cart.findOne({ user_id: userId }).populate('items.product_id');

        console.log(userCart,"this is cart");
       
        if (userCart && userCart.items.length > 0) {
       
            res.render('cart', { cart: userCart,discountedTotal: null });
        } else {
            console.log(" User's cart is empty or not found.");
            res.render('emptycart'); 
        }
    } catch (error) {
        console.error(" user cart", error.message);
        res.status(500).send(" Please try again later."); 
    }
}

const addtocart = async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        const user = req.session.user;

        let Cart = await cart.findOne({ user_id: user });
        const Product = await product.findOne({ _id: product_id });

        if (!Product || Product.countInstock === 0) {
            return res.status(404).json({ success: false, error: 'Product is out of stock' });
        }

        const { name, price } = Product;
        const requestedQuantity = parseInt(quantity);

        if (Cart) {
            const productIndex = Cart.items.findIndex(item => item.product_id.toString() === product_id);
            if (productIndex > -1) {
                const currentQuantityInCart = Cart.items[productIndex].quantity;
                const newQuantity = currentQuantityInCart + requestedQuantity;

                if (newQuantity > Product.countInstock) {
                    return res.status(400).json({ success: false, error: 'Requested quantity exceeds available stock' });
                }

                Cart.items[productIndex].quantity = newQuantity;
            } else {
                if (requestedQuantity > Product.countInstock) {
                    return res.status(400).json({ success: false, error: 'Requested quantity exceeds available stock' });
                }

                Cart.items.push({ product_id, name, price, quantity: requestedQuantity });
            }
        } else {
            if (requestedQuantity > Product.countInstock) {
                return res.status(400).json({ success: false, error: 'Requested quantity exceeds available stock' });
            }

            Cart = await cart.create({
                user_id: user,
                items: [{ product_id, name, price, quantity: requestedQuantity }],
                billing: 0 
            });
        }

        Cart.billing = Cart.items.reduce((acc, cur) => acc + (cur.quantity * cur.price), 0); 
        await Cart.save();

        return res.status(200).send({ message: "Product added successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

const updatecart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const user = req.session.user;

        let Cart = await cart.findOne({ user_id: user });
        if (!Cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const Product = await product.findById(productId);
        if (!Product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const productIndex = Cart.items.findIndex(item => item.product_id.toString() === productId);
        let currentQuantityInCart = 0;

        if (productIndex !== -1) {
            currentQuantityInCart = Cart.items[productIndex].quantity;
        }

        const requestedQuantity = parseInt(quantity);
        const newQuantity = currentQuantityInCart + requestedQuantity;

        if (currentQuantityInCart > Product.countInstock) {
            Cart.items[productIndex].quantity = Product.countInstock; 
            await Cart.save();
            return res.status(400).json({
                message: `Product stock has been reduced by the admin. Your cart quantity is adjusted to the available stock of ${Product.countInstock}.`
            });
        }

     
        if (newQuantity > Product.countInstock) {
            return res.status(400).json({ error: 'Requested quantity exceeds available stock' });
        }

      
        if (productIndex !== -1) {
            if (requestedQuantity > 0) {
                Cart.items[productIndex].quantity = newQuantity;
            } else {
                Cart.items.splice(productIndex, 1);
            }
        } else if (requestedQuantity > 0) {
            Cart.items.push({ product_id: productId, quantity: requestedQuantity });
        }

        await Cart.save();
        res.status(200).json({ message: 'Cart updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const cartdelete = async (req, res) => {
    console.log("controller for the delete");
    try {
        const userId = req.session.user;
        
        // console.log(userId,"for the delete");
                const {product_id}=req.body
              console.log(req.body,"delet body");
        let Cart = await cart.findOne({  user_id:userId  }); 
        //  console.log(userId,"for the delete");
      
        console.log(Cart,"for the deleting the cart");

           if(!Cart){
            console.log(Cart,"no cart founded");
           }
        const productIndex = Cart.items.findIndex((items) => items.product_id.toString() === product_id);
             console.log(productIndex,"ok delet");
        if (productIndex !==-1) {
            Cart.items.splice(productIndex, 1);
            await Cart.save();
            return res.status(200).send("success");
        } else {
            return res.status(404).send("not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};


const checkout = async (req, res) => {
    try {
        console.log("Retrieving checkout information...");
        const userId = req.session.user._id;
        const userdata = await user.findOne({ _id: userId });

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const cartaggregation = await cart.aggregate([
            { $match: { user_id: userObjectId } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.product_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$_id",
                    items: { $push: "$items" },
                    products: { $push: "$product" }
                }
            }
        ]);

        if (!cartaggregation || cartaggregation.length === 0) {
            return res.status(404).render('checkout', { username: userdata.name, error: null });
        }

        const cartdata = cartaggregation[0];
        const products = cartdata.products;
        const items = cartdata.items;

        
        let stockUpdated = false;
        items.forEach((item, index) => {
            const product = products[index];
            if (item.quantity > product.countInstock) {
                items[index].quantity = product.countInstock; 
                stockUpdated = true;
            }
        });

        if (stockUpdated) {
            await cart.updateOne({ _id: cartdata._id }, { $set: { items } });
            return res.status(400).render('checkout', {
                products,
                cart: { ...cartdata, items },
                cartitem: items,
                addresses: await Address.findOne({ userId }),
                username: userdata.name,
                subtotal: items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                discountAmount: 0,
                discountTotal: items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                coupons: await Coupon.find().sort({ created: -1 }),
                error: 'Some items in your cart were adjusted due to stock changes.'  
            });
        }

        const addresses = await Address.findOne({ userId: userId });

        let subtotal = 0;
        items.forEach(item => {
            subtotal += item.price * item.quantity;
        });

        let discountAmount = 0;
        let discountTotal = subtotal;

        let usedCouponCode = null;
        if (req.session.coupon) {
            const couponData = await Coupon.findOne({ couponCode: new RegExp(`^${req.session.coupon}$`, 'i') });
            if (couponData) {
                discountAmount = subtotal * (couponData.offer / 100);
                discountTotal = subtotal - discountAmount;
                usedCouponCode = couponData.couponCode;
            }
        }

        const coupons = await Coupon.find().sort({ created: -1 });
        const availableCoupons = coupons.filter(coupon => coupon.couponCode !== usedCouponCode);

      
        res.render('checkout', {
            products,
            cart: cartdata,
            cartitem: items,
            addresses,
            username: userdata.name,
            subtotal,
            discountAmount,
            discountTotal,
            coupons: availableCoupons,
            error: null 
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};






module.exports = {
    getcart,
    addtocart,
    cartdelete,
    updatecart,
    checkout,
 
}