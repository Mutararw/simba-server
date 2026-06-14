import { prisma } from '../lib/prisma.js'

export const processMomoPayment = async (req, res) => {
  const { orderId, phone, amount } = req.body

  if (!orderId || !phone || !amount) {
    return res.status(400).json({ message: 'Missing payment details' })
  }

  try {
    // This is where real MTN MoMo API integration would go
    // For the contest, we simulate the flow
    console.log(`Processing MoMo payment for Order ${orderId} - Phone: ${phone} - Amount: ${amount}`)

    // 1. Initiate Request to Pay (Real API call would happen here)
    // const response = await mtnMomo.requestToPay({ ... })

    // 2. Mocking a successful initiation
    const paymentReference = `MOMO-${Date.now()}`

    // 3. Update Order with pending payment
    await prisma.order.update({
      where: { id: BigInt(orderId) },
      data: {
        paymentStatus: 'pending',
        paymentReference,
        phone // Save the MoMo phone used
      }
    })

    // 4. Simulate payment confirmation after a few seconds (in a real app, this would be a webhook)
    // We return the reference to the frontend to poll or wait
    return res.status(200).json({
      message: 'Payment initiated. Please check your phone to authorize.',
      paymentReference,
      status: 'pending'
    })
  } catch (error) {
    return res.status(500).json({ message: 'MoMo payment failed', error: error.message })
  }
}

export const getPaymentStatus = async (req, res) => {
  const { reference } = req.params
  
  try {
    const order = await prisma.order.findFirst({
      where: { paymentReference: reference }
    })

    if (!order) return res.status(404).json({ message: 'Payment not found' })

    // Mocking transition to 'paid' for demo purposes
    if (order.paymentStatus === 'pending') {
        await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'paid', status: 'Confirmed' }
        })
        return res.json({ status: 'paid' })
    }

    return res.json({ status: order.paymentStatus })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to check status', error: error.message })
  }
}
