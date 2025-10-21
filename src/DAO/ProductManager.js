import { promises as fs } from "fs";

export default class ProductManager {
  constructor() {
    this.path = "./src/data/products.json"; 
  }

  async getProducts() {
    try {
      const data = await fs.readFile(this.path, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

 async addProduct(product) {
  const products = await this.getProducts();
  const newId = products.length > 0 ? products[products.length - 1].id + 1 : 1;
  const newProduct = { id: newId, status: true, ...product };

  products.push(newProduct);

  const tempPath = `${this.path}.tmp`; 
  try {
    await fs.writeFile(tempPath, JSON.stringify(products, null, 2));
    await fs.rename(tempPath, this.path);

    console.log(`Producto agregado correctamente (id: ${newId})`);
    return newProduct;
  } catch (error) {
    console.error("Error al agregar producto:", error);
  }
}


 async deleteProduct(id) {
  const products = await this.getProducts();
  const index = products.findIndex(p => p.id === id);

  if (index === -1) {
    console.log(`No se encontró el producto con id ${id}`);
    return;
  }

  products.splice(index, 1);

  const tempPath = `${this.path}.tmp`; // archivo temporal

  try {
    
    await fs.writeFile(tempPath, JSON.stringify(products, null, 2));

   
    await fs.rename(tempPath, this.path);

    console.log(`Producto con id ${id} eliminado correctamente`);
  } catch (error) {
    console.error("Error al eliminar producto:", error);
  }
}
}