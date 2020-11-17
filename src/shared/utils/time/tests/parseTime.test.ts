import { parseTime } from "../parseTime"

describe("parseTime()", () => {
    describe("Success cases", () => {
        test("01:15", () => {
            shouldParseTo("01:15", 1, 15)
        })
    
        test("1:15", () => {
            shouldParseTo("1:15", 1, 15)
        })
    
        test("1", () => {
            shouldParseTo("1", 1, 0)
        })
    
        test("01", () => {
            shouldParseTo("01", 1, 0)
        })
    
        test("trailing space", () => {
            shouldParseTo("1:15 \t\n", 1, 15)
        })
    
        test("leading space", () => {
            shouldParseTo(" \t\n1:15", 1, 15)
        })
    
        test("1.15", () => {
            shouldParseTo("1.15", 1, 15)
        })
        
        test("13:15", () => {
            shouldParseTo("13:15", 13, 15)
        })
        
        test("1p", () => {
            shouldParseTo("1p", 13, 0)
        })
    
        test("1P", () => {
            shouldParseTo("1P", 13, 0)
        })
        
        test("1 p", () => {
            shouldParseTo("1 p", 13, 0)
        })
        
        test("1 pm", () => {
            shouldParseTo("1 pm", 13, 0)
        })
        
        test("1pm", () => {
            shouldParseTo("1 pm", 13, 0)
        })
        
        test("1:30pm", () => {
            shouldParseTo("1:30p", 13, 30)
        })
        
        test("13:30pm", () => {
            shouldParseTo("13:30p", 13, 30)
        })
        
        test("1a", () => {
            shouldParseTo("1a", 1, 0)
        })
        
        test("1 a", () => {
            shouldParseTo("1 a", 1, 0)
        })
        
        test("1 am", () => {
            shouldParseTo("1 am", 1, 0)
        })
        
        test("1AM", () => {
            shouldParseTo("1AM", 1, 0)
        })
        
        test("00:00", () => {
            shouldParseTo("00:00", 0, 0)
        })
        
        test("0:00", () => {
            shouldParseTo("0:00", 0, 0)
        })
        
        test("0", () => {
            shouldParseTo("0", 0, 0)
        })
        
        test("1 : 15", () => {
            shouldParseTo("1 : 15", 1, 15)
        })

        test("115", () => {
            shouldParseTo("115", 1, 15)
        })
        
        test("1415", () => {
            shouldParseTo("1415", 14, 15)
        })
        
        test("11:", () => {
            shouldParseTo("11:", 11, 0)
        })        
        
        test("11.", () => {
            shouldParseTo("11.", 11, 0)
        })        
        
        test("11-50", () => {
            shouldParseTo("11-50", 11, 50)
        })        
        
        test("11 50", () => {
            shouldParseTo("11 50", 11, 50)
        })        
        
    })

    describe("Failure cases", () => {
        test("", () => {
            shouldNotParse("")
        })

        test(" ", () => {
            shouldNotParse(" ")
        })
        
        test("\t", () => {
            shouldNotParse("\t")
        })
        
        test("\n", () => {
            shouldNotParse("\n")
        })
        
        test("abc", () => {
            shouldNotParse("abc")
        })
        
        test("pm", () => {
            shouldNotParse("pm")
        })
        
        test("1xm", () => {
            shouldNotParse("1xm")
        })
        
        test("1ax", () => {
            shouldNotParse("1ax")
        })
        
        test("10:14:34", () => {
            shouldNotParse("10:14:34")
        })
        
        test("1:15abc", () => {
            shouldNotParse("1:15abc")
        })
        
        test("1.1:23", () => {
            shouldNotParse("1.1:23")
        })
        
        test("24:23", () => {
            shouldNotParse("24:23")
        })
        
        test("2423", () => {
            shouldNotParse("2423")
        })
        
        test("1:345", () => {
            shouldNotParse("1:345")
        })
        
        test("11345", () => {
            shouldNotParse("11345")
        })
        
        test("11:60", () => {
            shouldNotParse("11:60")
        })
        
        test("1160", () => {
            shouldNotParse("1160")
        })
        
        test("11+50", () => {
            shouldNotParse("11+50")
        })
        
    })
    
})

function shouldParseTo(text: string, hours: number, minutes: number) {
    const result = parseTime(text)
    const expected = new Date(1970, 0, 1, hours, minutes)
    expect(result).toStrictEqual(expected)
}

function shouldNotParse(text: string) {
    const result = parseTime(text)
    expect(result).toBeNull()
}