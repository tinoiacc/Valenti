// src/routes/products.router.js
import { Router } from "express";
import mongoose from "mongoose";
import ProductManager from "../DAO/ProductManager.js";

const router = Router();
const productManager = new ProductManager();
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/products  (con paginación + filtros + formato pedido)
router.get("/", async (req, res) => {
  try {
    let { limit = 10, page = 1, sort, query } = req.query;
    limit = Number(limit) || 10;
    page = Number(page) || 1;

    // Filtro sencillo (tolerante a espacios y mayúsculas):
    // - query="category:bebidas"  => { category: /^bebidas$/i }
    // - query="status:true"       => { status: true }
    // - query="texto"             => { $or: [{title:/texto/i},{description:/texto/i},{category:/texto/i}] }
    let filter = {};
    if (query) {
      const qStr = String(query).trim();
      const parts = qStr.split(":");
      if (parts.length === 2) {
        const k = parts[0].trim().toLowerCase();
        const v = parts[1].trim();
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (k === "status") {
          filter.status = String(v).toLowerCase() === "true";
        } else if (k === "category") {
          // Búsqueda exacta por categoría, case-insensitive
          filter.category = new RegExp(`^${esc(v)}$`, "i");
        } else {
          const rx = new RegExp(esc(qStr), "i");
          filter = { $or: [{ title: rx }, { description: rx }, { category: rx }] };
        }
      } else {
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(esc(qStr), "i");
        filter = { $or: [{ title: rx }, { description: rx }, { category: rx }] };
      }
    }

    // Orden por precio
    let sortOpt;
    if (sort === "asc") sortOpt = { price: 1 };
    if (sort === "desc") sortOpt = { price: -1 };

    const result = await productManager.getProducts(filter, {
      limit,
      page,
      sort: sortOpt,
      lean: true,
    });

    const buildLink = (p) =>
      p
        ? `/api/products?limit=${limit}&page=${p}${sort ? `&sort=${sort}` : ""}${
            query ? `&query=${encodeURIComponent(query)}` : ""
          }`
        : null;

    return res.json({
      status: "success",
      payload: result.docs, // productos de la página actual
      totalPages: result.totalPages,
      prevPage: result.prevPage,
      nextPage: result.nextPage,
      page: result.page,
      hasPrevPage: result.hasPrevPage,
      hasNextPage: result.hasNextPage,
      prevLink: buildLink(result.hasPrevPage ? result.prevPage : null),
      nextLink: buildLink(result.hasNextPage ? result.nextPage : null),
    });
  } catch (err) {
    console.error("GET /api/products error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// GET /api/products/:pid
router.get("/:pid", async (req, res) => {
  const id = req.params.pid;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ status: "error", message: "Invalid product id" });
  }
  const product = await productManager.getProductById(id);
  if (!product) {
    return res.status(404).json({ status: "error", message: `Producto con id ${id} no encontrado` });
  }
  return res.json({ status: "success", product });
});

// POST /api/products
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const required = ["title", "description", "code", "price", "stock", "category"];
    for (const f of required) {
      if (data[f] == null || data[f] === "") {
        return res.status(400).json({ status: "error", message: `Falta campo obligatorio: ${f}` });
      }
    }
    const newProduct = await productManager.addProduct(data);

    // Emitir actualización a clientes
    if (req.io) {
      const list = await productManager.getProducts({}, { limit: 10, page: 1, lean: true });
      req.io.emit("productsUpdated", list.docs);
    }

    return res.status(201).json({
      status: "success",
      message: "✅ Producto agregado correctamente",
      product: newProduct,
    });
  } catch (err) {
    console.error("POST /api/products error:", err);
    // código duplicado de 'code' único u otras validaciones
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// PUT /api/products/:pid
router.put("/:pid", async (req, res) => {
  const id = req.params.pid;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ status: "error", message: "Invalid product id" });
  }
  try {
    const updated = await productManager.updateProduct(id, req.body);
    if (!updated) {
      return res.status(404).json({ status: "error", message: `Producto con id ${id} no encontrado` });
    }

    if (req.io) {
      const list = await productManager.getProducts({}, { limit: 10, page: 1, lean: true });
      req.io.emit("productsUpdated", list.docs);
    }

    return res.json({
      status: "success",
      message: `♻️ Producto ${id} actualizado`,
      product: updated,
    });
  } catch (err) {
    console.error("PUT /api/products/:pid error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// DELETE /api/products/:pid
router.delete("/:pid", async (req, res) => {
  const id = req.params.pid;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ status: "error", message: "Invalid product id" });
  }
  try {
    const deleted = await productManager.deleteProduct(id);
    if (!deleted) {
      return res.status(404).json({ status: "error", message: `Producto con id ${id} no encontrado` });
    }

    if (req.io) {
      const list = await productManager.getProducts({}, { limit: 10, page: 1, lean: true });
      req.io.emit("productsUpdated", list.docs);
    }

    return res.json({
      status: "success",
      message: `🗑️ Producto ${id} eliminado correctamente`,
      product: deleted,
    });
  } catch (err) {
    console.error("DELETE /api/products/:pid error:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
