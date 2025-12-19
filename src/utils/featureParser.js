
export function parseFeatureFile(content) {
    const lines = content.split(/\r?\n/);
    let featureName = "";
    const scenarios = [];

    let currentScenario = null;
    let mode = 'scan'; // scan, steps, examples
    let headers = [];

    const flushScenario = () => {
        if (currentScenario) {
            scenarios.push(currentScenario);
        }
    };

    const startNewScenario = (name) => {
        flushScenario();
        currentScenario = {
            name: name,
            steps: [],
            examples: {}, // { headers: [], rows: [] }
            hasExamples: false
        };
        mode = 'steps';
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Basic comment handling (skip full line comments)
        if (line.startsWith('#')) continue;

        if (line.startsWith('Feature:')) {
            featureName = line.substring(8).trim();
            continue;
        }

        if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
            const name = line.replace(/^(Scenario|Scenario Outline):/, '').trim();
            startNewScenario(name);
            continue;
        }

        if (line.startsWith('Examples:')) {
            if (currentScenario) {
                currentScenario.hasExamples = true;
                mode = 'examples';
                headers = []; // Reset headers for new block
            }
            continue;
        }

        if (line.startsWith('@')) {
            // Tags - for now we ignore them or attach them to the next scenario if we wanted to be fancy
            continue;
        }

        if (mode === 'steps') {
            if (/^(Given|When|Then|And|But)\s/.test(line)) {
                if (currentScenario) {
                    currentScenario.steps.push(line);
                }
            }
        } else if (mode === 'examples') {
            if (line.startsWith('|')) {
                // Parse table row
                // Split by pipe, remove first/last empty elements if they exist
                const cells = line.split('|').map(c => c.trim());
                // valid row | a | b | -> ["", "a", "b", ""]
                if (cells.length >= 2 && cells[0] === '' && cells[cells.length - 1] === '') {
                    cells.pop();
                    cells.shift();
                } else {
                    // unexpected format, try to be lenient
                    // filter out empty?
                    // actually Gherkin tables usually strictly | ... |
                }

                if (headers.length === 0) {
                    headers = cells;
                } else {
                    // It's a data row
                    // const rowData = {};
                    headers.forEach((h, idx) => {
                        const val = cells[idx] || "";
                        if (currentScenario && currentScenario.examples) {
                            if (currentScenario.examples[h]) {
                                currentScenario.examples[h] = currentScenario.examples[h] + "|" + val;
                            } else {
                                currentScenario.examples[h] = val;
                            }
                        }
                    });

                }
            }
        }
    }
    flushScenario();

    // Expansion Logic
    const outputRows = [];

    scenarios.forEach(sc => {
        if (sc.hasExamples && Object.keys(sc.examples).length > 0) {
            // Aggregate Scenario - Single row with aggregated Parameters
            const exportRow = {
                Feature: featureName,
                Scenario: sc.name,
                Steps: sc.steps.join('\n'), // Keep steps with <Placeholders>
                Parameters: sc.examples,     // { Param1: "Val1|Val2", Param2: "..." }
                SheetName: sc?.name?.split('-')[0]?.trim(),
            };
            outputRows.push(exportRow);
        } else {
            // No examples, just output the scenario as is (single row)
            const exportRow = {
                Feature: featureName,
                Scenario: sc.name,
                Steps: sc.steps.join('\n'),
                SheetName: sc?.name?.split('-')[0]?.trim(),
            };
            outputRows.push(exportRow);
        }
    });

    return outputRows;
}

export function convertParsedDataToSheetData(data) {
    const sheets = [];
    const sheetCounts = {};

    data.forEach((item, index) => {
        let baseName = item.SheetName || `Sheet${index + 1}`;
        baseName = baseName.replace(/[\/\\\?\*\[\]\:]/g, '_').substring(0, 31);

        let sheetName = baseName;
        if (sheetCounts[baseName]) {
            sheetCounts[baseName]++;
            const suffix = `_${sheetCounts[baseName]}`;
            sheetName = baseName.substring(0, 31 - suffix.length) + suffix;
        } else {
            sheetCounts[baseName] = 1;
        }

        // ALM Headers
        const headers = [
            "",                             // Column A: Empty
            "Step Name (Design Steps)",     // Column B
            "GWT (Design Steps)",           // Column C
            "Description (Design Steps)",   // Column D
            "Expected (Design Steps)",      // Column E
            "Test input (Design Steps)",    // Column F
            "Subject",                      // Column G
            "Test Name",                    // Column H
            "Type",                         // Column I
            "Status",                       // Column J
            "Designer"                      // Column K
        ];

        const sheetData = [headers];

        // Format parameters string for "Test input" column (if needed elsewhere, logic preserved)
        // let paramString = "";
        // if (item.Parameters) {
        //     paramString = Object.entries(item.Parameters)
        //         .map(([k, v]) => `${k}: ${v}`)
        //         .join('; ');
        // }

        if (item.Steps) {
            const stepsArray = item.Steps.split('\n');

            let lastExplicitKeyword = "";
            stepsArray.forEach((step, stepIndex) => {
                if (!step.trim()) return;

                // Extract Keyword and Description
                // Regex to find starting keyword (Given, When, Then, And, But)
                const match = step.match(/^(\s*)(Given|When|Then|And|But)\s+(.*)/i);

                let gwt = "Step"; // Default if not standard Gherkin
                let description = step.trim();
                let expected = "";

                if (match) {
                    // match[1] indent (ignored), match[2] Keyword, match[3] Content
                    gwt = match[2]; // e.g. "Given"
                    description = match[3];
                    expected = "No expected result required for this step";

                    if (["Given", "When", "Then"].includes(gwt)) {
                        lastExplicitKeyword = gwt;
                    }
                }

                if (gwt === "Then" || (["And"].includes(gwt) && lastExplicitKeyword === "Then")) {
                    expected = description;
                    description = "";
                }
                let testInput = "";
                // check if step has parameters
                if (step.includes("<")) {

                    //take the string between < and >
                    // Safety check if match fails
                    const paramMatch = step.match(/<([^>]+)>/);
                    if (paramMatch && item.Parameters && item.Parameters[paramMatch[1]]) {
                        const paramKey = paramMatch[1];
                        const paramVal = item.Parameters[paramKey];
                        if (paramVal) {
                            let valArray = paramVal.split('|');
                            //if there are more values, take set of unique values and join with |
                            if (valArray.length > 1) {
                                testInput = Array.from(new Set(valArray)).join('|');
                            } else {
                                testInput = valArray.join('|');
                            }
                        }
                    }
                }

                const row = [
                    step,                           // A: Empty
                    `Step ${stepIndex + 1}`,        // B: Step Name
                    gwt,                            // C: GWT
                    description,                    // D: Description
                    expected,                       // E: Expected
                    testInput,                      // F: Test input
                    stepIndex === 0 ? "Flamingo\\Full Disclosure\\SSVP\\COMMON\\Automation" : "", // G: Subject
                    stepIndex === 0 ? "" : "",      // H: Test Name
                    stepIndex === 0 ? "VAPI-XP-TEST" : "", // I: Type
                    stepIndex === 0 ? "Design" : "",       // J: Status
                    stepIndex === 0 ? "qcadmin" : ""       // K: Designer
                ];
                sheetData.push(row);
            });
        }

        sheets.push({
            name: sheetName,
            data: sheetData
        });
    });

    return sheets;
}
