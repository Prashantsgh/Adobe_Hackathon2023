// Function to add an Array of Records in CSV File
const addRecord = require('./Create_CSV/create_csv');

module.exports.extractBillInfo = async function extractBillInfo(extractedJSON){

    // Loop Over All Parsed Objects.
    for( let i = 0; i < extractedJSON.length; i++){

        let data = extractedJSON[i];        // Current Invoice Object.
        let invoice = {};                   // To Store The Common Invoice Details For All Items.
        let items = [];                     // To Store Item Details in the Invoice.
        const allRecords=[];                // To Store All the records from Current Invoive Object to enter in CSV File.
        let pos=0;                          // To Traverse The Text Elements in Order

        // EXTRACT FIELDS BASED ON BOUNDS
        // For Customer Details, Invoice Description and Invoice Due Date
        let customer_desc = "", invoice_desc = "", invoice_due = "";

        // Traversing Every Element and Filtering and Grouping in respective category based on Left bound/Alignment.
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
        });

        // Seperate Individual Fields From The Filtered Group.
        // For Customer Details.
        customer_desc = customer_desc.replace(/\s+/g,' ').trim();       // Remove Extra Space
        customer_desc = customer_desc.slice(7).trim().split(' ');       // Remove 'BILL TO' Word from the string   
    
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
        invoice.invoice__dueDate = invoice_due;

        
        // EXTRACT FIELDS BASED ON position/reltive order in JSON Object
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
    
        // For All Items.
        // Skipping all fields to reach first item.
        while(data[pos].Text==undefined || !data[pos].Text.startsWith('AMOUNT')){
            pos++;
        }
        pos++;
    
        while(1){
            if(data[pos].Text.startsWith('Subtotal')){
                break;
            }
            let item = {};
            item.invoice__billDetails__name = data[pos++].Text.trim();
            item.invoice__billDetails__quantity = parseInt(data[pos++].Text.trim());
            item.invoice__billDetails__rate = parseInt(data[pos++].Text.trim());
            items.push(item);
            pos++;
        }

        // For invoice Tax.
        // Group All The Elements After Subtotal and then filter out the portion after '%' and Before 'Total Due'.
        let tax = "";
        while(pos!=data.length){
            if(!data[pos].Text.startsWith('$')){
                tax+=data[pos++].Text;
            }
            else{
                pos++;
            }
        }
        
        if(tax.indexOf('%')==-1){
            invoice.invoice__tax = "";      // The tax Element isn't Identified In a PDF so, Leave it Blank
        }
        else{
            tax = tax.slice(tax.indexOf('%')+1 , tax.indexOf('Total Due')).trim();
            invoice.invoice__tax = parseInt(tax);
        }


        /* Adding Each Record of Current PDF Object in an Array and then Calling the Function 
           To Add Array of objects in CSV File. */
        items.forEach((item)=>{
            allRecords.push({...invoice  , ...item});
        })
        await addRecord(allRecords);
    }

    console.log("\nSuccesfully Created The CSV File at path 'ExtractedData/ExtractedData.csv'")
}