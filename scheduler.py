# scheduler.py
import schedule
import time
from email_reader import get_payment_emails

schedule.every(10).minutes.do(get_payment_emails)

while True:
    schedule.run_pending()
    time.sleep(1)