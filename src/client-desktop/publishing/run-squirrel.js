const electronInstaller = require('electron-winstaller');

console.log(`run-squirrel.js: building the Squirrel package...`);

electronInstaller.createWindowsInstaller({
    appDirectory: __dirname + '/../dist/Maesure-win32-x64',
    outputDirectory: __dirname + '/../dist/Release-win32-x64',
    // certificateFile: __dirname + '/code-signing-certificate-2019-03-26.p12',
    // certificatePassword: 'password',
    authors: 'Ordered Logic Inc.',
    exe: 'Maesure.exe',
    setupExe: "Maesure-setup.exe",
    setupMsi: "Maesure-setup.msi",
    noMsi: true
})
.catch((e) => {
    console.log(`run-squirrel.js: Could not build a Squirrel package: ${e.message}`);
})
.then(() => {
    console.log('run-squirrel.js: Squirrel packaging is done.');
})
