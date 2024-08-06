const mongoose  = require('mongoose');
const category = mongoose.Schema({
   category:{
    type:String,
    required:true,
   },
   description:{
      type:String,
      required:true,
   },
   list:{
      type:Boolean,
      default:false
  },
  offer:{
   type:Number,
   default:0
  },
  expirationDate: { 
   type: Date
  },
   
  OfferisActive:{
   type:Boolean,
   default:true
},
offerType: {
   type: String,
   enum: ['fixed', 'percentage'],
   default: 'fixed'
}

})
module.exports = mongoose.model("category", category)