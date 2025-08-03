import { StorageService } from '../lib/storage';
import { supabase } from '../lib/supabase';

/**
 * Script to initialize the storage bucket for ID documents
 * Run this script to create the necessary storage bucket and policies
 */
async function initializeStorage() {
  console.log('🚀 Initializing storage bucket for ID documents...');

  try {
    // Initialize the bucket
    const bucketCreated = await StorageService.initializeBucket();
    
    if (bucketCreated) {
      console.log('✅ Storage bucket initialized successfully');
      
      // Test bucket access
      console.log('🔍 Testing bucket access...');
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('❌ Error listing buckets:', error);
        return;
      }
      
      const idDocumentsBucket = buckets?.find(bucket => bucket.name === 'id-documents');
      
      if (idDocumentsBucket) {
        console.log('✅ ID documents bucket found:', idDocumentsBucket);
        console.log('📋 Bucket details:');
        console.log(`   - Name: ${idDocumentsBucket.name}`);
        console.log(`   - ID: ${idDocumentsBucket.id}`);
        console.log(`   - Public: ${idDocumentsBucket.public}`);
        console.log(`   - Created: ${idDocumentsBucket.created_at}`);
      } else {
        console.log('⚠️  ID documents bucket not found in list');
      }
      
    } else {
      console.error('❌ Failed to initialize storage bucket');
    }
    
  } catch (error) {
    console.error('❌ Error during storage initialization:', error);
  }
}

// Run the initialization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeStorage()
    .then(() => {
      console.log('🎉 Storage initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Storage initialization failed:', error);
      process.exit(1);
    });
}

export { initializeStorage };