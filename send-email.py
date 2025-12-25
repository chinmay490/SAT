from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
import logging
import pg8000
from datetime import datetime
import uuid
import time
import os

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS - use simpler approach that works better with errors
# Allow specific origins but be flexible
CORS(app, 
     origins=["https://shardaautotraders.com", "http://shardaautotraders.com", 
              "http://localhost:3000", "https://www.shardaautotraders.com", 
              "http://www.shardaautotraders.com"],
     methods=["GET", "POST", "OPTIONS", "HEAD"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=False)

# Add after_request handler to ensure CORS headers are ALWAYS present
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin', '')
    logger.debug(f"after_request: Origin={origin}, Status={response.status_code}")
    # Always add CORS headers if origin matches (even if already present, we'll overwrite to ensure it's correct)
    if origin:
        allowed_origins = ["https://shardaautotraders.com", "http://shardaautotraders.com", 
                          "http://localhost:3000", "https://www.shardaautotraders.com", 
                          "http://www.shardaautotraders.com"]
        # Check if origin matches any allowed origin (case-insensitive)
        origin_lower = origin.lower()
        if any(allowed.lower() in origin_lower or origin_lower in allowed.lower() for allowed in allowed_origins):
            # Always set these headers to ensure they're present
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, HEAD'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Access-Control-Max-Age'] = '3600'
            logger.debug(f"Added CORS headers for origin: {origin}")
    else:
        logger.warning("No Origin header in request")
    return response

# Server state tracking
server_start_time = None
is_server_initialized = False
MAIN_DOMAIN = "https://shardaautotraders.com"

# Database configuration
DATABASE_URL = "postgresql://neondb_owner:npg_9cLginjNh1xG@ep-mute-sound-a42klwjp-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Outlook business email credentials (Hostinger)
OUTLOOK_USER = 'enquiry@shardaautotraders.com'  # Replace with your Outlook business email
OUTLOOK_PASS = 'ShardaAutoTraders#99223339'  # Updated with provided password

def initialize_server():
    global is_server_initialized, server_start_time
    if not is_server_initialized:
        logger.info("Initializing server components...")
        server_start_time = time.time()
        
        # Initialize database connection pool
        try:
            conn = get_db_connection()
            conn.close()
            logger.info("Database connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {str(e)}")
            raise
        
        # Email server connection is tested lazily when actually sending emails
        # This prevents blocking during initialization if email server is unreachable
        logger.info("Email server will be tested on first use")
        
        is_server_initialized = True
        logger.info("Server initialization completed")

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
        additional_info = order_data.get('additionalInfo', '')
        if isinstance(additional_info, dict):
            additional_info = '\n'.join(str(v) for v in additional_info.values())
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
    # Initialize server when main domain is accessed (non-blocking)
    try:
        initialize_server()
    except Exception as e:
        logger.error(f"Initialization error: {str(e)}")
        # Still return response even if initialization fails
        return jsonify({
            "message": "Server is running but initialization had issues",
            "status": "partial",
            "error": str(e),
            "initialized": is_server_initialized
        }), 200
    
    # Get the referrer to check if request came from main domain
    referrer = request.headers.get('Referer', '')
    user_agent = request.headers.get('User-Agent', '')
    
    logger.info(f"Request received from: {referrer}")
    logger.info(f"User Agent: {user_agent}")
    
    return jsonify({
        "message": "Email server is running",
        "status": "active",
        "uptime": time.time() - server_start_time if server_start_time else 0,
        "initialized": is_server_initialized
    })

@app.route('/api/send-email', methods=['POST', 'OPTIONS'])
def send_email():
    # Handle preflight OPTIONS request first
    if request.method == 'OPTIONS':
        response = jsonify({})
        origin = request.headers.get('Origin', '')
        if origin and ('shardaautotraders.com' in origin.lower() or 'localhost' in origin.lower()):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Access-Control-Max-Age'] = '3600'
        return response, 200
    
    # Wrap everything in try-except to ensure we always return a response with CORS headers
    try:
        # Initialize server if not already initialized (non-blocking)
        try:
            initialize_server()
        except Exception as e:
            logger.error(f"Initialization error in send_email: {str(e)}")
            # Continue anyway - database might still work
        
        # Check if request is from main domain (log but don't block - CORS will handle it)
        origin = request.headers.get('Origin', '')
        if origin and not any(domain in origin for domain in ['shardaautotraders.com', 'localhost:3000']):
            logger.warning(f"Request from unexpected origin: {origin}")
            # Don't block - let CORS handle it, but log for security monitoring
            
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
            msg['From'] = OUTLOOK_USER
            msg['To'] = OUTLOOK_USER

            # Send email with timeout to prevent blocking
            email_error = None
            email_sent = False
            
            # Try multiple SMTP configurations for Hostinger/GoDaddy email
            # Use shorter timeout to prevent worker timeouts (Gunicorn default is 30s)
            smtp_configs = [
                {'host': 'smtpout.secureserver.net', 'port': 465, 'use_ssl': True, 'timeout': 5},
                {'host': 'smtpout.secureserver.net', 'port': 587, 'use_ssl': False, 'timeout': 5},  # STARTTLS
            ]
            
            for config in smtp_configs:
                server = None
                try:
                    logger.info(f"Attempting email send via {config['host']}:{config['port']} (SSL: {config['use_ssl']})")
                    
                    if config['use_ssl']:
                        server = smtplib.SMTP_SSL(config['host'], config['port'], timeout=config['timeout'])
                    else:
                        server = smtplib.SMTP(config['host'], config['port'], timeout=config['timeout'])
                        if config['port'] == 587:
                            server.starttls()
                    
                    server.login(OUTLOOK_USER, OUTLOOK_PASS)
                    server.sendmail(OUTLOOK_USER, OUTLOOK_USER, msg.as_string())
                    
                    logger.info(f"Email sent successfully via {config['host']}:{config['port']}")
                    email_sent = True
                    break
                    
                except (smtplib.SMTPAuthenticationError, smtplib.SMTPException) as e:
                    email_error = f"SMTP error: {str(e)}"
                    logger.error(f"SMTP error with {config['host']}:{config['port']}: {str(e)}")
                    if isinstance(e, smtplib.SMTPAuthenticationError):
                        break  # Don't try other configs if auth fails
                except (TimeoutError, OSError, ConnectionError) as e:
                    email_error = f"Connection timeout/error: {str(e)}"
                    logger.error(f"Connection timeout/error with {config['host']}:{config['port']}: {str(e)}")
                    continue  # Try next configuration
                except Exception as e:
                    email_error = f"Unexpected error: {str(e)}"
                    logger.error(f"Unexpected error with {config['host']}:{config['port']}: {str(e)}")
                    continue  # Try next configuration
                finally:
                    if server:
                        try:
                            server.quit()
                        except:
                            pass  # Ignore errors when closing
            
            if not email_sent:
                logger.error(f"All email sending attempts failed. Last error: {email_error}")
                # Don't fail the entire request if email fails - order is already saved
                return jsonify({
                    'message': 'Order saved successfully, but email notification failed',
                    'orderId': order_id,
                    'warning': 'Email delivery failed, please check manually',
                    'emailError': email_error  # Include error for debugging
                }), 200

            return jsonify({
                'message': 'Order saved and email sent successfully',
                'orderId': order_id
            })
        except Exception as e:
            logger.error("Error processing order: %s", str(e), exc_info=True)
            response = jsonify({'error': f'Failed to process order: {str(e)}'})
            # Ensure CORS headers are added even on error
            origin = request.headers.get('Origin', '')
            if origin and ('shardaautotraders.com' in origin.lower() or 'localhost' in origin.lower()):
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, HEAD'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            return response, 500
    except Exception as e:
        # Catch any exception that might occur before the inner try block
        logger.error("Outer exception in send_email: %s", str(e), exc_info=True)
        response = jsonify({'error': f'Server error: {str(e)}'})
        # Always add CORS headers
        origin = request.headers.get('Origin', '')
        if origin and ('shardaautotraders.com' in origin.lower() or 'localhost' in origin.lower()):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, HEAD'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response, 500

@app.route('/health')
def health_check():
    return jsonify({
        'status': 'ok',
        'initialized': is_server_initialized,
        'uptime': time.time() - server_start_time if server_start_time else 0,
        'domain': MAIN_DOMAIN
    })

@app.route('/wake')
def wake_server():
    """Endpoint to wake up the server"""
    try:
        initialize_server()
    except Exception as e:
        logger.error(f"Wake initialization error: {str(e)}")
        return jsonify({
            'status': 'awake',
            'initialized': is_server_initialized,
            'uptime': time.time() - server_start_time if server_start_time else 0,
            'warning': f'Initialization had issues: {str(e)}'
        }), 200
    
    return jsonify({
        'status': 'awake',
        'initialized': is_server_initialized,
        'uptime': time.time() - server_start_time if server_start_time else 0
    })

# Global error handler to ensure CORS headers on all errors
# Note: flask-cors should handle this, but we add as backup if not present
@app.errorhandler(500)
def handle_500_error(e):
    logger.error(f"500 error: {str(e)}", exc_info=True)
    response = jsonify({'error': 'Internal server error', 'message': str(e) if hasattr(e, '__str__') else 'Unknown error'})
    origin = request.headers.get('Origin', '')
    # Only add if not already present (flask-cors might have added it)
    if origin and 'Access-Control-Allow-Origin' not in response.headers:
        if 'shardaautotraders.com' in origin.lower() or 'localhost' in origin.lower():
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, HEAD'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response, 500

@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
    response = jsonify({'error': 'Internal server error', 'message': str(e) if hasattr(e, '__str__') else 'Unknown error'})
    origin = request.headers.get('Origin', '')
    # Only add if not already present (flask-cors might have added it)
    if origin and 'Access-Control-Allow-Origin' not in response.headers:
        if 'shardaautotraders.com' in origin.lower() or 'localhost' in origin.lower():
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, HEAD'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response, 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
