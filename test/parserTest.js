
import { parseFeatureFile } from '../src/utils/featureParser.js';
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
        if (result[0].SheetName && result[0].Parameters) {
            console.log("SUCCESS: SheetName and Parameters present.");
        } else {
            console.log("FAILURE: Missing SheetName or Parameters.");
        }
    }

    // Check if we have multiple rows (we expect fewer rows now as we aggregate)
    const count = result.length;
    console.log(`Total Scenarios Parsed: ${count}`);

    // Verify aggregation check on first row if it has params
    if (result[0].Parameters && Object.values(result[0].Parameters).some(v => v.includes('|'))) {
        console.log("SUCCESS: Parameters aggregated with pipe.");
    } else if (result[0].Parameters) {
        // Might be single example, so no pipe.
        console.log("INFO: Parameters present, possibly single example.");
    }


} catch (e) {
    console.error("Error running test:", e);
}
