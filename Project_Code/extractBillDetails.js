// Function to add a row in CSV File
const addRecord = require('./Create_CSV/create_csv');

module.exports.extractBillInfo = async function extractBillInfo(extractedJSON){

    // Loop Over All Parsed Objects.
    for( let i = 0; i < extractedJSON.length; i++){

        let data = extractedJSON[i];        // Current Invoice Object.
        let invoice = {};                   // To Store The Common Invoice Details For All Items.
        const allRecords=[];                // To Store All the records from Current Invoive Object to enter in CSV File.
        let pos=0;                          // To Traverse The Text Elements in Order

        // EXTRACT FIELDS BASED ON BOUNDS
        // For Customer and Invoice Description, Invoice Due Date and Invoice Tax
        let customer_desc = "", invoice_desc = "", invoice_due = "";

        // Traversing Every Element and Filtering in respective category based on bounds
        data.forEach(element => {
            if(element.Bounds[0]==81.04800415039062){
                customer_desc+=element.Text+' ';             // Customer Description
            }
            else if(element.Bounds[0]==240.25999450683594){
                invoice_desc+=element.Text+' ';            // Invoice Description
            }
            else if(element.Bounds[0]==412.8000030517578){
                invoice_due+=element.Text+' ';            // Invoice Due Date
            }
            else if(element.Bounds[0]==485.92999267578125 && !element.Text.startsWith('$')){
                invoice.invoice__tax = parseInt(element.Text);          // Invoice Tax
            }
        });

        // For Customer Description.
        customer_desc = customer_desc.replace(/\s+/g,' ').trim();
        customer_desc = customer_desc.slice(7).trim().split(' ');
    
        invoice.customer__name = customer_desc[0] + " " + customer_desc[1];
    
        let email = "",curr=2;
        while(!email.endsWith('.com')){
            email+=customer_desc[curr++];
        }
        invoice.customer__email = email;
    
        invoice.customer__phoneNumber = customer_desc[curr++];
    
        invoice.customer__address__line1 = customer_desc[curr++] + " " + customer_desc[curr++] + " " + customer_desc[curr++];
    
        invoice.customer__address__line2 = customer_desc[curr++];
        while(curr<customer_desc.length){
            invoice.customer__address__line2 += " " + customer_desc[curr++];
        }
    
        // For Invoice Description.
        invoice_desc = invoice_desc.replace(/\s+/g,' ').trim();
        invoice.invoice__description = invoice_desc.slice(7).trim();
    
        // For Invoice Due Date
        invoice_due = invoice_due.replace(/\s+/g,' ').trim();
        invoice_due = invoice_due.split(' ')[3].trim();
        invoice_due = invoice_due.split('-');
        invoice.invoice__dueDate = `${parseInt(invoice_due[0])}-${parseInt(invoice_due[1])}-${parseInt(invoice_due[2])}`;

        
        // EXTRACT FIELDS BASED ON position in JSON Object
        // For Business Name.
        invoice.business__name = data[pos++].Text.trim();
    
        // For Complete Business Address.
        let address = data[pos++].Text.split(',');
        while(address.length<4){
            address.push(...data[pos++].Text.split(','));
        }

        // Filtering empty fields From address array.
        address = address.filter((temp)=>{
            return temp.trim()!="";
        })
    
        invoice.business__streetAddress = address[0].trim();
        invoice.business__city = address[1].trim();
        invoice.business__country = address[2].trim() + ", " + address[3].trim();
    
        // For Zip Code.
        invoice.business__zipcode = parseInt(data[pos++].Text.trim());
        
        // For Invoice Number and Issue Date.
        let details= data[pos++].Text.trim().split(' ');
        while(details.length<5){
            details.push(...data[pos++].Text.trim().split(' '));
        }
        invoice.invoice__number = details[1];
        invoice.invoice__issueDate = details[4];
    
        // For Business Description.
        pos++;      // Skip The Business Title.
        invoice.business__description = data[pos++].Text.trim();
    
        // For Items.
        // Skipping all fields to reach first item.
        while(data[pos].Text==undefined || !data[pos].Text.startsWith('AMOUNT')){
            pos++;
        }
        pos++;
    
        while(1){
            let item = {};
            if(data[pos].Text.startsWith('Subtotal')){
                break;
            }
    
            item.invoice__billDetails__name = data[pos++].Text.trim();
            item.invoice__billDetails__quantity = parseInt(data[pos++].Text.trim());
            item.invoice__billDetails__rate = parseInt(data[pos++].Text.trim());
            pos++;
    
            allRecords.push({...invoice  , ...item});
        }

        await addRecord(allRecords);
    }

    console.log("\nSuccesfully Created The CSV File at path 'ExtractedData/ExtractedData.csv'")
}