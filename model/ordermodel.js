const mongoose = require('mongoose')
const orderschema = mongoose.Schema({

    orderId: {
        type: String,
        required: true,
        unique: true
},
product:{
    type :Array,
    required:true,
    ref:'product',
},
totalprice:{
    type:Number,
   required:true,
},
Address:{
    type:Array,
    required:true,
},
payment:{
    type:String,
    required:true,
},
paymentstatus:{
    type:String,
    required:true,
},
status:{
    type:String,
    required:true,
},
userId:{
   type:String,
   required:true,
},
placed:{
    type:Date,
    required:true,
},
date:{
    type:String,
},
Order_verified:{
    type:Boolean,
    default:true
  },
  returnReason: {
    type: String,
    default: ''
},
coupon:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'coupon',
    default:null
}
  
})
module.exports = mongoose.model("order",orderschema)