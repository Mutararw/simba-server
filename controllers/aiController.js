import { prisma } from '../lib/prisma.js'

export const processAiQuery = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Groq API Key not configured on the server.' });
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
    // Using an array of arrays [id, name] and limiting to 30 products to stay well within Groq's Free Tier limits
    const contextProducts = allProducts.slice(0, 30).map(p => [p.id.toString(), p.name]);

    const productsContext = JSON.stringify(contextProducts);

    const systemPrompt = `You are the official AI Assistant for Simba Supermarket Rwanda (Kigali).
Your job is to help customers find products, recommend items, and answer FAQs.

STORE INFO:
- Simba Supermarket has 9 branches across Kigali (including Remera, Nyamirambo, etc.)
- Average pickup time is 45 minutes.
- Payments are accepted via Mobile Money (MoMo).
- CRITICAL INSTRUCTION: If a user asks a question you do not know the answer to, or if the question is unrelated to the supermarket, you MUST respond by apologizing and providing our support team's contact info exactly as follows:
  "I'm sorry, but I don't have the answer to that. Please contact our support team:
  - Phone: +250 788 000 000
  - Facebook: https://www.facebook.com/SimbaSupermarketRwanda
  - Instagram: https://www.instagram.com/simbasupermarketrwanda
  - Twitter (X): https://twitter.com/SimbaRwanda"

CATALOG (Format: [id, name]):
${productsContext}

INSTRUCTIONS:
1. Analyze the user's request.
2. If they are looking for products (e.g. "Find me a breakfast"), recommend relevant products from the CATALOG. Mention the 45-minute pickup time casually if appropriate.
3. If the user explicitly asks to "add [item] to my cart" or "buy [item]", identify the product ID from the CATALOG and add it to the "addToCartIds" array in your response.
4. Output your response STRICTLY as a valid JSON object matching this schema:
{
  "reply": "Your conversational response here. Keep it helpful, concise, and friendly.",
  "productIds": ["id1", "id2"], // Array of product IDs you are recommending or mentioning
  "addToCartIds": ["id1"] // Array of product IDs to automatically add to their cart (ONLY if they explicitly asked to add/buy)
}
NEVER output raw markdown, only the raw JSON string.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API Error:', errorText);
      // Fallback to support info if API fails (rate limits, etc.)
      return res.json({
        reply: "I'm sorry, I'm having trouble processing your request right now. Please contact our support team directly:\n- Phone: +250 788 000 000\n- Instagram: https://www.instagram.com/simbasupermarketrwanda\n- Facebook: https://www.facebook.com/SimbaSupermarketRwanda",
        productIds: [],
        addToCartIds: [],
        products: []
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
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
    if (parsedContent.productIds && Array.isArray(parsedContent.productIds)) {
      parsedContent.products = allProducts
        .filter(p => parsedContent.productIds.includes(p.id.toString()))
        .map(p => ({
          ...p,
          id: p.id.toString(),
          price: Number(p.price)
        }));
    }

    return res.json(parsedContent);
  } catch (error) {
    console.error('AI Controller Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
