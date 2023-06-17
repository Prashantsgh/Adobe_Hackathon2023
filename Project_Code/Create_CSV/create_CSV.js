const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const columns = require('./columns');    // Contains column Titles

// Set up CSV writer module
const csvWriter = createCsvWriter({
    header: columns,
    path: './ExtractedData/ExtractedData.csv'
});

// Adding a Record in the CSV File
module.exports = async function addRecord(record){
    await csvWriter.writeRecords(record);
};
