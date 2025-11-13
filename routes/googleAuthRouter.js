const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/allowRoles');
const { google } = require('googleapis');
const User = require('../models/User'); // User மாடலை import செய்யவும்

const createOAuth2Client = (redirectUri) => new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

const resolveRedirectUri = (req) => {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }

  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${protocol}://${host}/api/auth/google/callback`;
};

// இந்த ரூட், பயனரை கூகிள் லாகின் பக்கத்திற்கு அனுப்பும்
router.get('/', auth, allowRoles(['admin']), (req, res) => {
  const scopes = ['https://www.googleapis.com/auth/calendar.events'];
  const redirectUri = resolveRedirectUri(req);
  const oauth2Client = createOAuth2Client(redirectUri);

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: req.user._id.toString(), // லாகின் செய்துள்ள நிர்வாகியின் ID-ஐ அனுப்புகிறோம்
    redirect_uri: redirectUri
  });
  res.redirect(url);
});

// கூகிள் லாகின் செய்த பிறகு, கூகிள் இந்த ரூட்டிற்குத் திருப்பி அனுப்பும்
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const userId = state; // நிர்வாகியின் ID-ஐ state-இலிருந்து பெறுகிறோம்

  

  try {
    const redirectUri = resolveRedirectUri(req);
    const oauth2Client = createOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken({ code, redirect_uri: redirectUri });
    
    // ✅ மிக முக்கியம்: பெறப்பட்ட டோக்கன்களை அந்த நிர்வாகியின் User document-இல் சேமிக்கிறோம்
    await User.findByIdAndUpdate(userId, { googleTokens: tokens });
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/admin/meetings?auth=success`);
  } catch (error) {
    console.error("Error handling Google callback:", error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/admin/meetings?auth=error`);
  }

  
});

module.exports = router;