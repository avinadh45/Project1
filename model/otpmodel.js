// otpmodel.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    userId: {
        type: String,
        ref: 'User',
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '5m' 
    }
});

const OTP = mongoose.model('OTP', otpSchema);


OTP.generateAndSaveOTP = async function(userId,email) {
    const otp = Math.floor(100000 + Math.random() * 900000); 
   console.log(otp);
    const otpEntry = new OTP({
        userId: userId,
        email:email,
        otp: otp
    });
    await otpEntry.save();

    return otp;
};


OTP.verifyOTP = async function(userId, otp) {
    const otpEntry = await OTP.findOne({ userId: userId, otp: otp });

    if (otpEntry) {
       
        const currentTime = new Date();
        const otpCreationTime = otpEntry.createdAt;
        const otpExpirationTime = new Date(otpCreationTime.getTime() + (5 * 60 * 1000)); 
        if (currentTime <= otpExpirationTime) {
            
            return true;
        } else {
            
            return false;
        }
    } else {
        
        return false;
    }
};



OTP.resendOTP = async function(userId) {
 
   
  
    return await OTP.generateAndSaveOTP(userId);
};

module.exports = OTP;