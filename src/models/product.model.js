import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const productSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  code:        { type: String, required: true, unique: true, index: true, trim: true },
  price:       { type: Number, required: true, min: 0 },
  status:      { type: Boolean, default: true },
  stock:       { type: Number, required: true, min: 0 },
  category:    { type: String, required: true, trim: true },
  thumbnails:  { type: [String], default: [] },
}, { timestamps: true });

productSchema.plugin(mongoosePaginate);

const ProductModel = mongoose.models.Product || mongoose.model("Product", productSchema);
export default ProductModel;