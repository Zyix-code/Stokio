const { allAsync } = require('./database-utils');

module.exports.getLowStockWarnings = async () => {
    return await allAsync(
        'SELECT id, model_code, name, quantity, min_stock FROM products WHERE quantity <= min_stock ORDER BY quantity ASC'
    );
};