from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
import logging
import pymysql
from datetime import datetime
import uuid
import json
import os
import urllib.request
import urllib.error

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

ALLOWED_ORIGINS = {
    'https://shardaautotraders.com',
    'https://www.shardaautotraders.com',
}

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin', '')
    if origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
    return response

@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        return make_response('', 204)

# Hostinger MySQL — set in Render Environment, or edit values below
# On Render: DB_HOST must be the REMOTE hostname from hPanel → Remote MySQL (not localhost)
DB_HOST = os.environ.get('DB_HOST', 'srv1856.hstgr.io')
DB_PORT = int(os.environ.get('DB_PORT', '3306'))
DB_USER = os.environ.get('DB_USER', 'u813327138_Customer')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'Chinmay@0007')
DB_NAME = os.environ.get('DB_NAME', 'u813327138_Database')

# Gmail credentials (use an App Password, not your real password)
GMAIL_USER = os.environ.get('GMAIL_USER', 'chinmaymishra490@gmail.com')
GMAIL_PASS = os.environ.get('GMAIL_PASS', 'oegi lvvy xjll xomd')
# Brevo API key — required on Render FREE tier (SMTP ports 587/465 are blocked)
# Sign up free at https://www.brevo.com → SMTP & API → API Keys
BREVO_API_KEY = os.environ.get('BREVO_API_KEY', '')

def send_email_via_brevo(subject, body, to_email, from_email, api_key):
    """Send email over HTTPS (works on Render free tier)."""
    payload = json.dumps({
        'sender': {'name': 'Sharda Auto Traders', 'email': from_email},
        'to': [{'email': to_email}],
        'subject': subject,
        'textContent': body,
    }).encode('utf-8')
    req = urllib.request.Request(
        'https://api.brevo.com/v3/smtp/email',
        data=payload,
        headers={
            'api-key': api_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status not in (200, 201):
                raise RuntimeError(f'Brevo API returned status {resp.status}')
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Brevo API error {e.code}: {error_body}') from e

def send_email_via_smtp(subject, body, to_email, from_email, password):
    """Gmail SMTP — only works on paid Render or local machine."""
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_email
    with smtplib.SMTP('smtp.gmail.com', 587, timeout=10) as server:
        server.starttls()
        server.login(from_email, password.replace(' ', ''))
        server.sendmail(from_email, to_email, msg.as_string())

def send_order_email(subject, body):
    brevo_key = os.environ.get('BREVO_API_KEY', '').strip()
    on_render = bool(os.environ.get('RENDER'))

    if brevo_key:
        logger.info('Sending email via Brevo API')
        send_email_via_brevo(subject, body, GMAIL_USER, GMAIL_USER, brevo_key)
        return

    if on_render:
        raise RuntimeError(
            'SMTP is blocked on Render free tier. Add BREVO_API_KEY in Render Environment.'
        )

    logger.info('Sending email via Gmail SMTP (local)')
    send_email_via_smtp(subject, body, GMAIL_USER, GMAIL_USER, GMAIL_PASS)

def get_db_connection():
    try:
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4',
            connect_timeout=5,
            read_timeout=5,
            write_timeout=5,
        )
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

        additional_info = order_data.get('additionalInfo', '')
        if isinstance(additional_info, dict):
            additional_info = json.dumps(additional_info)

        # Prepare the order data
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

        # Insert the order into the database
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
    except Exception as e:
        logger.error("Error saving order to database: %s", str(e))
        raise

@app.route('/')
def home():
    return jsonify({"message": "Email server is running"})

@app.route('/api/send-email', methods=['POST'])
def send_email():
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

        # Save order to database (email still sent if DB is unavailable)
        order_id = None
        db_saved = False
        try:
            order_id = save_order_to_db(order_data)
            db_saved = True
            logger.info("Order saved with ID: %s", order_id)
        except Exception as e:
            order_id = str(uuid.uuid4())
            logger.error("Failed to save order to database: %s", str(e))

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

        subject = f'New Order from {order_data.get("customerName", "Customer")}'
        email_sent = False
        email_error = None
        try:
            send_order_email(subject, summary)
            email_sent = True
            logger.info("Email sent successfully")
        except Exception as e:
            email_error = str(e)
            logger.error("Failed to send email: %s", email_error)

        if db_saved:
            message = 'Order saved and email sent successfully' if email_sent else 'Order saved successfully'
        else:
            message = 'Order email sent successfully' if email_sent else 'Order could not be saved or emailed'

        status_code = 200 if db_saved or email_sent else 500
        return jsonify({
            'message': message,
            'orderId': order_id,
            'dbSaved': db_saved,
            'emailSent': email_sent,
            'emailError': email_error,
        }), status_code
    except Exception as e:
        logger.error("Error processing order: %s", str(e), exc_info=True)
        return jsonify({'error': f'Failed to process order: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
