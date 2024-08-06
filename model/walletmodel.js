const mongoose = require("mongoose")
const { Schema } = mongoose;
const walletSchema = mongoose.Schema({
    
    userId:{
        type:Schema.Types.ObjectId,
        required:true,
         unique:true,
         ref:'user'
    },
    balance:{
        type:Number,
        required:true,
        default:0
    },
    history:[{
        amount:{
            type:Number
        },
        type:{
            type:String,
            enum:['credit','debit']
        },
        createdAt: { 
            type: Date, 
            default: Date.now 
        },
        // orderId: {
        //     type: String,
        //     required: true
        // }

    }]
})

module.exports = mongoose.model('Wallet',walletSchema)