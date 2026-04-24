import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../lib/auth.js'

export const authenticateToken = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    })

    if (!session?.user) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      accountType: session.user.accountType || 'user',
      adminRole: session.user.adminRole || null,
      name: session.user.name
    }
    req.session = session.session

    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session', error: error.message })
  }
}

export const authorizeProductAdmins = (req, res, next) => {
  if (req.user?.accountType !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  const allowedRoles = ['manager', 'inventory', 'catalog_editor']
  if (!allowedRoles.includes(req.user?.adminRole)) {
    return res.status(403).json({ message: 'Insufficient admin role' })
  }

  return next()
}
