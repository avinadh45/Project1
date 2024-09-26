const product = require('../model/productmodel')
const category=require('../model/categorymodel')
const fs = require('fs')
// const sharp = require('sharp')
const productpage  = async(req,res)=>{
    try { 
        console.log("products");
        const categorydata=await category.find({})
        res.render('products',{category:categorydata})
        
    } catch (error) {
        
    }
}

 const addProduct = async (req, res) => {
        console.log('log is there');
        try {
            console.log(req.body, "product body");
            console.log(req.files, "uploaded files");
    
            const { name, discription, brand, price, category, countInstock } = req.body;
    
            const categoryId = category[1];
            if (!req.files || req.files.length === 0) {
                throw new Error('No images uploaded');
            }
            const images = [];
    
            for (let i = 0; i < req.files.length; i++) {
                const filename = req.files[i].filename; 
             
                if (!req.files[i].mimetype.startsWith('image')) {
                    throw new Error('Uploaded file is not an image');
                }
                images.push(filename);
            }
            const croppedImageData = req.body.croppedImage;
console.log(croppedImageData,"hel")
            
            // images.push(croppedImageData);
    
            const newProduct = new product({
                name: name,
                discription: discription,
                image: images,
                brand: brand,
                price: price,
                category: categoryId,
                countInstock: countInstock,
                
            });
    
            await newProduct.save();
            
            console.log("Product added successfully!");
            res.status(200).send("Product added successfully!");
            
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Error adding product");
        }
    };
   
    const productlist = async (req, res) => {
        console.log("Reached productlist function hahaha"); 
        try {
            let page = parseInt(req.query.page) || 1; 
            const limit = 4;
            const searchTerm = req.query.search ? req.query.search.trim() : ''; 

            console.log(searchTerm,"what is here boi");
    
          
            const query = searchTerm ? { name: { $regex: new RegExp(searchTerm, 'i') } } : {}; 
    
            const productdata = await product.find(query)
                .limit(limit)
                .skip((page - 1) * limit)
                .exec();
    
            const count = await product.countDocuments(query);
            const totalpages = Math.ceil(count / limit);
    
            res.render('productlist', {
                products: productdata,
                totalpages: totalpages,
                currentpage: page,
                search: searchTerm 
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Internal Server Error'); 
        }
    };
    
    


const editpropage = async(req,res)=>{
    try {
        const proId = req.params.id;
        const productdata=await product.findOne({_id:proId})
        console.log("checking for",productdata);
        if (!productdata) {
            return res.render('editproduct', { error: 'Product not found' });
        }
        const categorydata=await category.findOne({_id:productdata.category})
        const catdata=await category.find({}) 
      
       res.render('editproduct',{product:productdata,category:categorydata,categorys:catdata}) 
    } catch (error) {
        console.log(error.message);
    }
}



const updateProduct = async (req, res) => {
   
    try {
        const productId = req.params.id;

       
        if (!req.files || req.files.length === 0) {
            
            const { name, discription, brand, price, selectedCategory, countInstock } = req.body;
            console.log(selectedCategory);
            const categorys = await category.findOne({_id:selectedCategory });

            if (!categorys) {
         
                return res.render('editproduct',{ error: 'Category not found' });
            }

            const categoryId = categorys._id;

            const updatedProduct = await product.findByIdAndUpdate(
                productId,
                { name, discription, brand, price, category: categoryId , countInstock },
                { new: true }
            );

            if (!updatedProduct) {
               
                return res.render('editproduct',{  error: 'Product not found' });
            }

            //return res.render('editproduct',{ success: 'product updated ', product:updatedProduct,category:categorys,categorys,data: updatedProduct });
        }

       
        const { name, discription, brand, price, selectedCategory, countInstock } = req.body;

        const categorys = await category.findOne({ _id: selectedCategory });

        if (!categorys) {
            // console.log("no cat");
            return res.render('editproduct',{error: 'Category not found' });
        }

        const categoryId = categorys._id;

        const images = [];
        for (let i = 0; i < req.files.length; i++) {
            const filename = req.files[i].filename;
            if (!req.files[i].mimetype.startsWith('image')) {
              
                return res.status(400).render('editproduct',{error: 'Uploaded file is not an image' });
            }
            images.push(filename);
        }

        const updatedProduct = await product.findByIdAndUpdate(
            productId,
            { name, discription, brand, price, category: categoryId, countInstock, $addToSet: { image: { $each: images } }},
            { new: true }
        );

        if (!updatedProduct) {
          
            return res.render('editproduct',{error: 'Product not found' });
        }

res.redirect('/admin/productlist')
    } catch (error) {
        console.error('Error updating product:', error);
      
    }
};




 const deleteproduct = async(req,res)=>{
    try {
        const productId = req.params.id;
        const deleteproduct = await product.findByIdAndDelete(productId)
        if(!deleteproduct){
            return res.status(404).json({ success: false, error: 'product not found' });
        }
        res.redirect('/admin/productlist')
        // res.status(200).json({ success: true, data: deleteproduct });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
 }
 const getproductdata = async (req,res)=>{
     try {
         const products = await product.find({});

        res.json({ products });
     } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Error fetching product data' });
     }
 }
 const listProduct = async (req, res) => {
    try {
        console.log("Product listed");
        console.log(req.query.id, "Product listing");

        const productData = await product.findOneAndUpdate(
            { _id: req.query.id },
            {
                $set: {
                    Listed: true 
                }
            }
        );

        console.log("Product is listed");
        return res.status(200).json({
            success: true,
            // msg: error.message
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

const unlistProduct = async (req, res) => {
    try {
        console.log("Product unlisted");
        console.log(req.query.id, "Product unlisting");

        const productData = await product.findOneAndUpdate(
            { _id: req.query.id },
            {
                $set: {
                    Listed: false 
                }
            }
        );

        console.log("Product is unlisted");
        return res.status(200).json({
            success: true,
            // msg: error.message
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

const deleteSingleImage = async (req, res) => {
    try {
        const { productId, filename } = req.body;

        const Product = await product.findById(productId);

        if (!Product) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        const imageIndex = Product.image.findIndex(img => img === filename);

        if (imageIndex === -1) {
            return res.status(404).json({ success: false, error: "Image not found in the product" });
        }

        Product.image.splice(imageIndex, 1);

        await Product.save();

        const filePath = `public/productimage/${filename}`;

        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error("Error deleting file:", err);
                    return res.status(500).json({ success: false, error: "Error deleting file" });
                }
                return res.status(200).json({ success: true, message: "Image deleted successfully" });
            });
        } else {
            console.log("File not found:", filePath);
            return res.status(404).json({ success: false, error: "File not found" });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

 


module.exports = {
    productpage,
    // creatproduct,
    productlist,
    addProduct,
    deleteproduct,
    getproductdata,
    listProduct,
    unlistProduct,
    editpropage,
    updateProduct,
    deleteSingleImage,
    // deleteimage
  
}