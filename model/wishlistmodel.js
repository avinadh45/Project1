const mongoose = require('mongoose')

const { Schema } = mongoose

const wishlistSchema = new mongoose.Schema({
    userId: { type: Schema.Types.ObjectId, required: true },
    product: [{
        productId: { type: Schema.Types.ObjectId, ref: 'product', required: true },
        quantity: {
            type: Number,
            required: true
        }
    }],
    // wish: {
    //     type: String,
    //     required: true
    // }
})

module.exports = mongoose.model("wishlist", wishlistSchema)
