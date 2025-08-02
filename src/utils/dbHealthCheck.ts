import { supabase } from '../lib/supabase';

export interface DatabaseHealth {
  isHealthy: boolean;
  supabaseConnected: boolean;
  translationsTableExists: boolean;
  translationCount: number;
  englishTranslationExists: boolean;
  issues: string[];
}

export const checkDatabaseHealth = async (): Promise<DatabaseHealth> => {
  const health: DatabaseHealth = {
    isHealthy: false,
    supabaseConnected: false,
    translationsTableExists: false,
    translationCount: 0,
    englishTranslationExists: false,
    issues: []
  };

  try {
    // Test basic Supabase connection
    const { data: pingData, error: pingError } = await supabase
      .from('translations')
      .select('count')
      .limit(1);

    if (pingError) {
      health.issues.push(`Supabase connection failed: ${pingError.message}`);
      
      // Check for common environment variable issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || supabaseUrl.includes('your_supabase_project_url')) {
        health.issues.push('VITE_SUPABASE_URL is not configured properly in .env file');
      }
      
      if (!supabaseKey || supabaseKey.includes('your_supabase_anon_key')) {
        health.issues.push('VITE_SUPABASE_ANON_KEY is not configured properly in .env file');
      }
      
      return health;
    }

    health.supabaseConnected = true;
    health.translationsTableExists = true;

    // Count total translations
    const { count, error: countError } = await supabase
      .from('translations')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      health.issues.push(`Error counting translations: ${countError.message}`);
    } else {
      health.translationCount = count || 0;
      
      if (health.translationCount === 0) {
        health.issues.push('No translations found. Run migration scripts: translations_migration.sql and multilingual_translations.sql');
      }
    }

    // Check for English translation specifically
    const { data: englishData, error: englishError } = await supabase
      .from('translations')
      .select('language_code')
      .eq('language_code', 'en-US')
      .eq('is_active', true)
      .single();

    if (englishError) {
      health.issues.push('English (en-US) translation not found. This is required as fallback language.');
    } else {
      health.englishTranslationExists = true;
    }

    // Check for common language codes
    const commonCodes = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'hi-IN'];
    const { data: availableCodes } = await supabase
      .from('translations')
      .select('language_code')
      .in('language_code', commonCodes)
      .eq('is_active', true);

    const foundCodes = availableCodes?.map(item => item.language_code) || [];
    const missingCodes = commonCodes.filter(code => !foundCodes.includes(code));
    
    if (missingCodes.length > 0) {
      health.issues.push(`Missing common language translations: ${missingCodes.join(', ')}`);
    }

    // Overall health check
    health.isHealthy = health.supabaseConnected && 
                     health.translationsTableExists && 
                     health.translationCount > 0 && 
                     health.englishTranslationExists;

  } catch (error) {
    health.issues.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return health;
};

export const logHealthStatus = async (): Promise<void> => {
  const health = await checkDatabaseHealth();
  
  console.group('[Database Health Check]');
  console.log('Overall Health:', health.isHealthy ? '✅ Healthy' : '❌ Issues Found');
  console.log('Supabase Connected:', health.supabaseConnected ? '✅' : '❌');
  console.log('Translations Table:', health.translationsTableExists ? '✅' : '❌');
  console.log('Translation Count:', health.translationCount);
  console.log('English Available:', health.englishTranslationExists ? '✅' : '❌');
  
  if (health.issues.length > 0) {
    console.group('Issues Found:');
    health.issues.forEach(issue => console.warn('•', issue));
    console.groupEnd();
  }
  
  console.groupEnd();
};
