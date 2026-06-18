const express = require('express');
const router = express.Router();
const fallbackDb = require('../utils/fallbackDb');

// 1. GET /api/store/products - List all products
router.get('/products', async (req, res) => {
  try {
    const products = await fallbackDb.find('products', {}) || [];
    // If empty, return a set of initial default agency products/services so the store is not empty
    if (products.length === 0) {
      const defaultProducts = [
        {
          id: 'prod_ai_agent',
          name: 'NEXA Agentic AI Assistant',
          description: 'Autonomous multi-agent network with custom LLM reasoning integration for B2B client acquisition.',
          category: 'AI Solutions',
          price: 150000,
          deliveryTime: '21 Days',
          status: 'Active',
          image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500'
        },
        {
          id: 'prod_react_dash',
          name: 'Futuristic React Dashboard',
          description: 'Sleek dark-mode Vite/React app with TailwindCSS styling, glassmorphism design, and real-time dashboard analytics.',
          category: 'Web Development',
          price: 85000,
          deliveryTime: '14 Days',
          status: 'Active',
          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500'
        },
        {
          id: 'prod_mobile_app',
          name: 'Mobile Super App (Capacitor/React Native)',
          description: 'Cross-platform Android & iOS app wrapper with biometric auth and geo-fenced operations check-in scanner.',
          category: 'Mobile Applications',
          price: 120000,
          deliveryTime: '30 Days',
          status: 'Active',
          image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=500'
        }
      ];
      // Save default products in local database
      for (const prod of defaultProducts) {
        await fallbackDb.save('products', prod);
      }
      return res.json(defaultProducts);
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Store database synchronization failure', error: err.message });
  }
});

// 2. GET /api/store/products/:id - Get product details
router.get('/products/:id', async (req, res) => {
  try {
    const product = await fallbackDb.findOne('products', { id: req.params.id });
    if (!product) return res.status(404).json({ message: 'Product listing not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve product', error: err.message });
  }
});

// 3. POST /api/store/products - Create a new product listing (Admin/Super Admin only)
router.post('/products', async (req, res) => {
  try {
    const { name, description, category, price, deliveryTime, image, status } = req.body;
    if (!name || !price) {
      return res.status(400).json({ message: 'Product name and price coordinates are required' });
    }

    const newProduct = {
      id: `prod_${Date.now()}`,
      name,
      description: description || '',
      category: category || 'General',
      price: Number(price),
      deliveryTime: deliveryTime || '7 Days',
      status: status || 'Active',
      image: image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500'
    };

    const saved = await fallbackDb.save('products', newProduct);

    // Audit Log Entry
    await fallbackDb.save('audit_logs', {
      type: 'STORE_PRODUCT_CREATE',
      user: req.body.adminEmail || 'Admin',
      details: `Created new store product: "${name}" under category "${category}" (Price: ₹${price})`,
      timestamp: new Date(),
      priority: 'Normal'
    });

    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to list product', error: err.message });
  }
});

// 4. PUT /api/store/products/:id - Update product listing
router.put('/products/:id', async (req, res) => {
  try {
    const product = await fallbackDb.findOne('products', { id: req.params.id });
    if (!product) return res.status(404).json({ message: 'Product listing not found' });

    const updated = await fallbackDb.update('products', req.params.id, req.body);

    // Audit Log Entry
    await fallbackDb.save('audit_logs', {
      type: 'STORE_PRODUCT_UPDATE',
      user: req.body.adminEmail || 'Admin',
      details: `Updated store product "${product.name}" parameters`,
      timestamp: new Date(),
      priority: 'Normal'
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product details', error: err.message });
  }
});

// 5. DELETE /api/store/products/:id - Delete product listing
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await fallbackDb.findOne('products', { id: req.params.id });
    if (!product) return res.status(404).json({ message: 'Product listing not found' });

    await fallbackDb.deleteOne('products', req.params.id);

    // Audit Log Entry
    await fallbackDb.save('audit_logs', {
      type: 'STORE_PRODUCT_DELETE',
      user: req.query.adminEmail || 'Admin',
      details: `Archived/Deleted store product: "${product.name}"`,
      timestamp: new Date(),
      priority: 'Normal'
    });

    res.json({ success: true, message: 'Product listing successfully removed' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove product listing', error: err.message });
  }
});

// 6. POST /api/store/buy - Buy a product (creates transaction & client order)
router.post('/buy', async (req, res) => {
  try {
    const { productId, clientName, clientEmail, paymentMethod } = req.body;
    if (!productId || !clientName) {
      return res.status(400).json({ message: 'Product ID and purchasing Client Name coordinates are required' });
    }

    const product = await fallbackDb.findOne('products', { id: productId });
    if (!product) return res.status(404).json({ message: 'Product listing not found' });

    const orderId = `ord_${Date.now()}`;
    const orderData = {
      id: orderId,
      productId,
      productName: product.name,
      clientName,
      clientEmail: clientEmail || 'guest@nexovtech.com',
      amount: product.price,
      paymentMethod: paymentMethod || 'Invoiced',
      status: 'Pending Fulfillment',
      createdAt: new Date()
    };

    // Save client order log
    const savedOrder = await fallbackDb.save('orders', orderData);

    // Create corresponding Revenue transaction
    const transactionId = `inv_${Date.now()}`;
    const transactionData = {
      id: transactionId,
      type: 'Revenue',
      amount: product.price,
      description: `${clientName} - Purchased ${product.name} (Order ID: ${orderId})`,
      date: new Date(),
      status: 'Pending',
      createdAt: new Date()
    };
    await fallbackDb.save('transactions', transactionData);

    // Save audit log
    await fallbackDb.save('audit_logs', {
      type: 'STORE_ORDER_CREATE',
      user: clientEmail || 'Guest Client',
      details: `Created product order ${orderId} for "${product.name}" (Amount: ₹${product.price}) - Created pending Revenue transaction ${transactionId}`,
      timestamp: new Date(),
      priority: 'High'
    });

    res.json({
      success: true,
      message: 'Product purchase initiated successfully',
      order: savedOrder,
      transactionId
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to initiate purchase transaction', error: err.message });
  }
});

module.exports = router;
