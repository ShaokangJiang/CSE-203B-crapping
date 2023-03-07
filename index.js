const puppeteer = require('puppeteer');
const urlencode = require('urlencode');
const HTMLParser = require('node-html-parser');
const core = require('@actions/core');
const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator();
const fs = require('fs');
const dotenv = require("dotenv")

dotenv.config()

const { } = process.env;


if (false) {
    core.setFailed(`Action failed because of empty required secrets.`);
}

let browser;
var url = undefined;

function replaceAll(originalString, find, replace) {
    return originalString.replace(new RegExp(find, 'g'), replace);
}

async function mainFunction1(name) {
    // use try catch without timeout at here
    // const browser = await puppeteer.launch({ headless: true , args: [`--no-sandbox`, `--disable-setuid-sandbox`]});\
    let screenshot = false;
    let hrstart = process.hrtime();
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    // await page.setDefaultNavigationTimeout(500000);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'image' || req.resourceType() === 'media') {
            req.abort();
        }
        else {
            req.continue();
        }
    });

    let hrend = process.hrtime(hrstart);

    core.info("Start the first page, browser initialized in " + hrend[0] + "s")

    hrstart = process.hrtime();
    try {// wait for 60 seconds
        await page.goto('https://' + name + '.userbenchmark.com/', { waitUntil: 'networkidle2', timeout: 60000 }); // wait until page load
    } catch (e) {
        core.error("Wait too long for login page, terminating the program")
        await browser.close();
        core.setFailed(`Action failed with error ${e}`);
        process.exit(1);
    }
    // await page.waitForTimeout(2000000);
    hrend = process.hrtime(hrstart);
    core.info("Finish loading the first page, first page loaded in " + hrend[0] + "s")
    core.info("Start to get " + name + " info");
    let message = await page.evaluate(async () => {
        function handleNumber(num) {
            if (num.indexOf("k") != -1) {
                return (parseFloat(num) * 1000).toFixed(0);
            } else if (num.indexOf("M") != -1) {
                return (parseFloat(num) * 1000 * 1000).toFixed(0);
            } else {
                return (parseFloat(num)).toFixed(0);
            }
        }
        let toRe = "";
        document.querySelector("[data-mhth='MC_PRICE']").click()
        let counter = 0;
        while (true) {
            counter++;
            if (counter >= 60) return "Error";
            for (let i = 0; i < 7; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
                window.scrollTo(window.scrollX, window.scrollY + 500 + Math.random() * 300);
            }
            for (let i of document.getElementsByClassName("hovertarget")) {
                let lists = i.getElementsByTagName("td");
                let tempStr = lists[1].innerText.split("\n");
                //name,price,sample,valuable,bench,bench_low,bench_high
                if (lists[lists.length - 1].innerText.trim().length == 0)
                    return toRe;

                if (tempStr[1].indexOf("$") == -1) {
                    toRe += tempStr[1].trim()
                } else {
                    toRe += tempStr[1].substring(0, tempStr[1].indexOf("$")).trim()
                }
                toRe += "," + lists[lists.length - 1].innerText.split("\n")[0].replace("$", "").trim().replace(",", "") + "," + handleNumber(tempStr[2].replace("Samples", "").trim()) + "," + lists[3].innerText.split("\n")[0].trim();
                tempStr = lists[4].innerText.split("\n");
                toRe += "," + tempStr[0] + "," + tempStr[1].split("-")[0].trim() + "," + tempStr[1].split("-")[1].trim() + "\n";
            }
            document.getElementsByClassName("pagination pagination-lg")[0].lastElementChild.firstChild.click()
        }
    });
    if (message.localeCompare("Error") == 0) throw new Error("Error happened");

    await browser.close();
    return message;
}

async function main() {
    try {
        let hrstart = process.hrtime();
        let requests = ["cpu", "gpu", "ssd", "hdd", "ram"];
        for (let i of requests) {
            let mainMessage;
            let count = 1;
            try {
                mainMessage = await mainFunction1(i);
            } catch (e) {
                core.error("Error happened: " + e + ", try again");
                count = count + 1;
                await browser.close();
                try {
                    mainMessage = await mainFunction1(i);
                } catch (e) {
                    core.error("Error happened: " + e + ", try again");
                    count = count + 1;
                    await browser.close();
                    mainMessage = await mainFunction1(i);
                }
            }
            let hrend = process.hrtime(hrstart);
            core.info("Done " + i + " in " + hrend)
            // console.log(mainMessage);
            if (!fs.existsSync('./data')) {
                await fs.mkdirSync('./data');
            }
            await fs.writeFile("./data/" + i + ".csv", "name,price,sample,valuable,bench,bench_low,bench_high\n" + mainMessage, function (err) {
                if (err) {
                    return core.info(err);
                }
                core.info(i + ".csv was saved!");
            });
        }
    } catch (e) {
        await browser.close();
        core.setFailed(`Action failed with error ${e}`);
        process.exit(1);
    }
}

main();
