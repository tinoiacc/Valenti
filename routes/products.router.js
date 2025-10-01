import { Router } from "express";
import ProductManager from "../managers/ProductManager.js";

const router = Router();
const productManager = new ProductManager();

// GET 
router.get("/", async (req, res) => {
  try {
    const products = await productManager.getProducts();

   
    if (products.length === 0) {
      return res.json({ message: "No hay productos cargados en el sistema." });
    }

    res.json({
      message:  `Los productos cargados son (${products.length})`,
      products: JSON.parse(JSON.stringify(products, null, 2))
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los productos: " + error.message });
  }
});


// GET by ID
router.get("/:pid", async (req, res) => {
  const id = parseInt(req.params.pid);
  const product = await productManager.getProductById(id);

  product ? res.json(product) : res.status(404).json({ error: `No hay un producto con el id= ${id} ` });
});

// POST
router.post("/", async (req, res) => {
  const product = req.body;

  if (
    !product.title ||
    !product.description ||
    !product.code ||
    !product.price ||
    !product.stock ||
    !product.category
  ) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    const newProduct = await productManager.addProduct(product);

    res.status(201).json({
      message: "Producto agregado correctamente :)",
      product: newProduct
    });
  } catch (error) {
    res.status(500).json({ error: "Error al agregar producto: " + error.message });
  }
});

// PUT 
router.put("/:pid", async (req, res) => {
  try {
    const id = parseInt(req.params.pid);
    const update = req.body;

    const updatedProduct = await productManager.updateProduct(id, update);

    if (updatedProduct) {
      res.json({
        message: "Producto actualizado correctamente",
        product: updatedProduct
      });
    } else {
      res.status(404).json({
        error: `Producto con id= ${id} NO encontrado`
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Error al actualizar el producto: " + error.message
    });
  }
});

// DELETE 
router.delete("/:pid", async (req, res) => {
  const id = parseInt(req.params.pid);
  const result = await productManager.deleteProduct(id);

  result ? res.json({ message: `Producto con el id= ${id} ha sido ELIMINADO ` }) : res.status(404).json({ error: `Producto con id= ${id} NO encontrado` });
});

export default router;