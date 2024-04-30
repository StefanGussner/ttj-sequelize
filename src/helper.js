import { fetch, Agent } from 'undici';

/**
 * 
 * @param {string} url 
 * @param {import('undici').RequestInit} options 
 * @param {number} retries 
 * @param {number} backoff 
 * @returns {Promise<import('undici').Response>}
 */
export async function fetchRetry(url, options, retries = 1, backoff = 3000) {
    try {
        const optionsWithCustomDispatcher = {
            ...options,
            dispatcher: new Agent({
                headersTimeout: 20 * 60 * 1000,
                bodyTimeout: 20 * 60 * 1000,
            })
        };
        const res = await fetch(url, optionsWithCustomDispatcher);
        if (res.status < 400) {
            return res;
        }
        const resText = await res.text();
        let parsedRes;
        try {
            parsedRes = JSON.parse(resText);
        } catch (e) {
        }
        if (parsedRes && parsedRes.error) {
            throw new Error(parsedRes.error);
        } else {
            throw new Error(resText);
        }
    } catch (err) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, backoff));
            return await fetchRetry(url, options, retries - 1, backoff * 2);
        } else {
            throw err;
        }
    }
}
