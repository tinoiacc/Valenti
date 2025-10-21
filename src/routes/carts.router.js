import { Router } from "express";
import CartManager from "../DAO/CartManager.js";
import ProductManager from "../DAO/ProductManager.js";

const router = Router();
const cartManager = new CartManager();
const productManager = new ProductManager("products.json");

// POST CREAR CARRITO
router.post("/", async (req, res) => {
  try {
    const newCart = await cartManager.createCart();
    res.status(201).json({
      message: `Carrito creado correctamente! Numero del carrito: ${newCart.id}`,
      cart: newCart
    });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

// GET 
router.get("/:cid", async (req, res) => {
  const cid = parseInt(req.params.cid);
  const cart = await cartManager.getCartById(cid);

  if (!cart) return res.status(404).json({ error: `Carrito número ${cid} no encontrado` });

  if (cart.products.length === 0) {
    return res.json({ message: `El carrito número ${cid} está vacío` });
  }

  const detailedProducts = await Promise.all(cart.products.map(async (p) => {
    const productInfo = await productManager.getProductById(p.product);
    return {
      id: p.product,
      name: productInfo?.title || "Producto eliminado",
      quantity: p.quantity
    };
  }));

  res.json({
    message: `El carrito con id ${cid} contiene:`,
    products: detailedProducts
  });
});


// POST AGREGAR PRODUCTO
router.post("/:cid/product/:pid", async (req, res) => {
  const cid = parseInt(req.params.cid);
  const pid = parseInt(req.params.pid);

  try {
    const cart = await cartManager.getCartById(cid);
    if (!cart) return res.status(404).json({ error: `Carrito con id ${cid} no encontrado` });

    const product = await productManager.getProductById(pid);
    if (!product) return res.status(404).json({ error: `Producto con id ${pid} no existe` });

    const updatedCart = await cartManager.addProductToCart(cid, pid);

    res.status(200).json({
      message: `Producto con id ${pid} agregado correctamente al carrito ${cid}`,
      cart: updatedCart
    });

  } catch (error) {
    res.status(500).json({ error: "Error en el servidor", details: error.message });
  }
});

export default router;