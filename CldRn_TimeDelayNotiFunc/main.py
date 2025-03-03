import firebase_admin
from firebase_admin import credentials, firestore, messaging
from datetime import datetime
import pytz

def init_firebase():
    """Initialize Firebase Admin SDK if not already initialized"""
    if not firebase_admin._apps:
        cred = credentials.Certificate('service_key.json')
        firebase_admin.initialize_app(cred)

def send_notification(token, title, body):
    """Send a notification using FCM"""
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            token=token,
        )
        
        messaging.send(message)
        return True
    except Exception as e:
        print(f'Error sending notification: {e}')
        return False

def process_notifications(request):
    """
    Cloud Function to process scheduled notifications
    This function will be triggered by Cloud Scheduler via HTTP
    """
    # Initialize Firebase
    init_firebase()
    
    # Get Firestore client
    db = firestore.client()
    
    # Get current time in UTC
    current_time = datetime.utcnow().isoformat()
    print(f"Current time (UTC): {current_time}")
    
    try:
        # Query for pending notifications that are due
        print("Querying for notifications with conditions:")
        print(f"- status == 'pending'")
        print(f"- scheduled_time <= {current_time}")
        print(f"- sent == False")
        
        query = db.collection('scheduled_notifications').where(
            'status', '==', 'pending'
        ).where(
            'scheduled_time', '<=', current_time
        ).where(
            'sent', '==', False
        ).limit(100)  # Process in batches
        
        docs = query.stream()
        processed_count = 0
        success_count = 0
        
        # Debug: Print all matching documents
        all_docs = [doc.to_dict() for doc in docs]
        print(f"Found {len(all_docs)} matching documents:")
        for doc in all_docs:
            print(f"Document: {doc}")
        
        for doc in docs:
            processed_count += 1
            notification = doc.to_dict()
            
            # Try to send the notification
            success = send_notification(
                token=notification['token'],
                title=notification['title'],
                body=notification['body']
            )
            
            if success:
                success_count += 1
                # Update document as sent
                doc.reference.update({
                    'status': 'sent',
                    'sent': True,
                    'sent_at': datetime.utcnow().isoformat()
                })
            else:
                # Update retry count and status
                retry_count = notification.get('retry_count', 0) + 1
                status = 'failed' if retry_count >= 3 else 'pending'
                
                doc.reference.update({
                    'status': status,
                    'retry_count': retry_count,
                    'last_retry': datetime.utcnow().isoformat()
                })
        
        return f'Processed {processed_count} notifications, {success_count} sent successfully'
        
    except Exception as e:
        error_msg = f'Error processing notifications: {e}'
        print(error_msg)
        return error_msg, 500 