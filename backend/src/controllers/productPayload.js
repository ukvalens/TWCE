const normalizeProductPayload = (payload = {}) => {
  const price = payload.price === '' || payload.price == null ? null : parseFloat(payload.price);
  const discountPrice = payload.discount_price === '' || payload.discount_price == null ? null : parseFloat(payload.discount_price);
  const stockQuantity = payload.stock_quantity === '' || payload.stock_quantity == null ? null : parseInt(payload.stock_quantity, 10);
  const categoryId = payload.category_id === '' || payload.category_id == null ? null : parseInt(payload.category_id, 10);
  const brandId = payload.brand_id === '' || payload.brand_id == null ? null : parseInt(payload.brand_id, 10);

  return {
    name: payload.name,
    description: payload.description,
    price,
    discount_price: discountPrice,
    stock_quantity: stockQuantity,
    category_id: categoryId,
    brand_id: brandId,
    status: payload.status,
  };
};

module.exports = { normalizeProductPayload };
