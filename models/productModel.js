import { prisma } from '../lib/prisma.js'

const toProductDto = (product) => ({
  id: Number(product.id),
  name: product.name,
  category: product.category,
  description: product.description,
  price: Number(product.price),
  stock: product.stock,
  image_url: product.imageUrl,
  created_at: product.createdAt,
  updated_at: product.updatedAt
})

export const getAllProducts = async () => {
  const products = await prisma.product.findMany({
    orderBy: {
      id: 'desc'
    }
  })

  return products.map(toProductDto)
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
