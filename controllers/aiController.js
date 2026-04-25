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

    // Fetch products to give context to the AI
    // We only take essential fields to save token space
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        stock: true
      }
    });

    const productsContext = JSON.stringify(products);

    const systemPrompt = `You are the official AI Assistant for Simba Supermarket Rwanda (Kigali).
Your job is to help customers find products, recommend items, and answer FAQs.

STORE INFO:
- Simba Supermarket has 9 branches across Kigali (including Remera, Nyamirambo, etc.)
- Average pickup time is 45 minutes.
- Payments are accepted via Mobile Money (MoMo).
- If a customer asks a difficult question or something outside your knowledge, gracefully fall back and provide our contact info:
  - Phone: +250 788 000 000
  - Facebook: https://www.facebook.com/SimbaSupermarketRwanda
  - Instagram: https://www.instagram.com/simbasupermarketrwanda
  - Twitter (X): https://twitter.com/SimbaRwanda

CATALOG:
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
        model: 'llama-3.3-70b-versatile',
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
      return res.status(502).json({ error: 'Failed to communicate with AI provider.' });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (err) {
      console.error("Failed to parse AI JSON response", content);
      return res.status(500).json({ error: 'Invalid AI response format' });
    }

    return res.json(parsedContent);
  } catch (error) {
    console.error('AI Controller Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
