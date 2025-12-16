
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
    console.log(outputRows, "outputRows")
    return outputRows;
}
