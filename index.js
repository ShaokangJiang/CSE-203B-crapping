const puppeteer = require('puppeteer');
const urlencode = require('urlencode');
const HTMLParser = require('node-html-parser');
const core = require('@actions/core');
const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator();

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

async function mainFunction1() {
    // use try catch without timeout at here
    // const browser = await puppeteer.launch({ headless: true , args: [`--no-sandbox`, `--disable-setuid-sandbox`]});\
    let message = "";
    let screenshot = true;
    let hrstart = process.hrtime();
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    // await page.setDefaultNavigationTimeout(500000);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'image') {
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
        await page.goto('http://www.google.com', { waitUntil: 'networkidle2', timeout: 60000 }); // wait until page load
    } catch (e) {
        core.error("Wait too long for login page, terminating the program")
    }
    // await page.waitForTimeout(2000000);
    hrend = process.hrtime(hrstart);
    core.info("Finish loading the first page, first page loaded in " + hrend[0] + "s")
    let msg = await page.evaluate(async (USERNAME) => {
        document.getElementById("username").value = USERNAME;
        // console.log(USERNAME);
        return;
    }, USERNAME);

    await browser.close();
    return message;
}

async function main() {
    try {
        let hrstart = process.hrtime();
        let mainMessage;
        let count = 1;
        try {
            mainMessage = await mainFunction1();
        } catch (e) {
            core.error("Error happened: " + e + ", try again");
            count = count + 1;
            await browser.close();
            try {
                mainMessage = await mainFunction1();
            } catch (e) {
                core.error("Error happened: " + e + ", try again");
                count = count + 1;
                await browser.close();
                mainMessage = await mainFunction1();
            }
        }
        let hrend = process.hrtime(hrstart);
        core.info("Done in" + hrend)
    } catch (e) {
        await browser.close();
        core.setFailed(`Action failed with error ${e}`);
        process.exit(1);
    }
}

main();
