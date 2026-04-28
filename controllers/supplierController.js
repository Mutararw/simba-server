import { prisma } from '../lib/prisma.js'

export const getSuppliers = async (req, res) => {
  try {
    const branchId = req.user.branchId || req.query.branchId
    const where = branchId ? { branchId } : {}
    const suppliers = await prisma.supplier.findMany({ where })
    res.json(suppliers)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch suppliers', error: error.message })
  }
}

export const createSupplier = async (req, res) => {
  try {
    const { name, email, phone, branchId } = req.body
    const supplier = await prisma.supplier.create({
      data: {
        name,
        email,
        phone,
        branchId: branchId || req.user.branchId
      }
    })
    res.status(201).json(supplier)
  } catch (error) {
    res.status(500).json({ message: 'Failed to create supplier', error: error.message })
  }
}
