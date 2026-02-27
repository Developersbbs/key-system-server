const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ _id: '678f24badd365ec896c0caeb', role: 'superadmin' }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
axios.get('http://localhost:5001/api/subscriptions/admin/pending', {
  headers: { Authorization: `Bearer ${token}` }
}).then(res => console.log(JSON.stringify(res.data, null, 2)))
.catch(err => console.error(err.response ? err.response.data : err.message));
