<template>
  <div class="feature-uploader">
    <h1>Feature to Excel Converter</h1>
    
    <div class="upload-section">
      <input 
        type="file" 
        accept=".feature" 
        @change="handleFileUpload" 
        class="file-input"
      />
      
      <button 
        @click="processFile" 
        :disabled="!fileContent" 
        class="process-btn"
      >
        Convert & Export
      </button>
    </div>

    <div v-if="localError" class="error">
      {{ localError }}
    </div>

    <div v-if="successMessage" class="success">
      {{ successMessage }}
    </div>
  </div>
</template>

<script setup>
import { saveAs } from 'file-saver';
import { ref } from 'vue';
import { parseFeatureFile } from '../utils/featureParser';
import * as XLSX from 'xlsx';

const fileContent = ref(null);
const fileName = ref('');
const localError = ref('');
const successMessage = ref('');

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  fileName.value = file.name;
  localError.value = '';
  successMessage.value = '';

  const reader = new FileReader();
  reader.onload = (e) => {
    fileContent.value = e.target.result;
  };
  reader.onerror = () => {
    localError.value = "Failed to read file";
  };
  reader.readAsText(file);
};

const processFile = () => {
  if (!fileContent.value) return;
  
  try {
    const data = parseFeatureFile(fileContent.value);
    
    // Default export if parser returns nothing yet
    if (!data || data.length === 0) {
        localError.value = "No data parsed (Parser logic pending)";
        return;
    }

    exportToExcel(data);
    successMessage.value = "Successfully exported SheetJSVueAoO.xlsx";
  } catch (err) {
    console.error(err);
    localError.value = "Error parsing file: " + err.message;
  }
};

const exportToExcel = (data) => {
  const wb = XLSX.utils.book_new();
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

    // Format parameters string for "Test input" column
    let paramString = "";
    if (item.Parameters) {
        paramString = Object.entries(item.Parameters)
            .map(([k, v]) => `${k}: ${v}`)
            .join('; ');
    }

    if (item.Steps) {
        const stepsArray = item.Steps.split('\n');
        
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
            }
            if (gwt==="Then" && description.startsWith("verify")) {
                expected = description;
                description = "";
            }
            let testInput = "";
            // check if step has parameters
            if (step.includes("<")) {
                
                //take the string between < and >
                const param = step.match(/<([^>]+)>/)[1];
                //replace the string with the value from item.Parameters
                testInput = item.Parameters[param].split('|');
                //if there are more values, take set of unique values and join with |
                if (testInput.length > 1) {
                    testInput = Array.from(new Set(testInput)).join('|');
                }else{
                    testInput = testInput.join('|');
                }
            }

            // Decide where 'Then' steps go. User requested 'Expected' column.
            // Strict interpretation: 'Then' -> Expected?
            // User requested 'GWT' column separately.
            // Let's put Keyword in 'GWT' and Content in 'Description' for now, 
            // as this is the most explicit mapping. 
            // 'Expected' left blank unless I'm sure. 
            // If I move 'Then' to Expected, GWT column becomes weird for that row.
            // I'll stick to: GWT = Keyword, Description = Content.

            const row = [
                step,                           // A: Empty
                `Step ${stepIndex + 1}`,        // B: Step Name
                gwt,                            // C: GWT
                description,                    // D: Description
                expected,                       // E: Expected (Blank)
                testInput,
                //stepIndex === 0 ? paramString : "", // F: Test input (Only on first step?) Or all? Let's put on first step to be cleaner.
                "",      // G: Subject
                "",    // H: Test Name
                "",                       // I: Type
                "",                       // J: Status
                ""                         // K: Designer (Placeholder)
            ];
            sheetData.push(row);
        });
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Manual Write and Download to ensure filename using file-saver
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, "SheetJSVueAoO.xlsx");
};
</script>

<style scoped>
.feature-uploader {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  font-family: Arial, sans-serif;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  margin-top: 2rem;
  padding: 2rem;
  border: 2px dashed #ccc;
  border-radius: 8px;
}

.file-input {
  padding: 0.5rem;
}

.process-btn {
  padding: 0.8rem 1.5rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.process-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.process-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.error {
  color: red;
  margin-top: 1rem;
}

.success {
  color: green;
  margin-top: 1rem;
}
</style>
