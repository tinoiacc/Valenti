import { Router } from "express";
import mongoose from "mongoose";
import CartManager from "../DAO/CartManager.js";

const router = Router();
const cartManager = new CartManager();

router.get("/carts/:cid", async (req, res) => {
  try {
    const { cid } = req.params;
    if (!mongoose.Types.ObjectId.isValid(cid)) {
      return res.status(404).render("cartNotFound", { cid });
    }
    const cart = await cartManager.getCartById(cid);

    if (!cart) {
      return res.status(404).render("cartNotFound", { cid });
    }

    return res.render("cart", { cart });
  } catch (err) {
    console.error("View cart error:", err);
    return res.status(404).render("cartNotFound", { cid: req.params.cid });
  }
});

export default router;
