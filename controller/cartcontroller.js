const cart = require("../model/cartmodel")
const user = require("../model/usermodel")
const product = require('../model/productmodel')
const Address = require('../model/addressmodel')
const Coupon = require("../model/couponmodel")
const mongoose=require('mongoose')




const getcart = async (req, res) => {
    // console.log(" Retrieving use cart...");
    try {
        const userId = req.session.user;
     
        // console.log(userId,"killer");
        const userCart = await cart.findOne({ user_id: userId }).populate('items.product_id');
        // console.log(userCart,"usercart  cart ");
        if (userCart && userCart.items.length > 0) {
            // console.log("Controller User cart found", userCart);
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
    // console.log("Controller is here in the add to cart");
    try {
        const { product_id, quantity } = req.body;
        const user = req.session.user;

        let Cart = await cart.findOne({ user_id: user });

        const Product = await product.findOne({ _id: product_id });
        if(!Product || Product.countInstock === 0){
            return res.status(404).json({ success: false, error: 'Product is out of stock' });
        }
        // console.log(Cart, "Cart is here");
        // console.log(Product, "Product is here");

        if (!Product) {
            return res.status(404).send({ message: "Product not found" });
        }

        const { name, price } = Product;

        if (Cart) {
            const productIndex = Cart.items.findIndex(item => item.product_id.toString() === product_id);
            if (productIndex > -1) {
              
                Cart.items[productIndex].quantity += parseInt(quantity);
            } else {
              
                Cart.items.push({ product_id, name, price, quantity });
            }
        } else {
        
            Cart = await cart.create({
                user_id: user,
                items: [{ product_id, name, price, quantity }],
                billing: 0 
            });
        }
        Cart.billing = Cart.items.reduce((acc, cur) => acc + (cur.quantity * cur.price), 0); 

        await Cart.save();
            

              console.log("cart to remove ",req.session.user.cart);

        return res.status(200).send({ message: "Product added successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

const updatecart = async (req, res) => {
    console.log("Hello from the updatecart");

    try {
        const { productId, quantity } = req.body;
        console.log(quantity);
        console.log(productId, "product id is here");

        const user = req.session.user;
        let Cart = await cart.findOne({ user_id: user });

        if (!Cart) {
            Cart = new cart({ user_id: user, items: [] });
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

        const newQuantity = currentQuantityInCart + quantity;
        if (newQuantity > Product.countInstock) {
            return res.status(400).json({ error: 'Requested quantity exceeds available stock' });
        }

        if (productIndex !== -1) {
            if (newQuantity > 0) {
                Cart.items[productIndex].quantity = newQuantity;
            } else {
                Cart.items.splice(productIndex, 1);
            }
        } else if (newQuantity > 0) {
            Cart.items.push({ quantity: newQuantity, product_id: productId });
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
            return res.status(404).render('checkout', { username: userdata.name });
        }

        const cartdata = cartaggregation[0];
        const products = cartdata.products;
        const items = cartdata.items;
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
            coupons: availableCoupons 
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