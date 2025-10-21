const socket = io();

socket.on("productsUpdated", (products) => {
  const productList = document.getElementById("productList");
  productList.innerHTML = ""; 


  products.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>ID:</strong> ${p.id} | <strong>Nombre:</strong> ${p.title} - <strong>Precio:</strong> $${p.price}`;
    productList.appendChild(li);
  });
});


document.getElementById("addProductForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const product = {
    title: e.target.title.value,
    description: e.target.description.value,
    code: e.target.code.value,
    price: parseFloat(e.target.price.value),
    stock: parseInt(e.target.stock.value),
    category: e.target.category.value,
    thumbnails: []
  };

  socket.emit("newProduct", product);
  e.target.reset();
});


document.getElementById("deleteProductForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = e.target.deleteId.value; 
  socket.emit("deleteProduct", id);   
  e.target.reset();
});