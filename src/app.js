import express from "express";
import { Server } from "socket.io";
import handlebars from "express-handlebars";
import ProductManager from "./DAO/ProductManager.js";
import productsRouter from "./routes/products.router.js";
import cartsRouter from "./routes/carts.router.js";

const app = express();
const PORT = 8080;

// Instancias necesarias
const productManager = new ProductManager();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.engine("handlebars", handlebars.engine());
app.set("view engine", "handlebars");
app.set("views", "./views");

app.use("/api/products", productsRouter);
app.use("/api/carts", cartsRouter);

import viewsRouter from "./routes/views.router.js";
app.use("/", viewsRouter);

const httpServer = app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

const io = new Server(httpServer);


io.on("connection", async (socket) => {

  // ENVIAR PRODUCTOS AL INICIO
  const initialProducts = await productManager.getProducts();
  socket.emit("productsUpdated", initialProducts);

  // AGREGAR PRODUCTO
  socket.on("newProduct", async (data) => {
    await productManager.addProduct(data);
    const products = await productManager.getProducts();
    io.emit("productsUpdated", products);
  });

  // ELIMINAR PRODUCTO
  socket.on("deleteProduct", async (id) => {
    const productId = parseInt(id, 10); // asegurar que sea número
    await productManager.deleteProduct(productId);
    const products = await productManager.getProducts();
    io.emit("productsUpdated", products);
  });
});