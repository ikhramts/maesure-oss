import { app } from 'electron';
import log from 'electron-log'
import * as process from 'process'
import * as child_process from 'child_process';
import * as moment from 'moment'
import * as path from 'path'

const pid = process.pid

// Autolaunch bridge helps handle the situation when an update has 
// occurred, but Squirrel (the auto-update library) failed to start
// the next version of Maesure.
export namespace AutolaunchBridge {
    export function scheduleAutolaunchBridgeAndQuit() {
        // We'll schedule a special version of Maesure (--autolaunchBridge) to run 
        // during the next minute using Windows task schduler.
        log.info(`[p:${pid}] Scheduling autolaunch bridge...`)
        const now = moment()
        let startTime = now.clone().startOf('minute').add(1, 'minute')

        log.info(`[p:${pid}] Current second: ${now.seconds()}`)

        if (now.seconds() > 45) {
            startTime.add(1, 'minute')
        }

        const startTimeStr = startTime.format("HH:mm")

        const schtasks = `schtasks /Create /TN "Launch Maesure after update" /TR "${process.execPath} --autolauncherBridge" /SC once /st ${startTimeStr} /F`
        log.info(`[p:${pid}] ${schtasks}`)

        child_process.exec(schtasks, (err, stdout, stderr) => {
            if (err) {
                log.error(err)
            }

            log.info(stdout)

            if (stderr.length > 0) {
                log.error(stderr)
            }

            log.info(`[p:${pid}] Exiting`)
            app.quit();
        })
    }

    export function startMaesureIfNotRunning() {
        // Maesure was started with --autolauncherBridge bridge flag.
        // Instead of starting normally, this process will check whether
        // Squirrel has started Maesure successfully. If not, then 
        // this autolaunche bridge will do it.
        //
        // This is necesasry because sometimes at the end of an
        // upgrade Squirrel fails to start Maesure.
        log.info(`[p:${pid}] Started in autolauncherBridge mode.`)

        log.info(`[p:${pid}] Checking if Maesure was started.`)

        child_process.exec('tasklist', (err, stdout, stderr) => {
            if (err) {
                log.error(`[p:${pid}] Could not check current processes:`)
                log.error(`[p:${pid}] ${err}`)
                app.quit()
                return
            }

            const stdoutLines = stdout.split("\n")
            let countOfMaesure = 0
            
            for (let line of stdoutLines) {
                if (line.trim().toLowerCase().startsWith("maesure")) {
                    countOfMaesure++
                }
            }

            log.info(`[p:${pid}] count(Maesure.exe) = ${countOfMaesure}`)

            if (countOfMaesure <= 2) {
                log.info(`[p:${pid}] Maesure is not running. Starting it...`)
                const cwd = path.dirname(process.execPath)

                const maesure = child_process.spawn(process.execPath, {
                    detached: true,
                    stdio: "ignore",
                    cwd: cwd
                })

                maesure.unref()

            } else {
                log.info(`[p:${pid}] Maesure is already running. Nothing to do.`)
            }

            log.info(`[p:${pid}] Autolaunch bridge done. Exiting.`)
            app.quit();
        })
    }
}