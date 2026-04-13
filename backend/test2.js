const fs = require('fs');
const token = 'wtjwurwmgdmficsmiarbnvpdhyczlehdntgh'; // Extracted from REST key in .env
const eloc = 'mmi000';

async function test() {
    try {
        const url = `https://explore.mappls.com/apis/O2O/entity/${eloc}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
        console.log('Status', res.status);
        const text = await res.text();
        console.log('Response', text);
    } catch(e) {
        console.error(e);
    }
}

test();
