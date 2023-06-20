const AWS = require('aws-sdk');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event) {
    console.log('Initiating record signing function');
    const userRecordsTable = process.env.USER_RECORDS_TABLE_NAME;
    const recordsPublicKeysTable = process.env.RECORDS_PUBLIC_KEY_TABLE_NAME;

    try {
        for (const record of event.Records) {
            // Retrieve record IDs and privateKey from the SQS message event
            let sqsMsgBody = JSON.parse(record?.body);
            const recordIds = sqsMsgBody.recordIds;
            const privateKey = sqsMsgBody.privateKey;
            const batchId = sqsMsgBody.batchId;
            console.log('Processing record signing for batch ' + batchId)

            // Fetch records from DynamoDB
            console.log('Fetching records for  records #' + recordIds.length);
            const records = await fetchRecords(recordIds, userRecordsTable);
            

            // Sign the records
            console.log('Starting signing records');
            const signedRecords = signRecords(records, privateKey);

            // Store the signed records in the 'public-key' DynamoDB table
            console.log('Storing signed records in DDB');
            await storeRecords(signedRecords, recordsPublicKeysTable);

            console.log('Completed records signing');
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "text/plain" },
            body: `Completed records signing for #${event.Records.length} records\n`
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: 'An error occurred',
        };
    }
};

async function fetchRecords(recordIds, tableName) {
    const getItemPromises = recordIds.map(async recordId => {
        const getItemParams = {
            TableName: tableName,
            Key: {
                id: recordId,
            },
        };

        const result = await dynamodb.get(getItemParams).promise();
        return result.Item;
    });

    return Promise.all(getItemPromises);
}

function signRecords(records, privateKey) {
    return records.map(record => {
        const signedRecord = {
            ...record,
            signature: generateSignature(record, privateKey),
        };

        return signedRecord;
    });
}

function generateSignature(record, privateKey) {
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(record));
    const signature = sign.sign(privateKey, 'base64');
    return signature;
}

async function storeRecords(records, tableName) {
    const putItemPromises = records.map(async record => {
        const putItemParams = {
            TableName: tableName,
            Item: record,
        };

        await dynamodb.put(putItemParams).promise();
    });

    await Promise.all(putItemPromises);
}