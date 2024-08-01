
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path'

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.tus.si');

    await page.setViewport({ width: 1080, height: 1024 });

    // Close cookie notification
    await page.waitForSelector("#cookie-close", { timeout: 3000 });
    await page.click("#cookie-close");

    await page.waitForSelector('#s2 div.slick-track');

    // Extract catalog information
    const catalogs = await page.evaluate(() => {
        const catalogElements = document.querySelectorAll('#s2 div.slick-track > li.list-item');
      
        const catalogData = [...catalogElements].map(element => {
            const catalog = {};
            catalog.title = element.querySelector('h3 a').innerText;
            const pdfLinkElement = element.querySelector('a.link-icon.solid.pdf');
            catalog.href = pdfLinkElement ? pdfLinkElement.href : null;
            const startDateElement = element.querySelector('time[datetime]');
            const endDateElement = element.querySelector('time[datetime]:last-of-type');
            const startDate = startDateElement ? startDateElement.getAttribute('datetime') : 'No start date found';
            const endDate = endDateElement ? endDateElement.getAttribute('datetime') : 'No end date found';
            catalog.duration = [startDate, endDate]
          return catalog
        });
        return catalogData
    });
    
    // Download PDFs and update catalog information with download status
    for (let catalog of catalogs) {
            if (catalog.href) {
                    const response = await fetch(catalog.href);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
                    }
                    const blob = await response.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    const pdfBuffer = new Uint8Array(arrayBuffer);
            
    
                const fileName = path.join(catalog.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf');
                fs.writeFileSync(`./PDF/${fileName}`, Buffer.from(pdfBuffer));
                catalog.downloaded = true;
                
   
            } else {
                console.error(`Failed to download PDF for ${catalog.title}: ${response.status()} ${response.statusText()}`);
                catalog.downloaded = false;
            }
    }

    // Save catalog information to a JSON file
    fs.writeFileSync('catalogs.json', JSON.stringify(catalogs, null, 2));

    await browser.close();
})();