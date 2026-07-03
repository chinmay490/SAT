from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
import logging
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import uuid
import json
import os

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Configure CORS to allow all origins and methods
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Hostinger MySQL configuration (set these in your hosting environment)
DB_HOST = os.environ.get('DB_HOST', 'srv1856.hstgr.io ')
DB_PORT = int(os.environ.get('DB_PORT', '3306'))
DB_USER = os.environ.get('DB_USER', 'u813327138_Customer')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'Chinmay@0007')
DB_NAME = os.environ.get('DB_NAME', 'u813327138_Database')

# Gmail credentials (use an App Password, not your real password)
GMAIL_USER = os.environ.get('GMAIL_USER', 'chinmaymishra490@gmail.com')
GMAIL_PASS = os.environ.get('GMAIL_PASS', 'oegi lvvy xjll xomd')

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
        )
        return conn
    except Error as e:
        logger.error("Database connection error: %s", str(e))
        raise

def save_order_to_db(order_data):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        order_id = str(uuid.uuid4())

        additional_info = order_data.get('additionalInfo', '')
        if isinstance(additional_info, dict):
            additional_info = json.dumps(additional_info)

        order_values = [
            order_id,
            order_data.get('productclass', ''),
            order_data.get('productType', ''),
            order_data.get('subproducttype', ''),
            order_data.get('classification', ''),
            order_data.get('brand_or_material', ''),
            additional_info,
            str(order_data.get('quantity', '')),
            order_data.get('customerName', ''),
            order_data.get('customerPhone', ''),
            order_data.get('customerEmail', ''),
            order_data.get('customerlocation', ''),
            datetime.strptime(order_data.get('deliveryDate', ''), '%Y-%m-%d').date()
            if order_data.get('deliveryDate') else None
        ]

        cur.execute("""
            INSERT INTO `Order` (
                id, productclass, productType, subproducttype, classification,
                brand_or_material, info, Quantity, customerName, customerPhone,
                customerEmail, customerlocation, deliveryDate
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, order_values)

        conn.commit()
        cur.close()
        conn.close()

        logger.info("Order saved to database successfully")
        return order_id
    except Error as e:
        logger.error("Error saving order to database: %s", str(e))
        raise

@app.route('/')
def home():
    return jsonify({"message": "Email server is running"})

@app.route('/api/send-email', methods=['POST', 'OPTIONS'])
def send_email():
    if request.method == 'OPTIONS':
        return '', 200

    try:
        logger.debug("Received request data: %s", request.get_data())
        data = request.get_json()
        logger.debug("Parsed JSON data: %s", data)

        if not data:
            logger.error("No data provided in request")
            return jsonify({'error': 'No data provided'}), 400

        order_data = data.get('orderData', {})
        if not order_data:
            logger.error("No order data provided in request")
            return jsonify({'error': 'No order data provided'}), 400

        required_fields = ['customerName', 'customerEmail', 'customerPhone']
        missing_fields = [field for field in required_fields if not order_data.get(field)]
        if missing_fields:
            logger.error("Missing required fields: %s", missing_fields)
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400

        try:
            order_id = save_order_to_db(order_data)
            logger.info("Order saved with ID: %s", order_id)
        except Exception as e:
            logger.error("Failed to save order to database: %s", str(e))
            return jsonify({'error': 'Failed to save order to database'}), 500

        summary = "New Order Summary:\n\n"
        summary += "Product Details:\n"
        summary += f"Product Class: {order_data.get('productclass', 'N/A')}\n"
        summary += f"Product Type: {order_data.get('productType', 'N/A')}\n"
        summary += f"Sub Product Type: {order_data.get('subproducttype', 'N/A')}\n"
        summary += f"Brand/Material: {order_data.get('brand_or_material', 'N/A')}\n"
        summary += f"Classification: {order_data.get('classification', 'N/A')}\n"
        summary += f"Quantity: {order_data.get('quantity', 'N/A')}\n\n"

        if order_data.get('additionalInfo'):
            summary += "Additional Specifications:\n"
            additional_info = order_data['additionalInfo']
            if isinstance(additional_info, dict):
                for key, value in additional_info.items():
                    summary += f"{key}: {value}\n"
            else:
                summary += f"{additional_info}\n"
            summary += "\n"

        summary += "Customer Details:\n"
        summary += f"Name/Company: {order_data.get('customerName', 'N/A')}\n"
        summary += f"Email: {order_data.get('customerEmail', 'N/A')}\n"
        summary += f"Phone: {order_data.get('customerPhone', 'N/A')}\n"
        summary += f"Delivery Address: {order_data.get('customerlocation', 'N/A')}\n"
        summary += f"Delivery Date: {order_data.get('deliveryDate', 'N/A')}\n"

        logger.debug("Formatted email content: %s", summary)

        msg = MIMEText(summary)
        msg['Subject'] = f'New Order from {order_data.get("customerName", "Customer")}'
        msg['From'] = GMAIL_USER
        msg['To'] = GMAIL_USER

        try:
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(GMAIL_USER, GMAIL_PASS)
                server.sendmail(GMAIL_USER, GMAIL_USER, msg.as_string())
            logger.info("Email sent successfully")
        except Exception as e:
            logger.error("Failed to send email: %s", str(e))
            return jsonify({'error': 'Failed to send email'}), 500

        return jsonify({
            'message': 'Order saved and email sent successfully',
            'orderId': order_id
        })
    except Exception as e:
        logger.error("Error processing order: %s", str(e), exc_info=True)
        return jsonify({'error': f'Failed to process order: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
