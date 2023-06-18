import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

type RecordsBatchCreationResources = {
  userRecordsTable: dynamodb.Table,
  batchQueue: sqs.Queue,
  batchCreatorLambda: lambda.Function
};

type RecordsSigningResources = {
  recordsPublicKeyTable: dynamodb.Table,
  recordsSignerLambda: lambda.Function
};

export class RecordSignerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const recordsBatchCreationRes = createRecordsBatchCreationResources(this);
    const recordsSigningRes = createRecordsSigningResources(this,
      recordsBatchCreationRes.batchQueue,
      recordsBatchCreationRes.userRecordsTable)
  }
}

function createRecordsSigningResources(scope: Construct, 
  batchQueue: sqs.Queue, userRecordsTable: dynamodb.Table): RecordsSigningResources {
  
  // Table to store public keys
  const recordsPublicKeyTable = new dynamodb.Table(scope, 'RecordsPublicKey', {
    tableName: 'records-public-keys',
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING,
    },
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });

  // Lambda to sign the batch records
  const recordsSignerLambda = new lambda.Function(scope, 'RecordsSignerHandler', {
    runtime: lambda.Runtime.NODEJS_16_X,
    code: lambda.Code.fromAsset('lambda'),
    handler: 'records_signer.handler',
    environment: {
      USER_RECORDS_TABLE_NAME: userRecordsTable.tableName,
      RECORDS_PUBLIC_KEY_TABLE_NAME: recordsPublicKeyTable.tableName,
    },
  });

  // Permissions
  userRecordsTable.grantReadData(recordsSignerLambda);
  recordsPublicKeyTable.grantReadWriteData(recordsSignerLambda);

  // Trigger lambda on SQS Event
  recordsSignerLambda.addEventSource(new lambdaEventSources.SqsEventSource(batchQueue));

  return {
    "recordsPublicKeyTable": recordsPublicKeyTable,
    "recordsSignerLambda": recordsSignerLambda
  }
}

function createRecordsBatchCreationResources(scope: Construct): RecordsBatchCreationResources {
  
  // Table to store user records
  const userRecordsTable = new dynamodb.Table(scope, 'UserRecords', {
    tableName: 'user-records',
    partitionKey: {
      name: 'id',
      type: dynamodb.AttributeType.STRING,
    },
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });

  // Queue to trigger record batches
  const batchQueue = new sqs.Queue(scope, 'RecordSignerBatchQueue', {
    visibilityTimeout: Duration.seconds(300)
  });

  // Lambda to create record batches
  const batchCreatorLambda = new lambda.Function(scope, 'BatchCreatorHandler', {
    runtime: lambda.Runtime.NODEJS_16_X,
    code: lambda.Code.fromAsset('lambda'),
    handler: 'batch_creator.handler',
    environment: {
      USER_RECORDS_TABLE_NAME: userRecordsTable.tableName,
      BATCH_QUEUE_URL: batchQueue.queueUrl,
    },
  });

  // Permissions
  userRecordsTable.grantReadData(batchCreatorLambda);
  batchQueue.grantSendMessages(batchCreatorLambda);

  return {
    "userRecordsTable": userRecordsTable,
    "batchCreatorLambda": batchCreatorLambda,
    "batchQueue": batchQueue,
  }
}
