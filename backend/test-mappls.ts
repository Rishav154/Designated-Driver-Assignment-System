import 'dotenv/config';

async function run() {
    try {
        const { getMapplsToken } = await import('./src/utils/mapplsToken.ts');
        const token = await getMapplsToken();
        const eloc = 'mmi000';
        const url = `https://explore.mappls.com/apis/O2O/entity/${eloc}`;
        console.log('Testing', url.replace(token, '***'));
        const headers = new Headers();
        headers.append('Authorization', `Bearer ${token}`);
        const res = await fetch(url, { headers });
        console.log('Status', res.status);
        console.log('Response', (await res.text()).substring(0, 200));
    } catch (e) {
        console.error(e);
    }
}
run();
