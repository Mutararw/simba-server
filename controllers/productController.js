import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../models/productModel.js'

export const listProducts = async (_req, res) => {
  try {
    const products = await getAllProducts()
    return res.json(products)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch products', error: error.message })
  }
}

export const getSingleProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id)
    const product = await getProductById(productId)

    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    return res.json(product)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch product', error: error.message })
  }
}

export const createSingleProduct = async (req, res) => {
  try {
    const { name, category, description, price, stock, imageUrl } = req.body

    if (!name || !category || Number(price) < 0 || Number(stock) < 0) {
      return res.status(400).json({ message: 'name, category, price and stock are required and must be valid' })
    }

    const product = await createProduct({
      name,
      category,
      description,
      price: Number(price),
      stock: Number(stock),
      imageUrl
    })

    return res.status(201).json(product)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create product', error: error.message })
  }
}

export const updateSingleProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id)
    const { name, category, description, price, stock, imageUrl } = req.body

    if (!name || !category || Number(price) < 0 || Number(stock) < 0) {
      return res.status(400).json({ message: 'name, category, price and stock are required and must be valid' })
    }

    const product = await updateProduct(productId, {
      name,
      category,
      description,
      price: Number(price),
      stock: Number(stock),
      imageUrl
    })

    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    return res.json(product)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update product', error: error.message })
  }
}

export const deleteSingleProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id)
    const deleted = await deleteProduct(productId)

    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' })
    }

    return res.status(204).send()
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete product', error: error.message })
  }
}
