import axios from 'axios'

export async function getApi(getToken: () => Promise<string | null>) {
    const token = await getToken()
    return axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        headers: { Authorization: `Bearer ${token}` }
    })
}