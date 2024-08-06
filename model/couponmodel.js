const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema ({

    
    couponName:{
        type:String,
        required:true
    },
    couponCode:{
        type:String,
        required:true
    },
    // usagelimit:{
    //     type:String,
    //     required:true
    // },
    Description:{
        type:String,
        required:true
    },
    expirationTime: {
        type: String,
        required: true
    },
     MinimumAmount:{
        type:Number,
        required:true
     },

    offer:{
        type:Number,
        default:0
    },
    created:{
        type:Date,
        default:Date.now
        },
        usagecount:{
            type:Number,
            default:0
        }
   
})

module.exports = mongoose.model('coupon',couponSchema)