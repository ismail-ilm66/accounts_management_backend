const { Decimal } = require('@prisma/client/runtime/library');

class ValidationUtils {
  static validatePositiveNumber(value, fieldName) {
    const num = new Decimal(value);
    if (num.lessThanOrEqualTo(0)) {
      throw new Error(`${fieldName} must be greater than 0`);
    }
  }

  static validateRequired(value, fieldName) {
    if (value === undefined || value === null || value === '') {
      throw new Error(`${fieldName} is required`);
    }
  }

  static validateDate(date, fieldName) {
    if (isNaN(new Date(date).getTime())) {
      throw new Error(`${fieldName} must be a valid date`);
    }
  }

  static validateNonNegative(value, fieldName) {
    const num = new Decimal(value);
    if (num.isNegative()) {
      throw new Error(`${fieldName} cannot be negative`);
    }
  }
}

module.exports = ValidationUtils;
