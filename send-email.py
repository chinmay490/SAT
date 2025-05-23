from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
import logging
import pg8000
from datetime import datetime
import uuid

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

# Database configuration
DATABASE_URL = "postgresql://neondb_owner:npg_9cLginjNh1xG@ep-mute-sound-a42klwjp-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Gmail credentials (use an App Password, not your real password)
GMAIL_USER = 'chinmaymishra490@gmail.com'
GMAIL_PASS = 'oegi lvvy xjll xomd'  # 16-char app password

def get_db_connection():
    try:
        # Parse the DATABASE_URL
        conn_params = {
            'user': 'neondb_owner',
            'password': 'npg_9cLginjNh1xG',
            'host': 'ep-mute-sound-a42klwjp-pooler.us-east-1.aws.neon.tech',
            'database': 'neondb',
            'port': 5432,
            'ssl_context': True
        }
        conn = pg8000.connect(**conn_params)
        return conn
    except Exception as e:
        logger.error("Database connection error: %s", str(e))
        raise

def save_order_to_db(order_data):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Generate a unique ID for the order
        order_id = str(uuid.uuid4())
        
        # Prepare the order data
        order_values = [
            order_id,
            order_data.get('productclass', ''),
            order_data.get('productType', ''),
            order_data.get('subproducttype', ''),
            order_data.get('classification', ''),
            order_data.get('brand_or_material', ''),
            order_data.get('additionalInfo', ''),
            str(order_data.get('quantity', '')),
            order_data.get('customerName', ''),
            order_data.get('customerPhone', ''),
            order_data.get('customerEmail', ''),
            order_data.get('customerlocation', ''),
            datetime.strptime(order_data.get('deliveryDate', ''), '%Y-%m-%d') if order_data.get('deliveryDate') else None
        ]
        
        # Insert the order into the database using numbered parameters
        cur.execute("""
            INSERT INTO "Order" (
                id, productclass, "productType", subproducttype, classification,
                brand_or_material, info, "Quantity", "customerName", "customerPhone",
                "customerEmail", customerlocation, "deliveryDate"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
        """, order_values)
        
        conn.commit()
        cur.close()
        conn.close()
        
        logger.info("Order saved to database successfully")
        return order_id
    except Exception as e:
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

        # Extract order data from the request
        order_data = data.get('orderData', {})
        if not order_data:
            logger.error("No order data provided in request")
            return jsonify({'error': 'No order data provided'}), 400

        # Validate required fields
        required_fields = ['customerName', 'customerEmail', 'customerPhone']
        missing_fields = [field for field in required_fields if not order_data.get(field)]
        if missing_fields:
            logger.error("Missing required fields: %s", missing_fields)
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400

        # Save order to database
        try:
            order_id = save_order_to_db(order_data)
            logger.info("Order saved with ID: %s", order_id)
        except Exception as e:
            logger.error("Failed to save order to database: %s", str(e))
            return jsonify({'error': 'Failed to save order to database'}), 500

        # Format the email content
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
            for key, value in order_data['additionalInfo'].items():
                summary += f"{key}: {value}\n"
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

        # Send email
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
