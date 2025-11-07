import express from "express";
import { Server } from "socket.io";
import handlebars from "express-handlebars";
import mongoose from "mongoose";
import ProductManager from "./DAO/ProductManager.js";
import productsRouter from "./routes/products.router.js";
import cartsRouter from "./routes/carts.router.js";
import viewsRouter from "./routes/views.router.js";
import cartViewsRouter from "./routes/cart.views.router.js";

import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));


const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const VIEWS_PATH = path.join(__dirname, "../views");

const PUBLIC_PATH  = path.join(__dirname, "../public");

app.use(express.static(PUBLIC_PATH));

app.engine("handlebars", handlebars.engine({
  defaultLayout: "main",
  layoutsDir: path.join(VIEWS_PATH, "layouts"),
  partialsDir: path.join(VIEWS_PATH, "partials"),
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  },
}));
app.set("view engine", "handlebars");
app.set("views", VIEWS_PATH);


// Mongoose y MongoDB

mongoose.connect("mongodb+srv://santinovalenti:5MxwhH5lZLN3EFMR@cluster0.kuvbp5a.mongodb.net/?appName=Cluster0")
.then(()=>{
  console.log("Conectado a la base de datos de Mongo Atlas")
})
.catch(error=>{
  console.error("La conexion no se ha podido realizar")
});


const productManager = new ProductManager();

// Middlewares basicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));


// Handlebars
app.engine(
  "handlebars",
  handlebars.engine({
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    },
  })
);
app.set("view engine", "handlebars");
app.set("views", "./views");

// HTTP server + Socket.io
const httpServer = app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
const io = new Server(httpServer);

// Middleware para compartir io con las rutas
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routers
app.use("/api/products", productsRouter);
app.use("/api/carts", cartsRouter);
app.use("/", cartViewsRouter);
app.use("/", viewsRouter);


io.on("connection", async (socket) => {
  const initialProducts = await productManager.getProducts();
  socket.emit("productsUpdated", initialProducts);
});