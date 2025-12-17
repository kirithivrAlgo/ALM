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
import { parseFeatureFile, convertParsedDataToSheetData } from '../utils/featureParser';
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
  
  const sheets = convertParsedDataToSheetData(data);

  sheets.forEach(sheet => {
    const ws = XLSX.utils.aoa_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
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
