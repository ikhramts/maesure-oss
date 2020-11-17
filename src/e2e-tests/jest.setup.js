const failFast = require('jasmine-fail-fast')

jest.setTimeout(30 * 1000)

if (process.env.FAIL_FAST) {
    // Jasmine definition from @types/jest does not have `getEnv` for some reason
    // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/jest/index.d.ts
    // However this empirically works with jest 22.3.0. So we'll cast to any for now
    const jasmineEnv = jasmine.getEnv()
    jasmineEnv.addReporter(failFast.init())
  }

jasmine.getEnv().addReporter({
    specStarted: result => jasmine.currentTest = result,
    specDone: result => jasmine.currentTest = result,
});