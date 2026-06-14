import { prisma } from '../lib/prisma.js'

const toProductDto = (product) => ({
  id: Number(product.id),
  name: product.name,
  category: product.category,
  subcategoryId: product.subcategoryId,
  unit: product.unit,
  description: product.description,
  price: Number(product.price),
  stock: product.stock,
  imageUrl: product.imageUrl,
  rating: Number(product.rating || 0),
  createdAt: product.createdAt,
  updatedAt: product.updatedAt
})

export const getAllProducts = async ({ search, category, minPrice, maxPrice, inStock, sortBy, order } = {}) => {
  const where = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  }

  if (category && category !== 'All') {
    where.category = category
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {}
    if (minPrice !== undefined) where.price.gte = Number(minPrice)
    if (maxPrice !== undefined) where.price.lte = Number(maxPrice)
  }

  if (inStock === 'true') {
    where.stock = { gt: 0 }
  } else if (inStock === 'false') {
    where.stock = 0
  }

  let orderBy = { id: 'desc' }
  if (sortBy) {
    if (sortBy === 'price') {
      orderBy = { price: order === 'desc' ? 'desc' : 'asc' }
    } else if (sortBy === 'name') {
      orderBy = { name: order === 'desc' ? 'desc' : 'asc' }
    } else if (sortBy === 'newest') {
      orderBy = { createdAt: 'desc' }
    }
  }

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      reviews: true
    }
  })

  return products.map(product => {
    const dto = toProductDto(product)
    if (product.reviews && product.reviews.length > 0) {
      const avg = product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length
      dto.rating = Number(avg.toFixed(1))
    }
    return dto
  })
}

export const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: {
      id: BigInt(id)
    }
  })

  return product ? toProductDto(product) : null
}

export const createProduct = async ({ name, category, description, price, stock, imageUrl }) => {
  const product = await prisma.product.create({
    data: {
      name,
      category,
      description: description || null,
      price,
      stock,
      imageUrl: imageUrl || null
    }
  })

  return toProductDto(product)
}

export const updateProduct = async (id, { name, category, description, price, stock, imageUrl }) => {
  try {
    const product = await prisma.product.update({
      where: {
        id: BigInt(id)
      },
      data: {
        name,
        category,
        description: description || null,
        price,
        stock,
        imageUrl: imageUrl || null
      }
    })

    return toProductDto(product)
  } catch (error) {
    if (error.code === 'P2025') {
      return null
    }

    throw error
  }
}

export const deleteProduct = async (id) => {
  try {
    return await prisma.product.delete({
      where: {
        id: BigInt(id)
      },
      select: {
        id: true
      }
    })
  } catch (error) {
    if (error.code === 'P2025') {
      return null
    }

    throw error
  }
}
