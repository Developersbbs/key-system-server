const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');
const { 
  createTransaction, 
  getPendingTransactions, 
  getAllTransactions,
  approveTransaction, 
  rejectTransaction,
  getUserTransactions,
  getSellerPaymentDetails
} = require('../controllers/transactionController');

// Member routes
router.post('/', auth, allowRoles(['member','admin']), createTransaction);
router.get('/my-transactions', auth, allowRoles(['member', 'admin']), getUserTransactions);

// Get seller payment details for a specific listing (for buyers)
router.get('/seller-payment-details/:listingId', auth, allowRoles(['member']), getSellerPaymentDetails);

// Admin routes
router.get('/pending', auth, allowRoles(['admin']), getPendingTransactions);
router.get('/all', auth, allowRoles(['admin']), getAllTransactions);
router.put('/:id/approve', auth, allowRoles(['admin']), approveTransaction);
router.put('/:id/reject', auth, allowRoles(['admin']), rejectTransaction);

module.exports = router;