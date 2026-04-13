const https = require('https');
const token = 'wtjwurwmgdmficsmiarbnvpdhyczlehdntgh';
const eloc = 'mmi000';

const options = {
  hostname: 'explore.mappls.com',
  path: `/apis/O2O/entity/${eloc}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, res => {
  console.log('statusCode:', res.statusCode);

  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', e => {
  console.error('req error', e);
});

req.end();
