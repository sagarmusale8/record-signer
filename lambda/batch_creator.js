const AWS = require('aws-sdk');
const crypto = require('crypto');
const sqs = new AWS.SQS();
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event) {
    console.log("request:", JSON.stringify(event, undefined, 2));

    const userRecordsTable = process.env.USER_RECORDS_TABLE_NAME;
    const privateKeysTable = process.env.PRIVATE_KEYS_TABLE_NAME;
    const batchQueueUrl = process.env.BATCH_QUEUE_URL;

    const batchSize = 10;
    let lastEvaluatedKey = null;
    let totalCount = 0;

    var batchInd = 0;
    try {

        // Read private keys from DynamoDB table
        const privateKeysParams = {
            TableName: privateKeysTable,
        };
        const privateKeysResult = await dynamodb.scan(privateKeysParams).promise();
        const privateKeys = privateKeysResult.Items;
        console.log('Total private keys found here:'+privateKeys.length);

        do {
            // Scan User records
            const scanParams = {
                TableName: userRecordsTable,
                Limit: batchSize,
                ExclusiveStartKey: lastEvaluatedKey,
            };
            const userRecordsResult = await dynamodb.scan(scanParams).promise();
            const userRecords = userRecordsResult.Items;
            totalCount += userRecords.length;
            if (userRecords.length == 0) {
                break;
            }

            // Create SQS Params
            const recordIds = userRecords.map(record => record.id);
            const privateKey = privateKeys[batchInd % privateKeys.length].data;
            const batchId = crypto.randomUUID();
            const sqsParams = {
                MessageBody: JSON.stringify({
                    batchId: batchId,
                    recordIds: recordIds,
                    privateKey: privateKey,
                }),
                QueueUrl: batchQueueUrl,
            };

            // Send SQS Message
            await sqs.sendMessage(sqsParams).promise();
            console.log('Batch #' + batchInd + ' sent to SQS with batchId:' + batchId);
            batchInd++;

            // Check if there are more records to retrieve
            lastEvaluatedKey = userRecordsResult.LastEvaluatedKey;
        } while (lastEvaluatedKey);
        
        console.log('Schedule signing of the total records: #' + totalCount + ' in batches #'+ batchInd);
        return {
            statusCode: 200,
            body: 'Batches sent to SQS',
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: 'An error occurred',
        };
    }
};