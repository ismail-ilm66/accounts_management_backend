const prisma = require('../database/prisma');

class BaseService {
  constructor(db = prisma) {
    this.db = db;
  }


  async executeTransaction(callback) {
    return this.db.$transaction(async (tx) => {
      return await callback(tx);
    });
  }


  getTx(tx) {
    return tx || this.db;
  }
}

module.exports = BaseService;
