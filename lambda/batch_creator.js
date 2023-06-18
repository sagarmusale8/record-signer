const AWS = require('aws-sdk');

exports.handler = async function(event) {
    console.log("request:", JSON.stringify(event, undefined, 2));
    const sqs = new AWS.SQS();
    
    const userRecordsTableName = process.env.USER_RECORDS_TABLE_NAME;
    const batchQueueUrl = process.env.BATCH_QUEUE_URL;

    const params = {
        TableName: userRecordsTableName,
        Limit: 1,
    };

    const sqsParams = {
        MessageBody: 'Message 1',
        MessageAttributes: {
            RecordId: {
                DataType: "String",
                StringValue: "randomId"
            }
        },
        QueueUrl: batchQueueUrl,
    };

    try {
        await sqs.sendMessage(sqsParams).promise();
        console.log('Message sent to SQS');
        return {
          statusCode: 200,
          body: 'Message sent to SQS',
        };
      } catch (error) {
        console.error('Error:', error);
        return {
          statusCode: 500,
          body: 'An error occurred',
        };
    }

  };