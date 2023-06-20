import boto3
import uuid
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from botocore.config import Config

def generate_private_key():
    # Generate a new private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    return private_key

def convert_private_key_to_pem(private_key):
    # Convert the private key to PEM format
    pem_private_key = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    return pem_private_key.decode('utf-8')

def store_private_keys(private_keys, table_name, aws_access_key_id, aws_secret_access_key):
    dynamodb = boto3.client(
        'dynamodb',
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        config=Config(
            retries=dict(max_attempts=5),
            read_timeout=10,
            connect_timeout=10
        )
    )

    # Create a DynamoDB client
    dynamodb = boto3.client('dynamodb')

    # Create an item with the private key in the table
    for private_key in private_keys:
        item = {
            'id': {'S': str(uuid.uuid4())},
            'data': {'S': private_key}
        }
        response = dynamodb.put_item(
            TableName=table_name,
            Item=item
        )
    print("Private keys stored in DynamoDB")

def generate_and_store_private_keys(num_keys, table_name, aws_access_key_id, aws_secret_access_key):
    private_keys = []
    for _ in range(num_keys):
        private_key = generate_private_key()
        pem_private_key = convert_private_key_to_pem(private_key)
        private_keys.append(pem_private_key)
    
    store_private_keys(private_keys, table_name, aws_access_key_id, aws_secret_access_key)

if __name__ == '__main__':
    table_name = input("Enter the DynamoDB table name: ")
    num_keys = int(input("Enter the number of keys to generate: "))
    aws_access_key_id = input("Enter your AWS access key ID: ")
    aws_secret_access_key = input("Enter your AWS secret access key: ")

    # Generate and store PEM format private keys
    generate_and_store_private_keys(num_keys, table_name, aws_access_key_id, aws_secret_access_key)
