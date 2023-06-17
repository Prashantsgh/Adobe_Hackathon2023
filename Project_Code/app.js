const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
const AdmZip = require('adm-zip');
const fs = require('fs');

// Function to Extract all Output Fields/Record from parsed JSONs of All PDFs and store Them in CSV File
const {extractBillInfo} = require('./extractBillDetails');

// SET UP SDK
const credentials = PDFServicesSdk.Credentials
    .serviceAccountCredentialsBuilder()
    .fromFile('./Credentials/pdfservices-api-credentials.json')
    .build();

// Create an ExecutionContext using credentials.
const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);

// Build extractPDF options.
const options = new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
                .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT).build();


// EXTRACT JSON DATA FROM ALL PDFs USING EXTRACT API
console.log("Starting To Convert PDFs To JSON");
const extractedJSON = [];       // To store the parsed object of each pdf.
const pdfCount = 100;           // No of PDFs to extract.
let extractedPDFCount = 0;      // No of PDFs extracted till now.
let timeout = 3000;             // Time(ms) Between each request sent to API

// Loop over all the pdfs.
for(let i = 0; i < pdfCount ; i++){
    const INPUT_PDF = `./InvoicesData/TestDataSet/output${i}.pdf`;
    const OUTPUT_ZIP = `./zip_files/ExtractTextInfoFromPDF${i+1}.zip`;

    // Remove if the output already exists.
    if(fs.existsSync(OUTPUT_ZIP)) fs.unlinkSync(OUTPUT_ZIP);

    // Pass the PDF to ExtractAPI to Convert into JSON.
    extractPDF(INPUT_PDF, OUTPUT_ZIP, i);
}


// FUNCTION TO CONVERT PDF TO JSON AND PARSE IT
// AND CALL 'extractBillInfo' FUNCTION AFTER ALL PDFs ARE CONVERTED
function extractPDF(Input_Pdf, Output_Zip, pdf_No){

    // Create a new operation instance.
    const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew(),
            input = PDFServicesSdk.FileRef.createFromLocalFile(
                Input_Pdf, 
                PDFServicesSdk.ExtractPDF.SupportedSourceFormat.pdf
            );
    
    extractPDFOperation.setInput(input);
    extractPDFOperation.setOptions(options);

    // Execute the operation.
    setTimeout(() => {
        extractPDFOperation.execute(executionContext)
            .then(result => result.saveAsFile(Output_Zip))
            .then(() => {
                let zip = new AdmZip(Output_Zip);
                let jsondata = zip.readAsText('structuredData.json');
                let data = JSON.parse(jsondata);

                // Filter out the Text elements from the output.
                let jsonRecord = [];
                data.elements.forEach(element => {
                    if(element.Text!=undefined){
                        jsonRecord.push(element);
                    }
                });

                // Insert the Parsed JSON in Output Array.
                extractedJSON[pdf_No] = jsonRecord;
                extractedPDFCount++;

                console.clear();
                console.log(`Successfully extracted information from ${extractedPDFCount} PDFs.`);

                // AFTER ALL PDFs ARE CONVERTED, EXTRACT THE FIELDS FROM PARSED OBJECT AND STORE RECORDS IN CSV FILE
                if(extractedPDFCount===pdfCount){
                    extractBillInfo(extractedJSON); 
                }
            })
            .catch(err => console.log(err));
    }, timeout*pdf_No);
}
                