/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} allowedRoles - 'INDIVIDUAL', 'ORG_ADMIN', 'SUPER_ADMIN'
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.account_type;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(', ')}]. Your role is ${userRole}.`,
      });
    }

    next();
  };
}

export default authorize;
