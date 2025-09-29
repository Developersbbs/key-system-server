const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');
// ✅ 1. Import the new deleteListing function and updateListingQuantity
const { getAllListings, createListing, deleteListing, updateListingQuantity } = require('../controllers/listingController');

// Public route to see all listings
router.get('/', getAllListings);

// Protected route for members to create a listing
router.post('/', auth, allowRoles(['member', 'admin']), createListing);

// ✅ 2. Add the protected route for a member/admin to delete a listing
router.delete('/:id', auth, allowRoles(['member', 'admin']), deleteListing);

// ✅ 3. Add the protected route for updating listing quantity
router.patch('/update-quantity', auth, allowRoles(['member', 'admin']), updateListingQuantity);

module.exports = router;