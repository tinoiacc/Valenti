import { promises as fs } from "fs";

const path = "./data/products.json";

export default class ProductManager {
  async getProducts() {
    try {
      const data = await fs.readFile(path, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async getProductById(id) {
    const products = await this.getProducts();
    return products.find(p => p.id === id);
  }

  async addProduct(product) {
    const products = await this.getProducts();
    const newId = products.length > 0 ? products[products.length - 1].id + 1 : 1;

    const newProduct = { id: newId, status: true, ...product };
    products.push(newProduct);

    await fs.writeFile(path, JSON.stringify(products, null, 2));
    return newProduct;
  }

  async updateProduct(id, updateFields) {
    const products = await this.getProducts();
    const index = products.findIndex(p => p.id === id);

    if (index === -1) return null;

    products[index] = { ...products[index], ...updateFields, id };
    await fs.writeFile(path, JSON.stringify(products, null, 2));
    return products[index];
  }

  async deleteProduct(id) {
    let products = await this.getProducts();
    const newProducts = products.filter(p => p.id !== id);

    if (products.length === newProducts.length) return null;

    await fs.writeFile(path, JSON.stringify(newProducts, null, 2));
    return true;
  }
}