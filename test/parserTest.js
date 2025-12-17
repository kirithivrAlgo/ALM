
import { parseFeatureFile, convertParsedDataToSheetData } from '../src/utils/featureParser.js';
import fs from 'fs';
import path from 'path';

// Mocking file read since we are in a test script
const featurePath = 'c:/codebase/AlmUploader/test (1).feature';

try {
    const content = fs.readFileSync(featurePath, 'utf8');
    const result = parseFeatureFile(content);

    console.log("Parsing Complete.");
    console.log(`Generated ${result.length} rows.`);

    // Check first row
    if (result.length > 0) {
        console.log("First Row Sample:", JSON.stringify(result[0], null, 2));
    }

    console.log("---------------------------------------------------");
    console.log("Testing Sheet Conversion Logic...");
    const sheets = convertParsedDataToSheetData(result);
    console.log(`Generated ${sheets.length} sheets.`);

    if (sheets.length > 0) {
        const firstSheet = sheets[0];
        console.log(`First Sheet Name: ${firstSheet.name}`);
        console.log(`First Sheet Rows: ${firstSheet.data.length}`);

        // Validation
        const headers = firstSheet.data[0];
        if (headers[1] === "Step Name (Design Steps)" && headers[5] === "Test input (Design Steps)") {
            console.log("SUCCESS: Headers verified.");
        } else {
            console.log("FAILURE: Headers mismatch.");
            console.log("Headers Found:", headers);
        }

        // Check content (Sample row)
        if (firstSheet.data.length > 1) {
            const firstRow = firstSheet.data[1];
            console.log("First Data Row:", firstRow);

            // Verify ALM Fields
            if (firstRow[6] === "Flamingo\\Full Disclosure\\SSVP\\COMMON\\Automation" &&
                firstRow[8] === "VAPI-XP-TEST" &&
                firstRow[9] === "Design" &&
                firstRow[10] === "qcadmin") {
                console.log("SUCCESS: ALM Default Fields verified.");
            } else {
                console.log("FAILURE: ALM Default Fields mismatch.");
                console.log("Subject:", firstRow[6]);
                console.log("Type:", firstRow[8]);
                console.log("Status:", firstRow[9]);
                console.log("Designer:", firstRow[10]);
            }
        }
    } else {
        console.log("FAILURE: No sheets generated.");
    }


} catch (e) {
    console.error("Error running test:", e);
}
