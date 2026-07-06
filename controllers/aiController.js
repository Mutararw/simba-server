import { prisma } from '../lib/prisma.js'

export const processAiQuery = async (req, res) => {
  try {
    console.log('AI Request Body:', req.body);
    console.log('AI Request Headers:', req.headers);
    const { query } = req.body || {};
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'AI API Key not configured on the server.' });
    }

    // Fetch products to give context to the AI and for hydrating the response
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        stock: true,
        imageUrl: true
      }
    });

    // Create a safe context avoiding BigInt serialization issues
    // Include products with name and price so the AI can handle price range queries
    // Using compact array format to minimize token usage
    const contextProducts = allProducts.slice(0, 200).map(p => [p.id.toString(), p.name, Number(p.price)]);

    const productsContext = JSON.stringify(contextProducts);

    const systemPrompt = `You are the official AI Shopping Assistant for Simba Supermarket Rwanda (Kigali).
Your job is to help customers find products, recommend items, help them place orders, and answer FAQs.

STORE INFO:
- Simba Supermarket has 9 branches across Kigali (Remera, Kimironko, Kacyiru, Nyamirambo, Gikondo, Kanombe, Kinyinya, Kibagabaga, Nyanza)
- Average pickup time: 45 minutes. Delivery available within Kigali.
- Payments: Mobile Money (MoMo) and cash on delivery.
- Customers can place orders for pickup or delivery.

CAPABILITIES:
- Recommend products from the catalog (by name, category, or price range)
- Add products directly to the user's shopping cart (use addToCartIds)
- Answer questions about branches, payments, delivery
- Help with order placement and product suggestions

BEHAVIOR:
- Be friendly, conversational, and helpful.
- When recommending products, mention the product name and price (RWF).
- If the user asks about a price range (e.g. "between 5000 and 10000"), filter by the price field in the catalog.
- If the user says "add [item] to my cart" or "buy [item]" or "order [item]" or "I want [item]", include that product's ID in addToCartIds.
- Suggest complementary products when appropriate.
- If you cannot find a matching product, suggest the closest alternatives.
- If a question is completely unrelated to supermarket shopping, politely redirect with: "I'm sorry, but I can only help with Simba Supermarket related questions. Please contact our support team at info@Simbasupermarket.rw or +250 788 000 000."

CATALOG (Format: [id, name, price in RWF]):
${productsContext}

OUTPUT FORMAT - Respond STRICTLY as a raw JSON object (no markdown, no backticks):
{
  "reply": "Your friendly conversational response here. Be natural and helpful.",
  "productIds": ["id1", "id2"],
  "addToCartIds": ["id1"]
}

EXAMPLES:
User: "find me some milk"
Assistant: {"reply":"Sure! We have several milk options. Inyange Fresh Milk 1L (2,500 RWF) and Inyange Low Fat Milk 500ML (1,200 RWF) are popular choices. Would you like me to add one to your cart?","productIds":["1001","1002"]}

User: "add the fresh milk to my cart"
Assistant: {"reply":"I've added Inyange Fresh Milk 1L to your cart! Anything else you need?","productIds":["1001"],"addToCartIds":["1001"]}

User: "show me cooking oil between 3000 and 6000"
Assistant: {"reply":"Here are cooking oils in your price range:","productIds":["2001","2002","2003"]}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API Error:', errorText);
      return res.json({
        reply: "I'm sorry, I'm having trouble processing your request right now. Please contact our support team directly:\n- Phone: +250 788 000 000\n- Instagram: https://www.instagram.com/simbasupermarketrwanda",
        productIds: [],
        addToCartIds: [],
        products: []
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from AI');
    }

    let parsedContent;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
      }
      parsedContent = JSON.parse(cleanContent);
    } catch (err) {
      console.error("Failed to parse AI JSON response", content);
      return res.status(500).json({ error: 'Invalid AI response format' });
    }

    // Hydrate the products before returning to the frontend
    // Use robust ID matching (convert both to String)
    const recommendedIds = (parsedContent.productIds || []).map(String);
    const cartIds = (parsedContent.addToCartIds || []).map(String);

    parsedContent.products = allProducts
      .filter(p => recommendedIds.includes(p.id.toString()))
      .map(p => ({
        ...p,
        id: p.id.toString(),
        price: Number(p.price)
      }));

    // Ensure cart IDs are also strings in the final response
    parsedContent.addToCartIds = cartIds;

    return res.json(parsedContent);
  } catch (error) {
    console.error('AI Controller Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
