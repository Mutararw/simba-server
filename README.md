# Simba Backend (Node + Express + Prisma)

Backend API for eCommerce with:
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- Better Auth
- Render deployment support

## Project Structure

```
simba-backend/
  controllers/
    productController.js
    orderController.js
  middleware/
    authMiddleware.js
  models/
    productModel.js
    orderModel.js
  routes/
    productRoutes.js
    orderRoutes.js
  prisma/
    schema.prisma
  generated/
    prisma/
  app.js
  lib/
    auth.js
    prisma.js
  server.js
  render.yaml
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in `server/` with your database and auth secrets.

3. Generate Prisma Client:
```bash
npm run prisma:generate
```

4. Apply your Prisma schema to the database with your preferred Prisma workflow.

5. Seed products if the database is empty:
```bash
npm run seed:products
```

5. Start server:
```bash
npm run dev
```

## Environment Variables

- `PORT` (Render provides this automatically)
- `DATABASE_URL` (PostgreSQL connection string)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (optional but recommended in production)
- `CLIENT_URL` or `CLIENT_ORIGIN`
- `TRUSTED_ORIGINS` (comma-separated, optional)

## API Endpoints

### Auth
- Better Auth handles `/api/auth/*`
- Email/password auth is enabled

### Products
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (session required)
- `PUT /api/products/:id` (session required)
- `DELETE /api/products/:id` (session required)

`POST/PUT/DELETE /api/products` are restricted to admin roles:
- `manager`
- `inventory`
- `catalog_editor`

Required product fields for create/update:
- `name`
- `category`
- `price`
- `stock`

### Orders
- `POST /api/orders` (session required)
- `GET /api/orders/me` (session required)

## Render Deployment

1. Push this folder to GitHub.
2. Create a new Web Service on Render.
3. Use:
   - Build command: `npm install`
   - Start command: `npm start`
4. Set environment variables in Render:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL`
   - `CLIENT_URL` or `CLIENT_ORIGIN`

Backend listens with `process.env.PORT`, so it is Render-compatible.
