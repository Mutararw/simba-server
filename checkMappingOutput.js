import 'dotenv/config'

async function check() {
  const response = await fetch('http://localhost:5000/api/products')
  const data = await response.json()
  const mapped = data.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.imageUrl || p.image_url || "MISSING",
  }))
  console.log('Sample mapped products:', JSON.stringify(mapped.slice(640, 650), null, 2))
}

check()
