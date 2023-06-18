#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RecordSignerStack } from '../lib/record-signer-stack';

const app = new cdk.App();
new RecordSignerStack(app, 'RecordSignerStack');
