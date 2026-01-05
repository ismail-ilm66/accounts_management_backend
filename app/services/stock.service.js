const BaseService = require('./base.service');
const ValidationUtils = require('../utils/validation.util');

class StockService extends BaseService {
  /**
   * Update stock quantity and create movement record
   * @param {Object} data 
   * @param {Object} [tx] 
   */
  async updateStock(data, tx) {
    const client = this.getTx(tx);
    const {
      productId,
      quantity, // Positive for addition, negative for deduction
      movementType,
      referenceType,
      referenceId,
      costPrice,
      notes,
      movementDate
    } = data;

    ValidationUtils.validateRequired(productId, 'Product ID');
    ValidationUtils.validateRequired(quantity, 'Quantity');
    ValidationUtils.validateRequired(movementType, 'Movement Type');

    const product = await client.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const currentStock = Number(product.currentStock);
    const changeQty = Number(quantity);
    const newStock = currentStock + changeQty;

    // Validate negative stock
    if (newStock < 0) {
      throw new Error(`Insufficient stock for product ${product.name}. Current: ${currentStock}, Requested reduction: ${Math.abs(changeQty)}`);
    }

    // Update Product
    await client.product.update({
      where: { id: productId },
      data: { currentStock: newStock }
    });

    // Create Movement
    return await client.stockMovement.create({
      data: {
        productId,
        movementType,
        referenceType,
        referenceId,
        quantity: changeQty,
        costPrice: costPrice || product.costPrice,
        balanceBefore: currentStock,
        balanceAfter: newStock,
        movementDate: new Date(movementDate || new Date()),
        notes
      }
    });
  }

  async getStockValuation(businessId, tx) {
    const client = this.getTx(tx);
    // Simple valuation: sum(currentStock * costPrice)
    // Note: This is an approximation. FIFO/LIFO/Weighted Average would be more complex.
    // For now we assume costPrice on product is the Weighted Average Cost.
    
    const products = await client.product.findMany({
      where: { businessId, isActive: true }
    });

    const totalValue = products.reduce((sum, p) => {
      return sum + (Number(p.currentStock) * Number(p.costPrice));
    }, 0);

    return totalValue;
  }
}

module.exports = StockService;
