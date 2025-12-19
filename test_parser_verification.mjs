import { convertParsedDataToSheetData } from './src/utils/featureParser.js';

const mockData = [{
    Feature: "Test Context",
    Scenario: "Scenario 1",
    Steps: [
        "Given I am a user",
        "When I do something",
        "Then I expect X",
        "And I expect Y",
        "When I do another thing",
        "And I do step Z",
        "Then I expect A",
        "But I should not see B"
    ].join('\n'),
    SheetName: "Test"
}];

console.log("Running Parser Verification...");
const result = convertParsedDataToSheetData(mockData);
const rows = result[0].data;

// Headers are row 0
// Row 1: Given ...
// Row 2: When ...
// Row 3: Then ... -> Expected: I expect X
// Row 4: And ...  -> Expected: I expect Y
// Row 5: When ...
// Row 6: And ...  -> Expected: No expected result
// Row 7: Then ... -> Expected: I expect A
// Row 8: But ...  -> Expected: I should not see B

let fail = false;

function checkRow(rowIndex, stepText, expectedResult, descriptionShouldBeEmpty) {
    const row = rows[rowIndex];
    const actualStep = row[1]; // Column B: Step Name (Step 1, Step 2...) - wait, index 1 is 'Step Name', index 0 is 'Step Content' (the raw step) based on the code?
    // Let's re-verify the code helper:
    // row indices: 
    // 0: step (raw)
    // 1: Step Name (Step 1...)
    // 2: GWT
    // 3: Description
    // 4: Expected

    // logic in code:
    // const row = [
    //    step,                           // A: Empty (actually code puts 'step' here?) - Wait, code says: "A: Empty" in comment, but puts `step` variable.
    //    `Step ${stepIndex + 1}`,        // B: Step Name
    //    gwt,                            // C: GWT
    //    description,                    // D: Description
    //    expected,                       // E: Expected
    // ...

    const actualGwt = row[2];
    const actualDesc = row[3];
    const actualExpected = row[4];

    console.log(`Row ${rowIndex}: ${actualGwt} ...`);
    console.log(`   Expected: "${actualExpected}"`);
    console.log(`   Description: "${actualDesc}"`);

    if (actualExpected !== expectedResult) {
        console.error(`ERROR: Row ${rowIndex} Expected mismatch. Got "${actualExpected}", anticipated "${expectedResult}"`);
        fail = true;
    }
    if (descriptionShouldBeEmpty && actualDesc !== "") {
        console.error(`ERROR: Row ${rowIndex} Description should be empty but was "${actualDesc}"`);
        fail = true;
    }
    if (!descriptionShouldBeEmpty && actualDesc === "") {
        // Technically strict check not required here given the logic is EITHER desc OR expected usually for Then
        // But for Given/When, description should be present
    }
}

// Row 0 is headers
checkRow(1, "Given", "No expected result required for this step", false);
checkRow(2, "When", "No expected result required for this step", false);
checkRow(3, "Then", "I expect X", true);
checkRow(4, "And", "I expect Y", true);
checkRow(5, "When", "No expected result required for this step", false);
checkRow(6, "And", "No expected result required for this step", false);
checkRow(7, "Then", "I expect A", true);
checkRow(8, "But", "I should not see B", true);

if (fail) {
    console.error("\nFAILED: Verification failed.");
    process.exit(1);
} else {
    console.log("\nSUCCESS: Verification passed.");
}
