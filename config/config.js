
require('dotenv').config();

const config = {
    secret_jwt :"secrectjwtkey",
    emailUser :process.env.email,
    emailpassword:process.env.password
}

module.exports = {
    config
}
  
