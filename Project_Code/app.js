const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
const AdmZip = require('adm-zip');
const fs = require('fs');

// Function to Extract all Output Fields from parsed JSONs of all PDFs and store the Records in CSV File
const {extractBillInfo} = require('./extractBillDetails');

// SET UP SDK
const credentials = PDFServicesSdk.Credentials
    .serviceAccountCredentialsBuilder()
    .fromFile('./Credentials/pdfservices-api-credentials.json')
    .build();

// Create client config instance with custom time-outs.
const clientConfig = PDFServicesSdk.ClientConfig
    .clientConfigBuilder()
    .withConnectTimeout(20000)
    .withReadTimeout(20000)
    .build();

// Create an ExecutionContext using credentials.
const executionContext = PDFServicesSdk.ExecutionContext.create(credentials,clientConfig);

// Build extractPDF options.
const options = new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
                .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT).build();


// EXTRACT JSON DATA FROM ALL PDFs USING EXTRACT API.

/* For Each PDF, Send a Request to the API and after getting the JSON Object,
Parse it and filter out the Text Elements and Store the filtered Object in The Array.
Finally, after Extracting from each PDF, Call the function to filter the records and store in CSV File.
Requests are sent at a interval of 3sec to avoid Rate Limit of 25Req/min.
*/
console.log("Starting To Convert PDFs To JSON");
const extractedJSON = [];       // To store the parsed object of each pdf.
const pdfCount = 100;           // No of PDFs to extract.
let extractedPDFCount = 0;      // No of PDFs extracted till now.
let request_interval = 3000;    // Time(ms) Between each request sent to API

// Loop over all the pdfs.
for(let i = 0; i < pdfCount ; i++){
    const INPUT_PDF = `./InvoicesData/TestDataSet/output${i}.pdf`;
    const OUTPUT_ZIP = `./zip_files/ExtractTextInfoFromPDF${i}.zip`;

    // Remove if the output already exists.
    if(fs.existsSync(OUTPUT_ZIP)) fs.unlinkSync(OUTPUT_ZIP);

    // Pass the PDF to ExtractAPI to Convert into JSON.
    extractPDF(INPUT_PDF, OUTPUT_ZIP, i, request_interval*i);
}


/* FUNCTION TO CONVERT PDF TO JSON ,PARSE IT AND FILTER TEXT ELEMENTS,
   AND CALL 'extractBillInfo' FUNCTION AFTER ALL PDFs ARE CONVERTED. */
function extractPDF(Input_Pdf, Output_Zip, pdf_No, timeout){

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

                /* After all PDFs are converted, Call the function to Extract the fields from Parsed Object of each Invoice
                   and store the records in CSV File */
                if(extractedPDFCount===pdfCount){
                    extractBillInfo(extractedJSON); 
                }
            })
            .catch(err => {
                console.log(err);

                // Resend Request For the PDF For which Error Occurred
                console.log(`Resending Request For PDF Output${pdf_No}.pdf`);
                const INPUT_PDF = `./InvoicesData/TestDataSet/output${pdf_No}.pdf`;
                const OUTPUT_ZIP = `./zip_files/ExtractTextInfoFromPDF${pdf_No}.zip`;

                // Remove if the output already exists.
                if(fs.existsSync(OUTPUT_ZIP)) fs.unlinkSync(OUTPUT_ZIP);

                // Pass the PDF to ExtractAPI to Convert into JSON.
                extractPDF(INPUT_PDF, OUTPUT_ZIP, pdf_No, 0);

            });
    }, timeout);
}
                