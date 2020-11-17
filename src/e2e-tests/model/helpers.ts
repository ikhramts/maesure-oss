import { ElementHandle, Page } from "puppeteer";

export async function waitForSubElementByText(
    parentElement: ElementHandle<Element>, 
    elementType: string, 
    text: string,
    descriptiveElementName?: string) : Promise<ElementHandle<Element>> {
    
    const startTime = new Date().getTime()
    const endTime = startTime + 10 * 1000

    let matches : ElementHandle<Element>[] | null = null 
    const elementDescription = descriptiveElementName ? descriptiveElementName : `${elementType} sub-element`

    while(true) {
        matches = await parentElement.$x(`//${elementType}[contains(text(), '${text}')]`)

        if (matches.length == 0) {
            const now = new Date().getTime()

            if (now >= endTime) {
                throw `Could not find a ${elementDescription} with text '${text}'` 
            }

            // Sleep for a bit
            console.log("did not find; sleeping 50 msec")
            await new Promise(resolve => setTimeout(resolve, 50))
        
        } else {
            break
        }
    }

    if (matches.length > 1) {
        throw `Found ${matches.length} instances of ${elementDescription} with text '${text}'`
    }

    return matches[0]
}

export async function getSubElementWithText(
    parentElement: ElementHandle<Element>, 
    elementType: string, 
    text: string,
    descriptiveElementName?: string) : Promise<ElementHandle<Element> | null> {
    
    const matches = await parentElement.$x(`//${elementType}[contains(text(), '${text}')]`)
    const elementDescription = descriptiveElementName ? descriptiveElementName : `${elementType} sub-element`

    if (matches.length == 0) {
        return null
    }

    if (matches.length > 1) {
        throw `Found ${matches.length} instances of ${elementDescription} with text '${text}'`
    }

    return matches[0]
}

export async function waitFor<T>(func : () => Promise<T | null>, errorMessage?: string) {
    const startTime = new Date().getTime()
    const endTime = startTime + 10 * 1000

    let result : T | null = null

    while(true) {
        result = await func()

        if (result) {
            break
        } else {
            const now = new Date().getTime()

            if (now >= endTime) {
                if (errorMessage) {
                    throw errorMessage
                } else {
                    throw `Timed out while waiting for a result` 
                }
            }

            // Sleep for a bit
            await sleep(50)
        }
    }

    return result
}

export async function sleep(msec: number) {
    await new Promise(resolve => setTimeout(resolve, msec))
}

export async function getText(page: Page, element: ElementHandle<Element>) : Promise<string> {
    const rawText = await page.evaluate(e => e.textContent, element) 
    
    if (rawText) {
        return (rawText as string).trim()
    } else {
        return rawText
    }
}

export async function isVisible(page: Page, selector: string) : Promise<boolean> {
    // Check if any elements matching this query selector are visible.
    const visible = await page.evaluate((selectorArg) => {
        const elts = document.querySelectorAll(selectorArg);
        let anyVisible = false

        elts.forEach(elt => {
            const style = window.getComputedStyle(elt);
            const thisEltVisible = style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';

            if (thisEltVisible) {
                anyVisible = true
            }
        })

        return anyVisible

    }, selector)

    return visible
}
