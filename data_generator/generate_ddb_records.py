import boto3
import random
import string
import time
from botocore.config import Config

def generate_random_string(length):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def write_random_records(table_name, num_records, aws_access_key_id, aws_secret_access_key):
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

    try:
        for _ in range(num_records):
            item = {
                'id': {'S': generate_random_string(10)},
                'data': {'S': generate_random_string(20)}
            }
            dynamodb.put_item(TableName=table_name, Item=item)
            time.sleep(0.2)  # Add a sleep delay to limit the API rate

        print(f"Successfully wrote {num_records} random records to table '{table_name}'")
    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    table_name = input("Enter the DynamoDB table name: ")
    num_records = int(input("Enter the number of random records to write: "))
    aws_access_key_id = input("Enter your AWS access key ID: ")
    aws_secret_access_key = input("Enter your AWS secret access key: ")

    write_random_records(table_name, num_records, aws_access_key_id, aws_secret_access_key)
