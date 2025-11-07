import { Router } from "express";
import ProductManager from "../DAO/ProductManager.js";
const router = Router();
const productManager = new ProductManager();

// Inicio
router.get("/", async (req, res) => {
  try {
    let { limit = 10, page = 1 } = req.query;
    limit = Number(limit) || 10;
    page = Number(page) || 1;

    const result = await productManager.getProducts({}, { limit, page, lean: true });
    const products = result?.docs ?? [];

    res.render("home", {
      products,
      limit,
      page: result?.page ?? page,
      totalPages: result?.totalPages ?? 1,
      hasPrevPage: result?.hasPrevPage ?? false,
      hasNextPage: result?.hasNextPage ?? false,
      prevPage: result?.prevPage ?? null,
      nextPage: result?.nextPage ?? null,
    });
  } catch (err) {
    console.error("Home render error:", err);
    res.render("home", { products: [], limit: 10, page: 1, totalPages: 1 });
  }
});

router.get("/products", (req, res) => {
  res.render("products");
});

router.get("/products/:pid", async (req, res) => {
  try {
    const product = await productManager.getProductById(req.params.pid);
    if (!product) return res.status(404).render("cartNotFound", { cid: req.params.pid });
    res.render("productDetail", { product });
  } catch (err) {
    res.status(404).render("cartNotFound", { cid: req.params.pid });
  }
});


router.get("/realtimeproducts", (req, res) => {
  res.redirect("/products");
});

export default router;