const mongoose = require('mongoose')
const AddressSchema = mongoose.Schema({
    userId: {
        type: String,
        ref: 'User',
        required: true
    },
    Address:[{
        addresstype:{
            type:String,
            enum: ['home', 'work'],
            required: true,
        },
        name:{
            type:String,
            required:true,
        },
       phone:{
           type:Number,
           required:true,
       },
       pincode:{
        type:Number,
        required:true,
       },
       address:{
        type:String,
        required:true,
       },

       state:{
        type:String,
        required:true,
       },
       town:{
        type:String,
        required:true,
       },
       altphone:{
        type:Number,
        required:true,
       }
    }]
})
module.exports = mongoose.model('Address',AddressSchema)