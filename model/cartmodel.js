const mongoose = require('mongoose')
const  cartSchema  =  mongoose.Schema({
    user_id :{
        type : mongoose.Schema.Types.ObjectId,
        required:true,
         ref:'user',
    },
    items:[{
        product_id:{
             type:mongoose.Schema.Types.ObjectId,
             ref:'product',
             required:true,   
        },
        name:String,
        quantity:{
            type:Number,
            required:true,
            min:1,
            default:1
        },
        price:Number,
        // stock:{
        //     type:Number,
        //     required:true,

        // }
    }],
    billing:{
        type:Number,
        required:true,
        default:0
    },
    timestrap:{
        type:Date,
        default:Date.now
    }
})


module.exports = mongoose.model('cart',cartSchema)