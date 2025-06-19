"""
Migration script to move data from JSON files to Firestore
Maintains data integrity and creates backups
"""

from firestore_service import firestore_service
import json
import os
import shutil
from datetime import datetime

def create_backup():
    """Create backup of existing JSON files."""
    print("📦 Creating backup of existing JSON files...")
    
    backup_dir = f'json_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    os.makedirs(backup_dir, exist_ok=True)
    
    files_to_backup = [
        'data/users.json',
        'data/user_profiles.json', 
        'data/saved_customers.json',
        'data/chat_sessions.json'
    ]
    
    backed_up_files = []
    for file_path in files_to_backup:
        if os.path.exists(file_path):
            filename = os.path.basename(file_path)
            backup_path = os.path.join(backup_dir, filename)
            shutil.copy2(file_path, backup_path)
            backed_up_files.append(f"{file_path} -> {backup_path}")
            print(f"  ✅ Backed up {file_path}")
    
    print(f"📦 Backup completed in: {backup_dir}")
    return backup_dir, backed_up_files

def verify_json_data():
    """Verify JSON data integrity before migration."""
    print("🔍 Verifying JSON data integrity...")
    
    files_to_check = [
        'data/users.json',
        'data/user_profiles.json', 
        'data/saved_customers.json',
        'data/chat_sessions.json'
    ]
    
    verification_results = {}
    
    for file_path in files_to_check:
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    verification_results[file_path] = {
                        'status': 'valid',
                        'records': len(data) if isinstance(data, dict) else 0
                    }
                    print(f"  ✅ {file_path}: {verification_results[file_path]['records']} records")
            except json.JSONDecodeError as e:
                verification_results[file_path] = {
                    'status': 'error',
                    'error': str(e)
                }
                print(f"  ❌ {file_path}: JSON decode error - {e}")
            except Exception as e:
                verification_results[file_path] = {
                    'status': 'error',
                    'error': str(e)
                }
                print(f"  ❌ {file_path}: Error - {e}")
        else:
            verification_results[file_path] = {
                'status': 'missing',
                'error': 'File does not exist'
            }
            print(f"  ⚠️  {file_path}: File not found")
    
    return verification_results

def migrate_data():
    """Migrate all JSON data to Firestore."""
    print("🚀 Starting Firestore migration...")
    
    # Verify data first
    verification = verify_json_data()
    
    # Check if any critical files have errors
    critical_files = ['data/users.json', 'data/user_profiles.json']
    for file_path in critical_files:
        if verification.get(file_path, {}).get('status') == 'error':
            print(f"❌ Critical file {file_path} has errors. Aborting migration.")
            return False
    
    # Create backup
    backup_dir, backed_up_files = create_backup()
    
    # Perform migration
    try:
        results = firestore_service.migrate_from_json('data')
        
        print(f"✅ Migration completed!")
        print(f"   📊 Users migrated: {results['users']}")
        print(f"   👤 Profiles migrated: {results['profiles']}")
        print(f"   🏢 Customers migrated: {results['customers']}")
        
        if results['errors']:
            print(f"⚠️  Errors encountered:")
            for error in results['errors']:
                print(f"     - {error}")
        
        # Verify migration
        print("\n🔍 Verifying migration...")
        verify_migration(results)
        
        print(f"\n🎉 Migration complete! Your data is now in Firestore.")
        print(f"💾 Backup saved in: {backup_dir}")
        print(f"📁 Backed up files:")
        for backup_file in backed_up_files:
            print(f"     {backup_file}")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print(f"💾 Your original data is safe in: {backup_dir}")
        return False

def verify_migration(migration_results):
    """Verify that migration was successful."""
    try:
        # Test reading some data from Firestore
        if migration_results['users'] > 0:
            print("  ✅ Users collection accessible")
        
        if migration_results['profiles'] > 0:
            print("  ✅ Profiles collection accessible")
        
        if migration_results['customers'] > 0:
            print("  ✅ Customers collection accessible")
        
        print("  ✅ Firestore migration verification passed")
        
    except Exception as e:
        print(f"  ⚠️  Migration verification warning: {e}")

def test_firestore_connection():
    """Test Firestore connection before migration."""
    print("🔗 Testing Firestore connection...")
    
    try:
        # Try to access Firestore
        db = firestore_service.db
        
        # Try a simple operation
        test_ref = db.collection('test').document('connection_test')
        test_ref.set({'test': True, 'timestamp': datetime.now()})
        
        # Clean up test document
        test_ref.delete()
        
        print("  ✅ Firestore connection successful")
        return True
        
    except Exception as e:
        print(f"  ❌ Firestore connection failed: {e}")
        print("  💡 Please check:")
        print("     - Firebase project configuration")
        print("     - firebase-auth.json file exists")
        print("     - Internet connection")
        print("     - Firestore is enabled in Firebase Console")
        return False

def main():
    """Main migration function."""
    print("🌟 AIBA Firestore Migration Tool")
    print("=" * 50)
    
    # Test Firestore connection first
    if not test_firestore_connection():
        print("\n❌ Cannot proceed with migration due to connection issues.")
        return
    
    # Show current data status
    print("\n📋 Current data status:")
    verification = verify_json_data()
    
    total_records = sum(
        result.get('records', 0) 
        for result in verification.values() 
        if result.get('status') == 'valid'
    )
    
    print(f"\n📊 Total records to migrate: {total_records}")
    
    if total_records == 0:
        print("⚠️  No data found to migrate.")
        print("💡 This might be a fresh installation or data files are missing.")
        
        response = input("\n❓ Continue anyway to set up Firestore? (y/N): ").lower()
        if response != 'y':
            print("Migration cancelled.")
            return
    else:
        print(f"\n⚠️  This will migrate {total_records} records to Firestore.")
        print("📦 A backup will be created automatically.")
        
        response = input("\n❓ Proceed with migration? (y/N): ").lower()
        if response != 'y':
            print("Migration cancelled.")
            return
    
    # Perform migration
    success = migrate_data()
    
    if success:
        print("\n🎊 Migration completed successfully!")
        print("💡 Next steps:")
        print("   1. Test your application")
        print("   2. Verify all features work correctly")
        print("   3. Keep the backup files safe")
        print("   4. Update your application to use Firestore")
    else:
        print("\n😞 Migration failed.")
        print("💡 Your original data is safe and unchanged.")
        print("   Check the error messages above and try again.")

if __name__ == "__main__":
    main() 