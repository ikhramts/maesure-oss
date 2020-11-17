export function sendPost(url: string, body?: any) : Promise<void> {
    let options = {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

    } as RequestInit

    if (body) {
        options.body = JSON.stringify(body)
    }
    
    return fetch(url, options).then(
        reply => {
            if (reply.ok) {
                return
            } else {
                throw reply.body
            }
        }
    )
}