const { allAsync } = require('./database-utils');

module.exports.getLogs = async (user_id, role, limit) => {
    let sql = `SELECT al.action, al.details, al.created_at, u.username as user_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id`;
    const params = [];
    if (user_id) {
        sql += ` WHERE al.user_id = ? `;
        params.push(user_id);
    }
    sql += ` ORDER BY al.created_at DESC LIMIT ?`;
    params.push(limit ? parseInt(limit) : 100);
    return await allAsync(sql, params);
};

module.exports.getDashboardLogs = async () => {
    const sql = `SELECT al.action, al.details, al.created_at, u.username as user_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 5`;
    return await allAsync(sql);
};