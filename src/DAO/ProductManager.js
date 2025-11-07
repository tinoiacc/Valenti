import mongoose from "mongoose";
import ProductModel from "../models/product.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export default class ProductManager {
  /**
   * GET con filtros y paginación
   * @param {Object} filter  Filtro Mongoose
   * @param {Object} options { limit, page, sort, lean }
   *   - sort: ej { price: 1 } o { price: -1 }
   */
  async getProducts(filter = {}, options = {}) {
    const { limit = 10, page = 1, sort, lean = true } = options;
    const opts = { limit, page, sort, lean };
    return await ProductModel.paginate(filter, opts);
  }

  async getProductById(id) {
    if (!isValidObjectId(id)) return null;
    return await ProductModel.findById(id).lean();
  }

  async addProduct(product) {
    // Normalización mínima 
    if (product.price != null)  product.price  = Number(product.price);
    if (product.stock != null)  product.stock  = Number(product.stock);
    if (!Array.isArray(product.thumbnails)) product.thumbnails = product.thumbnails ? [product.thumbnails] : [];

    // Validación liviana 
    const required = ["title","description","code","price","stock","category"];
    for (const f of required) {
      if (product[f] == null || product[f] === "") {
        const err = new Error(`Campo obligatorio faltante: ${f}`);
        err.code = "BAD_BODY";
        throw err;
      }
    }

    return await ProductModel.create(product);
  }

  async updateProduct(id, update) {
    if (!isValidObjectId(id)) return null;

    const next = { ...update };
    if ("price" in next) next.price = Number(next.price);
    if ("stock" in next) next.stock = Number(next.stock);
    if ("thumbnails" in next && !Array.isArray(next.thumbnails)) {
      next.thumbnails = next.thumbnails ? [next.thumbnails] : [];
    }

    // Nunca permitir cambiar el _id
    delete next._id;
    delete next.id;

    return await ProductModel.findByIdAndUpdate(id, next, { new: true, runValidators: true }).lean();
  }

  async deleteProduct(id) {
    if (!isValidObjectId(id)) return null;
    return await ProductModel.findByIdAndDelete(id).lean();
  }
}