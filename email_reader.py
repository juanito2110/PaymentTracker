import imaplib
import email
from email.header import decode_header
import re
from datetime import datetime, timedelta
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from bs4 import BeautifulSoup  # For HTML parsing
from unidecode import unidecode

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
# Supabase setup
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# Email configuration
EMAIL = os.getenv("EMAIL")
PASSWORD = os.getenv("PASSWORD")
IMAP_SERVER = os.getenv("IMAP_SERVER")

load_dotenv()

# Initialize Supabase client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def parse_spanish_date(date_str):
    """Parse Spanish date format (e.g., '26 de mayo de 2025')"""
    months = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    }
    
    try:
        day, _, month, _, year = date_str.split()
        return f"{year}-{months[month.lower()]}-{day.zfill(2)}"
    except:
        return datetime.now().strftime("%Y-%m-%d")

def extract_payment_data(html_content):
    """Extract payment information from HTML email using BeautifulSoup"""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Initialize data dictionary
    data = {
        'order_id': None,
        'payment_date': None,
        'activity': None,
        'amount': None,
        'payer_name': None,
        'full_name': None,
        'payment_method': None
    }
    
    try:
        print("\n=== Starting email parsing ===")
        
        # 1. Extract order ID and date - this part is working
        order_link = soup.find('a', class_='link')
        if order_link:
            order_text = order_link.get_text(strip=True)
            data['order_id'] = re.search(r'Order\s+#(\d+)', order_text).group(1)
            print(f"✅ Extracted Order ID: {data['order_id']}")
            
            # Extract date
            time_tag = order_link.find_next('time')
            if time_tag and time_tag.get('datetime'):
                data['payment_date'] = time_tag['datetime'][:10]
                print(f"✅ Extracted Payment Date (from datetime attr): {data['payment_date']}")
            else:
                date_text = order_link.parent.get_text(strip=True)
                date_match = re.search(r'(\d+\s+de\s+\w+\s+de\s+\d{4})', date_text)
                if date_match:
                    data['payment_date'] = parse_spanish_date(date_match.group(1))
                    print(f"✅ Extracted Payment Date (from text): {data['payment_date']}")
        
        # 2. Extract activity name - needs adjustment
        product_cell = soup.find('td', class_='td', string=re.compile(r'BATERÍA|PIANO|GUITARRA'))
        if product_cell:
            data['activity'] = product_cell.get_text(strip=True)
            print(f"✅ Extracted activity: {data['activity']}")
        
        # 4. Extract payer name - from intro paragraph
        intro_ps = soup.find_all('p')
        for p in intro_ps:
            if "You have received an order from" in p.get_text():
                payer_match = re.search(r'You have received an order from (.+?):', p.get_text())
                if payer_match:
                    data['payer_name'] = payer_match.group(1).strip()
                    print(f"✅ Extracted Payer Name: {data['payer_name']}")
                    break
        
        # 5. Extract student name - needs more robust approach
        student_first = None
        student_last = None
        
        # Find all paragraphs and look for the specific patterns
        all_paragraphs = soup.find_all('p')
        for p in all_paragraphs:
            text = p.get_text(strip=True)
            if "Nombre del usuario del curso:" in text:
                student_first = text.split(":")[-1].strip()
                data['student_first'] = student_first
            elif "Apellidos del usuario del curso:" in text:
                student_last = text.split(":")[-1].strip()
                data['student_last'] = student_last
        
        if student_first and student_last:
            data['full_name'] = f"{student_first} {student_last}"
            print(f"✅ Extracted Student Name: {data['full_name']}")
        
        # 6. Extract amount - from Total row
        method_th = soup.find('th', class_='td', string=re.compile('Total:'))
        if method_th:
            method_td = method_th.find_next_sibling('td')
            if method_td:
                data['amount'] = method_td.get_text(strip=True)
                print(f"✅ Extracted Amount: {data['amount']}")

        # 6. Extract payment method
        method_th = soup.find('th', class_='td', string=re.compile('Método de pago:'))
        if method_th:
            method_td = method_th.find_next_sibling('td')
            if method_td:
                data['payment_method'] = method_td.get_text(strip=True)
                print(f"✅ Extracted Payment Method: {data['payment_method']}")
        
        # Verify we have all required fields
        required_fields = ['order_id', 'payment_date', 'amount', 'full_name']
        if all(data[field] for field in required_fields):
            print("🎉 All required fields extracted successfully!")
            return data
        else:
            missing = [field for field in required_fields if not data[field]]
            print(f"❌ Missing required fields: {missing}")
    
    except Exception as e:
        print(f"🔥 Error parsing email: {e}")
    
    return None

def process_emails():
    """Fetch and process emails, storing payments in database"""
    try:
        with imaplib.IMAP4_SSL(os.getenv("IMAP_SERVER")) as mail:
            mail.login(os.getenv("EMAIL"), os.getenv("PASSWORD"))
            mail.select("INBOX")
            
            since_date = (datetime.now() - timedelta(days=30)).strftime("%d-%b-%Y")
            status, messages = mail.search(None, f'(SINCE "{since_date}")')
            
            if status != "OK":
                print("No messages found")
                return []
            
            new_payments = []
            
            for mail_id in messages[0].split()[-10:]:  # Process last 10 emails
                status, msg_data = mail.fetch(mail_id, "(RFC822)")
                
                if status != "OK":
                    continue
                
                msg = email.message_from_bytes(msg_data[0][1])
                subject = decode_header(msg["Subject"])[0][0]
                
                if isinstance(subject, bytes):
                    subject = subject.decode("utf-8", errors="ignore")
                
                if "[Prides] New Order" not in subject:
                    continue
                
                # Extract email body (HTML part)
                html_content = None
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/html":
                            html_content = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                            break
                else:
                    if msg.get_content_type() == "text/html":
                        html_content = msg.get_payload(decode=True).decode("utf-8", errors="ignore")
                
                if not html_content:
                    continue
                
                # Extract payment data
                payment = extract_payment_data(html_content)
                if not payment:
                    print("Failed to extract payment data from email")
                    continue
                
                # Check if payment already exists
                existing = supabase.table("payments").select("*").eq("order_id", payment["order_id"]).execute()
                if existing.data:
                    print(f"Payment {payment['order_id']} already exists")
                    continue
                
                # Find matching user (by comparing full names manually)
                all_users = supabase.table("users").select("id, first_name, last_name").execute()

                user_id = None
                for user in all_users.data:
                    db_full_name = unidecode(f"{user['first_name'].strip()} {user['last_name'].strip()}".lower())
                    email_full_name = unidecode(payment['full_name'].strip().lower())
                    if db_full_name == email_full_name:
                        user_id = user["id"]
                        break

                try:
                    amount = float(str(payment['amount']).replace('€', '').strip())
                except (ValueError, TypeError, AttributeError):
                    print(f"⚠️ Invalid amount format: {payment.get('amount')}")
                    continue  # Skip this payment
                
                # Store payment
                payment_data = {
                    "order_id": payment["order_id"],
                    "payment_date": payment["payment_date"],
                    "activity": payment.get("activity", ""),
                    "amount": amount,  # Call the DB function
                    "payer_name": payment["payer_name"],
                    "full_name": payment["full_name"],
                    "first_name": payment["student_first"],
                    "last_name": payment["student_last"],
                    "payment_method": payment.get("payment_method", "Unknown"),
                    "user_id": user_id,
                    "processed_at": datetime.now().isoformat()
                }
                
                result = supabase.table("payments").insert(payment_data).execute()
                if not result.data:
                    print(f"Failed to insert payment {payment['order_id']}")
                else:
                    print(f"Successfully processed payment {payment['order_id']}")
                    new_payments.append(payment_data)
            
            return new_payments
    
    except Exception as e:
        print(f"Error processing emails: {e}")
        return []

