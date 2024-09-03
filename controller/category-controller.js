const Category = require('../model/categorymodel')
const Product = require('../model/productmodel')
const adcategory=async(req,res)=>{
    try {
      const categories=await Category.find({})
        res.render('admin-category',{category:categories})
    } catch (error) {
    console.log(error.message);        
    }
}
const addcategory = async (req,res)=>{
  console.log(req.body,"cat data");
    try {
      const categoryLowercase = req.body.category.toLowerCase();
      const existingCategory = await Category.findOne({ category: req.body.category });
        if (existingCategory) {
            return res.status(400).json({ success: false, error: 'Category already exists' });
          
        }
        const existingCategoryWithSameName = await Category.findOne({ category: { $regex: new RegExp('^' + categoryLowercase + '$', 'i') } });
        if (existingCategoryWithSameName) {
          return res.status(400).json({ success: false, error: 'Category with similar name already exists' });
      }

      
    const category = new Category({
          category:req.body.category,
          description:req.body.description
                })
                console.log(category,"ygfhgfyt");
         await category.save()
        res.status(200).send({success:true,data:category})
        console.log(Category);
      
    } catch (error) {
      console.log(error.message);    
    }
} 
const getcategory = async(req,res)=>{
  try {
    const categorys = await Category.find()
    // console.log(categorys,"inget");
    res.status(200).json({ success: true, data: categorys });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
} 

const editcategory = async (req, res) => {
  try {
    const { category, description, id } = req.body;

    const trimmedCategory = category.trim();

    const existingCategory = await Category.findOne({ _id: { $ne: id },category: { $regex: new RegExp('^' + trimmedCategory + '$', 'i') } });

    if (existingCategory) {
      return res.status(400).json({ success: false, error: 'Category already exists' });
    }
    const updatedCategory = await Category.findByIdAndUpdate(id, { $set: { category: trimmedCategory, description } }, { new: true });

    if (!updatedCategory) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.status(200).json({ success: true, data: updatedCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

const deletecategory = async (req,res)=>{
  try {
    const categoryId = req.params.id;
    const deletedCategory = await Category.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
        return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.status(200).json({ success: true, data: deletedCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
}
const list = async (req,res)=>{
  try {
    console.log(req.query.id,"for list");
    const listcategory = await Category.findOneAndUpdate(
      { _id: req.query.id }, 
      { $set: { list: false } }, 
      { new: true } 
  );
  
    console.log("listed");
    return res.status(200).json({
      success:true,
  })
    
  } catch (error) {
    console.log(error.message);
  }
}
const unlist  = async(req,res)=>{
  try {
    console.log(req.query.id,"unlist");
    const listcategory = await Category.findByIdAndUpdate(
      req.query.id,
      { $set: { list: true } },
      { new: true }
  );
  
     return res.status(200).json({
      success:true,
    })
  } catch (error) {
    console.log(error.message); 
  }
   
}


let originalPriceCache = {};

const categoryoffer = async(req,res)=>{

  console.log("hi from the add ");
  try {
    let percentage = parseInt(req.body.percentage);
    let categoryId = req.body.categoryId
    console.log(percentage,"this is here");
    console.log(categoryId,"cat id ");

    if(percentage >= 95){
      res.json({ status:false,message: "Offer can be applied only below 90 percent" });
    }
    let categorydata = await Category.findOne({_id:categoryId})
    await Category.updateOne(
      { _id: categoryId },
      {
          $set: {
              offer: percentage
          }
      }
  )
  .then(data => {
      console.log(data);
      console.log("categoryOffer added");
  });
  let productData = await Product.find({category:categoryId})

    for(let  Product of productData){
      
      Product.orginalprice = Product.price
 
      let originalprice=Product.orginalprice
  
      Product.price -= Math.floor(Product.price * (percentage / 100));
    
      await Product.save();
      
    }

    res.json({ status: true });
  } catch (error) {
    console.log(error.message);
  }
}

  const removeoffer = async(req,res)=>{
    try {
      const categoryId = req.body.categoryId;

        const category = await Category.findOne({ _id: categoryId });

        const percentage = category.offer;

        const productData = await Product.find({ category: categoryId});

        if (productData.length > 0) {
          for (const product of productData) {
              const originalprice =product.orginalprice;
              if (originalprice) {
                  product.price = originalprice; 
                  await product.save();
              } else {
                  console.log("Original price not found for product:", product._id);
              }
          }
      }
      category.offer= 0;
      await category.save();

     
      originalPriceCache = {};

      res.json({ status: true });
    } catch (error) {
      
    }
  }



module.exports = {
    adcategory,
    addcategory,
    getcategory,
    editcategory,
    deletecategory,
    list,
    unlist,
    categoryoffer,
    removeoffer 
}