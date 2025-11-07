import mongoose from "mongoose";
import { CartModel } from "../models/cart.model.js";

export default class CartManager {
  // Crea un carrito vacío
  async createCart() {
    const cart = await CartModel.create({ products: [] });
    return cart.toObject();
  }

  // Trae carrito por id con productos poblados
  async getCartById(cid) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return null;
    return await CartModel.findById(cid).populate("products.product").lean();
  }

  // Agrega producto (o incrementa quantity si ya existe)
  async addProductToCart(cid, pid) {
    const cart = await CartModel.findById(cid);
    if (!cart) return null;

    const item = cart.products.find((p) => p.product.toString() === pid);
    if (item) {
      item.quantity += 1;
    } else {
      cart.products.push({ product: pid, quantity: 1 });
    }

    await cart.save();
    return await CartModel.findById(cid).populate("products.product").lean();
  }

  // Elimina un producto del carrito
  async removeProductFromCart(cid, pid) {
    const cart = await CartModel.findById(cid);
    if (!cart) return null;

    const before = cart.products.length;
    cart.products = cart.products.filter((p) => p.product.toString() !== pid);
    if (cart.products.length === before) {
      return "NOT_FOUND_ITEM";
    }

    await cart.save();
    return await CartModel.findById(cid).populate("products.product").lean();
  }

  // Actualiza SOLO la cantidad de un producto
  async updateProductQuantity(cid, pid, quantity) {
    const cart = await CartModel.findById(cid);
    if (!cart) return null;
    if (!Number.isFinite(quantity) || quantity <= 0) return "BAD_QTY";

    const item = cart.products.find((p) => p.product.toString() === pid);
    if (!item) return "NOT_FOUND_ITEM";

    item.quantity = quantity;
    await cart.save();
    return await CartModel.findById(cid).populate("products.product").lean();
  }

  // Reemplaza TODO el array de productos
  async updateCartProducts(cid, productsArray) {
    const cart = await CartModel.findById(cid);
    if (!cart) return null;

    if (!Array.isArray(productsArray)) return "BAD_BODY";
    for (const it of productsArray) {
      if (!it?.product || !Number.isFinite(it?.quantity) || it.quantity <= 0) {
        return "BAD_BODY";
      }
    }

    cart.products = productsArray.map((it) => ({
      product: it.product,
      quantity: it.quantity,
    }));

    await cart.save();
    return await CartModel.findById(cid).populate("products.product").lean();
  }

  // Vacía el carrito
  async emptyCart(cid) {
    const cart = await CartModel.findById(cid);
    if (!cart) return null;

    cart.products = [];
    await cart.save();
    return await CartModel.findById(cid).populate("products.product").lean();
  }

  // Elimina el carrito completamente
  async deleteCart(cid) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return null;
    const res = await CartModel.findByIdAndDelete(cid).lean();
    return res ? true : null;
  }
}