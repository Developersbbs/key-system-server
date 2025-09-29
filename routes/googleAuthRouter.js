const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');
const { google } = require('googleapis');
const User = require('../models/User'); // User மாடலை import செய்யவும்

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// இந்த ரூட், பயனரை கூகிள் லாகின் பக்கத்திற்கு அனுப்பும்
router.get('/', auth, allowRoles(['admin']), (req, res) => {
  const scopes = ['https://www.googleapis.com/auth/calendar.events'];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: req.user._id.toString() // லாகின் செய்துள்ள நிர்வாகியின் ID-ஐ அனுப்புகிறோம்
  });
  res.redirect(url);
});

// கூகிள் லாகின் செய்த பிறகு, கூகிள் இந்த ரூட்டிற்குத் திருப்பி அனுப்பும்
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const userId = state; // நிர்வாகியின் ID-ஐ state-இலிருந்து பெறுகிறோம்

  

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // ✅ மிக முக்கியம்: பெறப்பட்ட டோக்கன்களை அந்த நிர்வாகியின் User document-இல் சேமிக்கிறோம்
    await User.findByIdAndUpdate(userId, { googleTokens: tokens });
    
    res.redirect('http://localhost:5173/admin/meetings?auth=success');
  } catch (error) {
    console.error("Error handling Google callback:", error);
    res.redirect('http://localhost:5173/admin/meetings?auth=error');
  }

  
});

module.exports = router;