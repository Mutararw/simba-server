import { prisma } from '../lib/prisma.js'

const tools = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description: "Search for products in Simba Supermarket catalog by name, category, or keywords. Call this whenever the user asks about products, wants recommendations, wants to buy something, or asks about specific items.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search term to find matching products (e.g. 'milk', 'breakfast', 'rice', 'cooking oil')"
          },
          category: {
            type: "string",
            description: "Optional category to filter results"
          },
          minPrice: {
            type: "number",
            description: "Optional minimum price in RWF"
          },
          maxPrice: {
            type: "number",
            description: "Optional maximum price in RWF"
          }
        },
        required: ["query"]
      }
    }
  }
]

const SYSTEM_PROMPT_CHAT = `You are the official AI Shopping Assistant for Simba Supermarket Rwanda (Kigali).

STORE INFO:
- 9 branches across Kigali: Remera, Kimironko, Kacyiru, Nyamirambo, Gikondo, Kanombe, Kinyinya, Kibagabaga, Nyanza
- Pickup: ~45 minutes. Delivery available within Kigali.
- Payments: Mobile Money (MoMo) and cash on delivery.

BEHAVIOR:
- Be friendly, conversational, and helpful in Kinyarwanda, English, or French.
- You have NO direct access to the product catalog. You MUST call the searchProducts function to look up products before answering product questions.
- When recommending, mention the product name and price in RWF, and why it's a good choice.
- If the user wants to buy/add to cart, include the product IDs in addToCartIds.
- Suggest complementary products when appropriate.
- For unrelated questions, politely redirect to info@Simbasupermarket.rw or +250 788 000 000.

You must respond in valid JSON format matching this schema:
{
  "reply": "your conversational response text",
  "productIds": ["id1", "id2", ...],
  "addToCartIds": ["id1", "id2", ...]
}

Always call searchProducts to get real product data before providing product recommendations.`

const SYSTEM_PROMPT_ASSISTANT = `You are Simba AI, a friendly customer service assistant for Simba Supermarket Rwanda (Kigali).

STORE INFO:
- 9 branches across Kigali: Remera, Kimironko, Kacyiru, Nyamirambo, Gikondo, Kanombe, Kinyinya, Kibagabaga, Nyanza
- Pickup: ~45 minutes. Delivery available within Kigali.
- Payments: Mobile Money (MoMo) and cash on delivery.
- Contact: info@Simbasupermarket.rw or +250 788 000 000.

BEHAVIOR:
- Be warm, conversational, and helpful in Kinyarwanda, English, or French.
- You can answer store policy questions, help with orders, explain pickup/delivery, etc.
- If the user wants product recommendations, use the searchProducts function.
- Never invent product details; use the searchProducts function for product information.
- For questions beyond your scope, politely redirect to the contact info above.

You must respond in valid JSON format matching this schema:
{
  "reply": "your conversational response text",
  "productIds": [],
  "addToCartIds": []
}

For product-related questions, always call searchProducts first.`

async function searchProductsDB({ query, category, minPrice, maxPrice }) {
  const where = {}

  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { category: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } }
    ]
  }

  if (category) {
    where.category = category
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {}
    if (minPrice !== undefined) where.price.gte = Number(minPrice)
    if (maxPrice !== undefined) where.price.lte = Number(maxPrice)
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      stock: true,
      imageUrl: true,
      description: true,
      unit: true
    },
    take: 20,
    orderBy: { name: 'asc' }
  })

  return products.map(p => ({
    id: p.id.toString(),
    name: p.name,
    category: p.category,
    price: Number(p.price),
    stock: p.stock,
    imageUrl: p.imageUrl,
    description: p.description,
    unit: p.unit
  }))
}

async function callGroq(messages, options = {}) {
  const apiKey = process.env.GROQ_API_KEY
  const body = {
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.3,
    ...options
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Groq API Error:', response.status, errorText)
    return null
  }

  const data = await response.json()
  return data.choices[0]?.message || null
}

async function handleAiQuery(req, res, systemPrompt) {
  try {
    const { query } = req.body || {}

    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      console.error('GROQ_API_KEY is not configured on the server. Falling back to DB search.')
      const dbProducts = await searchProductsDB({ query })
      return res.json({
        reply: dbProducts.length
          ? `I found ${dbProducts.length} product${dbProducts.length > 1 ? 's' : ''} matching your search.`
          : "I couldn't find any products matching your search. Try different keywords.",
        productIds: dbProducts.map(p => p.id),
        addToCartIds: [],
        products: dbProducts
      })
    }

    console.log(`[AI] Processing query: "${query.substring(0, 80)}"`)
    const msg1 = await callGroq(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      { tools, tool_choice: 'auto' }
    )

    if (!msg1) {
      return res.json({
        reply: "I'm sorry, I'm having trouble processing your request right now. Please contact our support team at +250 788 000 000.",
        productIds: [],
        addToCartIds: [],
        products: []
      })
    }

    let toolResults = []
    let messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
      msg1
    ]

    // Execute any tool calls the model requested
    if (msg1.tool_calls && msg1.tool_calls.length > 0) {
      for (const tc of msg1.tool_calls) {
        if (tc.function.name === 'searchProducts') {
          const args = JSON.parse(tc.function.arguments)
          toolResults = await searchProductsDB(args)
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(toolResults)
          })
        }
      }

      // Step 2: Send tool results back to Groq for a formatted JSON answer
      const msg2 = await callGroq(messages, {
        response_format: { type: "json_object" }
      })

      if (!msg2) {
        return res.json({
          reply: "I'm sorry, I'm having trouble processing your request right now.",
          productIds: [],
          addToCartIds: [],
          products: toolResults
        })
      }

      const result = await parseAndRespond(msg2.content, toolResults)
      return res.json(result)
    }

    // No tool call -> direct text response (general question)
    const directResult = await parseAndRespond(msg1.content, [])
    return res.json(directResult)
  } catch (error) {
    console.error('AI Controller Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

async function parseAndRespond(content, toolResults) {
  if (!content) {
    return {
      reply: "I'm sorry, I'm having trouble processing your request.",
      productIds: [],
      addToCartIds: [],
      products: []
    }
  }

  let parsed
  try {
    let cleaned = content.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim()
    }
    parsed = JSON.parse(cleaned)
  } catch {
    // Not JSON — wrap as plain text reply
    return {
      reply: content,
      productIds: [],
      addToCartIds: [],
      products: toolResults
    }
  }

  const recommendedIds = (parsed.productIds || []).map(String)
  const cartIds = (parsed.addToCartIds || []).map(String)
  const allRequestedIds = [...new Set([...recommendedIds, ...cartIds])]

  // Prefer tool results (already in memory), fall back to DB query
  let products = toolResults.length > 0
    ? toolResults.filter(p => recommendedIds.includes(p.id))
    : []

  if (products.length === 0 && allRequestedIds.length > 0) {
    const ids = allRequestedIds.map(id => BigInt(id))
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, category: true, price: true, stock: true, imageUrl: true, description: true, unit: true }
    })
    products = dbProducts.map(p => ({ ...p, id: p.id.toString(), price: Number(p.price) }))
  }

  return {
    reply: parsed.reply || "Here are some products that might interest you.",
    productIds: recommendedIds,
    addToCartIds: cartIds,
    products
  }
}

export const processAiQuery = async (req, res) => {
  await handleAiQuery(req, res, SYSTEM_PROMPT_CHAT)
}

export const processAiAssistantQuery = async (req, res) => {
  await handleAiQuery(req, res, SYSTEM_PROMPT_ASSISTANT)
}
