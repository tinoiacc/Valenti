import { Router } from "express";
import mongoose from "mongoose";
import CartManager from "../DAO/CartManager.js";

const router = Router();
const cartManager = new CartManager();

// Helpers
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

async function productExists(pid) {
  if (!isValidObjectId(pid)) return false;
  if (mongoose.models && mongoose.models.Product) {
    const Product = mongoose.models.Product;
    const doc = await Product.findById(pid).select({ _id: 1 }).lean();
    return !!doc;
  }
  const coll = mongoose.connection.db?.collection("products");
  if (!coll) return false;
  const doc = await coll.findOne({ _id: new mongoose.Types.ObjectId(pid) }, { projection: { _id: 1 } });
  return !!doc;
}

async function emitCartUpdated(req, cid) {
  try {
    const fresh = await cartManager.getCartById(cid);
    if (fresh && req.io) req.io.emit("cartUpdated", { cid, cart: fresh });
  } catch {}
}

// POST /api/carts/ -> crear carrito vacío
router.post("/", async (req, res) => {
  try {
    const cart = await cartManager.createCart();
    const cid = String(cart?._id || "");
    if (cid) await emitCartUpdated(req, cid);
    return res.status(201).json({ status: "success", cart });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// GET /api/carts/:cid -> devolver carrito con populate
router.get("/:cid", async (req, res) => {
  const cid = req.params.cid;
  try {
    if (!isValidObjectId(cid)) {
      return res.status(400).json({ status: "error", message: "Invalid cart id" });
    }
    const cart = await cartManager.getCartById(cid);
    if (!cart) return res.status(404).json({ status: "error", message: "Cart not found" });
    return res.json({ status: "success", cart });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// POST /api/carts/:cid/products/:pid -> agregar producto o incrementar quantity
router.post("/:cid/products/:pid", async (req, res) => {
  const cid = req.params.cid;
  const pid = req.params.pid;
  try {
    if (!isValidObjectId(cid)) {
      return res.status(400).json({ status: "error", message: "Invalid cart id" });
    }
    if (!isValidObjectId(pid)) {
      return res.status(400).json({ status: "error", message: "Invalid product id" });
    }
    const existsCart = await cartManager.getCartById(cid);
    if (!existsCart) return res.status(404).json({ status: "error", message: "Cart not found" });

    const existsProd = await productExists(pid);
    if (!existsProd) return res.status(404).json({ status: "error", message: "Product not found" });

    const updated = await cartManager.addProductToCart(cid, pid);
    await emitCartUpdated(req, cid);
    return res.json({ status: "success", cart: updated });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// DELETE /api/carts/:cid/products/:pid -> eliminar producto del carrito
router.delete("/:cid/products/:pid", async (req, res) => {
  const cid = req.params.cid;
  const pid = req.params.pid;
  try {
    if (!isValidObjectId(cid)) {
      return res.status(400).json({ status: "error", message: "Invalid cart id" });
    }
    if (!isValidObjectId(pid)) {
      return res.status(400).json({ status: "error", message: "Invalid product id" });
    }
    const updated = await cartManager.removeProductFromCart(cid, pid);
    if (updated === null) return res.status(404).json({ status: "error", message: "Cart not found" });
    if (updated === "NOT_FOUND_ITEM") return res.status(404).json({ status: "error", message: "NOT_FOUND_ITEM" });
    await emitCartUpdated(req, cid);
    return res.json({ status: "success", cart: updated });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// PUT /api/carts/:cid -> reemplazar todo el array products
router.put("/:cid", async (req, res) => {
  const cid = req.params.cid;
  try {
    if (!isValidObjectId(cid)) {
      return res.status(400).json({ status: "error", message: "Invalid cart id" });
    }
    const { products } = req.body || {};
    const updated = await cartManager.updateCartProducts(cid, products);
    if (updated === null) return res.status(404).json({ status: "error", message: "Cart not found" });
    if (updated === "BAD_BODY") return res.status(400).json({ status: "error", message: "BAD_BODY" });
    await emitCartUpdated(req, cid);
    return res.json({ status: "success", cart: updated });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// PUT /api/carts/:cid/products/:pid -> modificar SOLO quantity
router.put("/:cid/products/:pid", async (req, res) => {
  const cid = req.params.cid;
  const pid = req.params.pid;
  try {
    if (!isValidObjectId(cid)) {
      return res.status(400).json({ status: "error", message: "Invalid cart id" });
    }
    if (!isValidObjectId(pid)) {
      return res.status(400).json({ status: "error", message: "Invalid product id" });
    }
    const { quantity } = req.body || {};
    const updated = await cartManager.updateProductQuantity(cid, pid, Number(quantity));
    if (updated === null) return res.status(404).json({ status: "error", message: "Cart not found" });
    if (updated === "BAD_QTY") return res.status(400).json({ status: "error", message: "BAD_QTY" });
    if (updated === "NOT_FOUND_ITEM") return res.status(404).json({ status: "error", message: "NOT_FOUND_ITEM" });
    await emitCartUpdated(req, cid);
    return res.json({ status: "success", cart: updated });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// DELETE /api/carts/:cid/hard -> eliminar carrito (documento)
router.delete("/:cid/hard", async (req, res) => {
  const cid = req.params.cid;
  try {
    if (!isValidObjectId(cid)) {
      return res.status(400).json({ status: "error", message: "Invalid cart id" });
    }
    const ok = await cartManager.deleteCart(cid);
    if (!ok) return res.status(404).json({ status: "error", message: "Cart not found" });
    if (req.io) req.io.emit("cartDeleted", { cid });
    return res.json({ status: "success", deleted: true });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// DELETE /api/carts/:cid -> vaciar carrito
router.delete("/:cid", async (req, res) => {
  const cid = req.params.cid;
  try {
    if (!isValidObjectId(cid)) {
      return res.status(400).json({ status: "error", message: "Invalid cart id" });
    }
    const updated = await cartManager.emptyCart(cid);
    if (!updated) return res.status(404).json({ status: "error", message: "Cart not found" });
    await emitCartUpdated(req, cid);
    return res.json({ status: "success", cart: updated });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

export default router;
