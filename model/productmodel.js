const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const { schema } = require('./otpmodel')
const product = mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    discription:{
        type:String,
        required:true
    },
    image:{
        type:Array,
        required:true
    },
    brand:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
         ref:'category',
        required:true
    },
    countInstock:{
        type:Number,
        required:true,
        min:0,
        max:255
    },
    Listed:{
        type:Boolean,
        default:false
    },
    Verified:{
     
        type:Boolean,
        default:true
    },
    offer:{
        type:Number,
        default:0,
        required:true
    },
    orginalprice:{
        type:Number
    },
    reviews:[{
        name:{type:String,required:true},
        rating:{type:Number,required:true},
        comment:{type:String,required:true},
        user:{
            type: Schema.Types.ObjectId,
        required: true,
        ref:"user"

        }
    }]

})
module.exports = mongoose.model("product",product)